import re
import os
import asyncio
import calendar
from datetime import datetime, timezone, timedelta
from datetime import datetime
from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart, Command, StateFilter
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, CallbackQuery, ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove, BotCommand
from aiogram.types.web_app_info import WebAppInfo
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import StatesGroup, State
from config import TOKEN, GROUP_ID
from aiogram.filters import StateFilter
from config import TOKEN

from database import (
    init_db,
    create_or_update_user,
    create_appointment,
    get_user_appointments,
    get_due_day_reminders,
    get_due_hour_reminders,
    mark_day_reminded,
    mark_hour_reminded,
    get_user_by_id,
    delete_user,
)

bot = Bot(token=TOKEN)
dp = Dispatcher()


# Уведомление для пользователя
async def reminder_worker():
    while True:
        try:
            day_reminders = await get_due_day_reminders()
            for appt in day_reminders:
                await bot.send_message(
                    appt.user_id,
                    f"🔔 Напоминание!\n\n"
                    f"У вас завтра запись к врачу.\n"
                    f"🏥 {appt.place}\n"
                    f"📍 {appt.city}\n"
                    f"📅 {appt.appointment_date.strftime('%d.%m.%Y')}\n"
                    f"⏰ {appt.time_slot}"
                )
                await mark_day_reminded(appt.order_id)

            hour_reminders = await get_due_hour_reminders()
            for appt in hour_reminders:
                await bot.send_message(
                    appt.user_id,
                    f"⏰ Напоминание!\n\n"
                    f"Через 1 час у вас прием.\n"
                    f"🏥 {appt.place}\n"
                    f"📍 {appt.city}\n"
                    f"📅 {appt.appointment_date.strftime('%d.%m.%Y')}\n"
                    f"⏰ {appt.time_slot}"
                )
                await mark_hour_reminded(appt.order_id)

        except Exception as e:
            print(f"Reminder worker error: {e}")

        await asyncio.sleep(30)

# --- Жесткая привязка к Московскому времени (UTC+3) ---
MSK_TZ = timezone(timedelta(hours=3))

# --- Состояния ---
class UserState(StatesGroup):
    waiting_for_phone = State()
    waiting_for_consent = State()

class SupportState(StatesGroup):
    waiting_for_question = State()


# Состояния для пошаговой записи к врачу (FSM)
class BookingState(StatesGroup):
    choosing_city = State()
    choosing_clinic = State()
    choosing_date = State()
    choosing_time = State()


# --- Клавиатуры ---
consent_kb = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text="📄 Прочитать согласие",
                          url="https://docs.google.com/document/d/14bjKlifFNWM5reJbzbOlqYEUe9m5sm0Db5n-mgk_Wmk/edit?usp=sharing")],
    [InlineKeyboardButton(text="✅ Я даю согласие", callback_data="accept_consent")]
])

#клавиатура для телефона
phone_kb = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text="📱 Поделиться номером телефона", request_contact=True)]
    ],
    resize_keyboard=True,
    one_time_keyboard=True
)


MONTH_NAMES = [
    "Январь","Февраль","Март","Апрель","Май","Июнь",
    "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"
]


#исправление зависание календаря при клике на пустые клетки и дни недели
@dp.callback_query(F.data == "ignore")
async def ignore_calendar_clicks(callback: CallbackQuery):
    # Просто гасим "часики", ничего не делая
    await callback.answer()


def calendar_kb(year, month):
    now = datetime.now(MSK_TZ)

    max_month = now.month + 2
    max_year = now.year
    if max_month > 12:
        max_month -= 12
        max_year += 1

    cal = calendar.monthcalendar(year, month)
    keyboard = []

    month_title = f"{MONTH_NAMES[month-1]} {year}"

    keyboard.append([InlineKeyboardButton(text=month_title, callback_data="ignore")])
    keyboard.append([
        InlineKeyboardButton(text="Пн", callback_data="ignore"),
        InlineKeyboardButton(text="Вт", callback_data="ignore"),
        InlineKeyboardButton(text="Ср", callback_data="ignore"),
        InlineKeyboardButton(text="Чт", callback_data="ignore"),
        InlineKeyboardButton(text="Пт", callback_data="ignore"),
        InlineKeyboardButton(text="Сб", callback_data="ignore"),
        InlineKeyboardButton(text="Вс", callback_data="ignore")
    ])

    for week in cal:
        row = []
        for day in week:
            if day == 0:
                row.append(InlineKeyboardButton(text=" ", callback_data="ignore"))
            else:
                # ПРОВЕРКА: блокируем прошедшие дни в текущем месяце
                if year == now.year and month == now.month and day < now.day:
                    row.append(InlineKeyboardButton(text="❌", callback_data="ignore"))
                else:
                    row.append(InlineKeyboardButton(text=str(day), callback_data=f"day_{year}_{month}_{day}"))
        keyboard.append(row)

    nav_row = []

    # ПРОВЕРКА: Кнопка "Назад" только если мы ушли вперед
    if year > now.year or (year == now.year and month > now.month):
        nav_row.append(InlineKeyboardButton(text="◀️", callback_data=f"prev_{year}_{month}"))
    else:
        nav_row.append(InlineKeyboardButton(text=" ", callback_data="ignore"))

    # ПРОВЕРКА: Кнопка "Вперед" только если не уперлись в 3 месяца
    if year < max_year or (year == max_year and month < max_month):
        nav_row.append(InlineKeyboardButton(text="▶️", callback_data=f"next_{year}_{month}"))
    else:
        nav_row.append(InlineKeyboardButton(text=" ", callback_data="ignore"))

    keyboard.append(nav_row)
    keyboard.append([
        InlineKeyboardButton(text="🔙 Назад", callback_data="back_to_clinic"),
        InlineKeyboardButton(text="🏠 Главное меню", callback_data="return_main")
    ])

    return InlineKeyboardMarkup(inline_keyboard=keyboard)



# СРАЗУ ПОСЛЕ КАЛЕНДАРЯ ДОБАВЛЯЕМ ФУНКЦИЮ ВРЕМЕНИ:
def get_times_kb(year, month, day):
    now = datetime.now(MSK_TZ)
    is_today = (year == now.year and month == now.month and day == now.day)
    current_hour = now.hour

    time_slots = [
        ("08:00 - 10:00", 8, "time_8"),
        ("10:00 - 12:00", 10, "time_10"),
        ("12:00 - 14:00", 12, "time_12"),
        ("14:00 - 16:00", 14, "time_14"),
        ("16:00 - 18:00", 16, "time_16"),
        ("18:00 - 20:00", 18, "time_18")
    ]

    keyboard = []
    for text, start_hour, cb_data in time_slots:
        # ПРОВЕРКА: убираем часы, которые уже прошли сегодня
        if is_today and start_hour <= current_hour:
            continue
        keyboard.append([InlineKeyboardButton(text=text, callback_data=cb_data)])

    # Если на сегодня времени не осталось
    if not keyboard:
        keyboard.append([InlineKeyboardButton(text="Нет доступного времени 😔", callback_data="ignore")])

    keyboard.append([
        InlineKeyboardButton(text="🔙 Назад", callback_data="back_to_clinic"),
        InlineKeyboardButton(text="🏠 Главное меню", callback_data="return_main")
    ])

    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def get_main_menu_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="Сервис 'Иду к врачу'",
                              url="https://youtu.be/dQw4w9WgXcQ?si=Kgr7WKcdwiUi5e1k")],
        [InlineKeyboardButton(text="📚 Подготовка (Материалы)", web_app=WebAppInfo(url="https://green-olives-pick.loca.lt"))],
        [InlineKeyboardButton(text="📅 Запись к врачу", callback_data="menu_book_appointment")],
        [InlineKeyboardButton(text="📋 Мои записи", callback_data="menu_my_records")],
        [InlineKeyboardButton(text="💬 Написать нам", callback_data="menu_support")]
    ])


# Функция для возврата в меню (используется на разных этапах)
def get_back_to_main_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔙 Вернуться на главную", callback_data="return_main")]
    ])

def clinics_kb():

    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="Клиника №1 (ст. м. ВДНХ)", callback_data="clinic_1")],
        [InlineKeyboardButton(text="Клиника №2 (ст. м. Лубянка)", callback_data="clinic_2")],
        [InlineKeyboardButton(text="Клиника №3 (ст. м. Бауманская)", callback_data="clinic_3")],
        [
            InlineKeyboardButton(text="🔙 Назад", callback_data="back_to_city"),
            InlineKeyboardButton(text="🏠 Главное меню", callback_data="return_main")
        ]
    ])

# --- Обработчики старта, согласия и телефона ---

@dp.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext):
    await state.clear()  # Сбрасываем старые состояния

    welcome_text = (
        "Привет! Я цифровой помощник «Иду к врачу».\n\n"
        "Я помогаю ребёнку с РАС подготовиться к посещению врача и сделать его менее тревожным.\n\n"
        "Для продолжения работы мне необходимо ваше согласие на обработку персональных данных. "
        "Пожалуйста, ознакомьтесь с документом по ссылке ниже и подтвердите согласие."
    )
    # Шаг 1: Ждем согласия
    await state.set_state(UserState.waiting_for_consent)
    await message.answer(welcome_text, reply_markup=consent_kb)

@dp.message(Command("menu"))
async def cmd_menu(message: Message, state: FSMContext):
    await state.clear()
    user = await get_user_by_id(message.from_user.id)
    if user and user.phone:
        await message.answer(
            "Вы в главном меню.\nВыберите нужный раздел:",
            reply_markup=get_main_menu_kb()
        )
    else:
        await message.answer("Пожалуйста, сначала зарегистрируйтесь через команду /start")

@dp.message(Command("reset"))
async def cmd_reset(message: Message, state: FSMContext):
    await state.clear()
    await delete_user(message.from_user.id)
    await message.answer(
        "🧹 Ваш профиль был полностью удален из базы данных (включая записи).\n\n"
        "Теперь вы можете проверить сценарий первого запуска.\n"
        "Нажмите /start для новой регистрации.",
        reply_markup=ReplyKeyboardRemove()
    )


@dp.message(UserState.waiting_for_consent)
async def block_unconsented_user(message: Message):
    # Если юзер пишет текст, пока мы ждем согласие
    await message.answer(
        "Пожалуйста, ознакомьтесь с документом и нажмите кнопку «✅ Я даю согласие», чтобы получить доступ к функционалу бота."
    )


@dp.callback_query(F.data == "accept_consent")
async def on_consent_accepted(callback: CallbackQuery, state: FSMContext):
    await callback.answer("Согласие получено!", show_alert=False)
    await callback.message.delete()

    # Шаг 2: Переводим в состояние ожидания телефона
    await state.set_state(UserState.waiting_for_phone)

    await callback.message.answer(
        "Спасибо! Теперь, пожалуйста, поделитесь вашим номером телефона.\n"
        "Вы можете нажать кнопку ниже или просто отправить номер сообщением.",
        reply_markup=phone_kb
    )


@dp.message(UserState.waiting_for_phone)
async def process_phone(message: Message, state: FSMContext):
    if message.contact:
        raw_phone = message.contact.phone_number
        if not str(raw_phone).startswith('+'):
            raw_phone = '+' + str(raw_phone)
    else:
        raw_phone = message.text

    # Очищаем от лишних символов
    clean_phone = re.sub(r'[\s\-\(\)]', '', raw_phone)
    if not clean_phone.startswith('+'):
        clean_phone = '+' + clean_phone

    # Жесткая валидация: формат РФ (+7 и ровно 10 цифр)
    if not re.match(r'^\+7\d{10}$', clean_phone):
        await message.answer(
            "Пожалуйста, введите корректный номер телефона (например, +79991234567) или нажмите на кнопку ниже",
            reply_markup=phone_kb
        )
        return

    phone = clean_phone

    # Сохраняем проверенный номер в память
    await state.update_data(user_phone=phone)

    # Сохранение телефона в БД
    await create_or_update_user(
        user_id=message.from_user.id,
        phone=phone
    )

    # Очищаем состояние
    await state.clear()

    # Удаляем кнопку телефона с экрана
    await message.answer("✅ Номер успешно получен!", reply_markup=ReplyKeyboardRemove())

    # Выдаем главное меню один раз
    await message.answer(
        "Теперь вам доступен весь интерфейс.\n\n"
        "Выберите нужный раздел:",
        reply_markup=get_main_menu_kb()
    )


# --- FSM: Сценарий "Запись к врачу" ---
@dp.callback_query(F.data == "menu_book_appointment")
async def start_booking(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    # обязательно выставляем состояние
    await state.set_state(BookingState.choosing_city)

    def cities_kb() -> InlineKeyboardMarkup:
        return InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="г.Москва", callback_data="city_moscow")],
            [
                InlineKeyboardButton(text="🔙 Назад", callback_data="return_main"),
                InlineKeyboardButton(text="🏠 Главное меню", callback_data="return_main")
            ]
        ])

    await callback.message.edit_text(
        "📍 Шаг 1: Выберите ваш город:",
        reply_markup=cities_kb()
    )


@dp.callback_query(BookingState.choosing_city, F.data.startswith("city_"))
async def choose_city(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    city_map = {
        "city_moscow": "г.Москва"
    }

    await state.update_data(city=city_map[callback.data])


    await state.set_state(BookingState.choosing_clinic)
    progress = await get_progress_text(state)

    await callback.message.edit_text(
        f"{progress}🏥 Выберите клинику:",
        reply_markup=clinics_kb()
    )

@dp.callback_query(BookingState.choosing_clinic, F.data.startswith("clinic_"))
async def choose_clinic(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    clinic_map = {
        "clinic_1": "Клиника №1 (ст. м. ВДНХ)",
        "clinic_2": "Клиника №2 (ст. м. Лубянка)",
        "clinic_3": "Клиника №3 (ст. м. Бауманская)"
    }

    await state.update_data(clinic=clinic_map[callback.data])

    now = datetime.now(MSK_TZ)

    await state.set_state(BookingState.choosing_date)

    progress = await get_progress_text(state)

    await callback.message.edit_text(
        f"{progress}📅 Выберите дату:",
        reply_markup=calendar_kb(now.year, now.month)
    )


@dp.callback_query(BookingState.choosing_date, F.data.startswith("day_"))
async def choose_day(callback: CallbackQuery, state: FSMContext):

    await callback.answer()

    _, year, month, day = callback.data.split("_")
    year, month, day = int(year), int(month), int(day)

    month_name = [
        "января", "февраля", "марта", "апреля", "мая", "июня",
        "июля", "августа", "сентября", "октября", "ноября", "декабря"
    ]

    date_text = f"{day} {month_name[month - 1]} {year}"

    # Сохраняем дату текстом и цифрами (цифры нужны для умного времени)
    await state.update_data(date=date_text, b_year=year, b_month=month, b_day=day)

    await state.set_state(BookingState.choosing_time)

    progress = await get_progress_text(state)

    await callback.message.edit_text(
        f"{progress}⏰ Выберите время:",
        reply_markup=get_times_kb(year, month, day)
    )

async def get_progress_text(state: FSMContext):

    data = await state.get_data()

    text = ""

    if data.get("city"):
        text += f"📍 {data['city']}\n"

    if data.get("clinic"):
        text += f"🏥 {data['clinic']}\n"

    if data.get("date"):
        text += f"📅 {data['date']}\n"

    if data.get("time"):
        text += f"⏰ {data['time']}\n"

    if text:
        text += "\n"

    return text


@dp.callback_query(F.data.startswith("next_"))
async def next_month(callback: CallbackQuery):

    await callback.answer()

    _, year, month = callback.data.split("_")

    year = int(year)
    month = int(month) + 1

    if month > 12:
        month = 1
        year += 1

    await callback.message.edit_reply_markup(
        reply_markup=calendar_kb(year, month)
    )


@dp.callback_query(F.data.startswith("prev_"))
async def prev_month(callback: CallbackQuery):

    await callback.answer()

    _, year, month = callback.data.split("_")

    year = int(year)
    month = int(month) - 1

    if month < 1:
        month = 12
        year -= 1

    await callback.message.edit_reply_markup(
        reply_markup=calendar_kb(year, month)
    )


@dp.callback_query(BookingState.choosing_time, F.data.startswith("time_"))
async def choose_time(callback: CallbackQuery, state: FSMContext):
    await callback.answer()

    user_data = await state.get_data()

    city = user_data.get("city")
    clinic = user_data.get("clinic")
    date = user_data.get("date")
    time_map = {
        "time_8": "08:00 - 10:00",
        "time_10": "10:00 - 12:00",
        "time_12": "12:00 - 14:00",
        "time_14": "14:00 - 16:00",
        "time_16": "16:00 - 18:00",
        "time_18": "18:00 - 20:00"
    }

    time = time_map[callback.data]

    await state.update_data(time=time)

    confirm_kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✅ Подтвердить", callback_data="confirm_booking")],
        [InlineKeyboardButton(text="🔙 Назад", callback_data="back_to_time")],
        [InlineKeyboardButton(text="❌ Отмена", callback_data="return_main")]
    ])

    await callback.message.edit_text(
        f"""
Проверьте данные записи:

📍 Город: {city}
🏥 Клиника: {clinic}
📅 Дата: {date}
⏰ Время: {time}

Подтвердить запись?
""",
        reply_markup=confirm_kb
    )

@dp.callback_query(F.data == "back_to_time")
async def back_to_time(callback: CallbackQuery, state: FSMContext):

    await callback.answer()

    # Сбрасываем выбранное время
    await state.update_data(time=None)
    data = await state.get_data()

    # Достаем сохраненные цифры даты
    year = data.get("b_year")
    month = data.get("b_month")
    day = data.get("b_day")

    progress = await get_progress_text(state)

    def times_kb():
        return InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="08:00 - 10:00", callback_data="time_8")],
            [InlineKeyboardButton(text="10:00 - 12:00", callback_data="time_10")],
            [InlineKeyboardButton(text="12:00 - 14:00", callback_data="time_12")],
            [InlineKeyboardButton(text="14:00 - 16:00", callback_data="time_14")],
            [InlineKeyboardButton(text="16:00 - 18:00", callback_data="time_16")],
            [InlineKeyboardButton(text="18:00 - 20:00", callback_data="time_18")],
            [
                InlineKeyboardButton(text="🔙 Назад", callback_data="back_to_date"),
                InlineKeyboardButton(text="🏠 Главное меню", callback_data="return_main")
            ]
        ])

    await state.set_state(BookingState.choosing_time)

    await callback.message.edit_text(
        f"{progress}⏰ Выберите время:",
        reply_markup=get_times_kb(year, month, day)
    )


# --- Обработчики "Назад" (минимальные, чтобы не ломалось) ---
@dp.callback_query(BookingState.choosing_clinic, F.data == "back_to_city")
async def back_to_city(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    # воссоздаём клавиатуру города (как в start_booking)
    cities_markup = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="г.Москва", callback_data="city_moscow")],
        [
            InlineKeyboardButton(text="🔙 Назад", callback_data="return_main"),
            InlineKeyboardButton(text="🏠 Главное меню", callback_data="return_main")
        ]
    ])
    await state.set_state(BookingState.choosing_city)
    await callback.message.edit_text("📍 Шаг 1: Выберите ваш город:", reply_markup=cities_markup)

@dp.callback_query(F.data == "confirm_booking")
async def confirm_booking(callback: CallbackQuery, state: FSMContext):

    await callback.answer()

    data = await state.get_data()

    # Сохранение записи в Бдж
    await create_appointment(
        user_id=callback.from_user.id,
        city=data["city"],
        place=data["clinic"],
        year=data["b_year"],
        month=data["b_month"],
        day=data["b_day"],
        time_slot=data["time"],
    )

    await state.clear()

    await callback.message.edit_text(
        f"""
✅ Заявка успешно создана!

📍 {data['city']}
🏥 {data['clinic']}
📅 {data['date']}
⏰ {data['time']}

Администратор клиники свяжется с вами для подтверждения записи.
""",
        reply_markup=get_back_to_main_kb()
    )


@dp.callback_query(BookingState.choosing_date, F.data == "back_to_clinic")
async def back_to_clinic(callback: CallbackQuery, state: FSMContext):

    await callback.answer()

    await state.update_data(clinic=None, date=None, time=None)

    await state.set_state(BookingState.choosing_clinic)

    progress = await get_progress_text(state)

    await callback.message.edit_text(
        f"{progress}🏥 Выберите клинику:",
        reply_markup=clinics_kb()
    )

@dp.callback_query(BookingState.choosing_time, F.data == "back_to_date")
async def back_to_date(callback: CallbackQuery, state: FSMContext):
    await callback.answer()

    await state.update_data(date=None, time=None)

    now = datetime.now(MSK_TZ)

    await state.set_state(BookingState.choosing_date)

    progress = await get_progress_text(state)

    await callback.message.edit_text(
        f"{progress}📅 Выберите дату:",
        reply_markup=calendar_kb(now.year, now.month)
    )


# --- Обработчик нажатий на заголовки календаря (игнорируем) ---
@dp.callback_query(F.data == "ignore")
async def ignore_callback(callback: CallbackQuery):
    await callback.answer()


# --- Обработчик возврата в главное меню ---
@dp.callback_query(F.data == "return_main")
async def return_to_main(callback: CallbackQuery, state: FSMContext):
    await state.clear()  # На случай, если пользователь нажал отмену посередине FSM
    await callback.answer()
    await callback.message.edit_text(
        "Вы в главном меню.\nВыберите нужный раздел:",
        reply_markup=get_main_menu_kb()
    )


# --- Заглушки для оставшихся кнопок ---
@dp.callback_query(F.data == "menu_my_records")
async def process_my_records(callback: CallbackQuery):
    await callback.answer()

    appointments = await get_user_appointments(callback.from_user.id)

    if not appointments:
        await callback.message.edit_text(
            "📋 Ваши записи:\n\nУ вас пока нет активных записей.",
            reply_markup=get_back_to_main_kb()
        )
        return

    text = "📋 Ваши записи:\n\n"
    for appt in appointments:
        text += (
            f"🆔 Запись №{appt.order_id}\n"
            f"📍 {appt.city}\n"
            f"🏥 {appt.place}\n"
            f"📅 {appt.appointment_date.strftime('%d.%m.%Y')}\n"
            f"⏰ {appt.time_slot}\n\n"
        )

    await callback.message.edit_text(
        text,
        reply_markup=get_back_to_main_kb()
    )


@dp.callback_query(F.data == "menu_support")
async def process_support(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    # Переводим бота в режим ожидания вопроса
    await state.set_state(SupportState.waiting_for_question)
    await callback.message.edit_text(
        "💬 Напишите ваш вопрос одним сообщением, и я передам его специалистам поддержки:",
        reply_markup=get_back_to_main_kb()
    )


# Ловим текст вопроса и отправляем в группу
@dp.message(SupportState.waiting_for_question)
async def forward_to_support(message: Message, state: FSMContext):
    # Данные о пользователе (чтобы знать, кому отвечать)
    user_info = f"Пользователь: {message.from_user.full_name}\nID: {message.from_user.id}"
    if message.from_user.username:
        user_info += f"\nUsername: @{message.from_user.username}"

    # Отправляем сообщение в вашу группу
    try:
        await bot.send_message(
            chat_id=GROUP_ID,
            text=f"🚨 <b>Новое обращение в поддержку!</b>\n\n{user_info}\n\n<b>Вопрос:</b>\n{message.text}",
            parse_mode="HTML"
        )

        # Уведомляем пользователя, что всё ок
        await message.answer(
            "✅ Ваше сообщение успешно отправлено! Специалисты скоро с вами свяжутся.",
            reply_markup=get_main_menu_kb()
        )
    except Exception as e:
        # Если бот не добавлен в группу или нет прав
        await message.answer(
            "❌ Произошла ошибка при отправке сообщения. Пожалуйста, попробуйте позже.",
            reply_markup=get_main_menu_kb()
        )
        print(f"Ошибка отправки в группу: {e}")

    # Очищаем состояние
    await state.clear()


# Инициализация Бд
async def on_startup(bot: Bot, **kwargs):
    await init_db()
    asyncio.create_task(reminder_worker())

dp.startup.register(on_startup)

async def main():
    print("Бот запускается...")
    await dp.start_polling(bot)


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('Exit')
