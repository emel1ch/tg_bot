import re
import os
import asyncio
import calendar
from datetime import datetime, timezone, timedelta
from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart, Command, StateFilter, BaseFilter
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, CallbackQuery, ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove, BotCommand
from aiogram.types.web_app_info import WebAppInfo
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import StatesGroup, State
from config import TOKEN, GROUP_ID
from config import TOKEN
from config import SUPERADMIN_ID
from aiogram.filters import CommandObject
from database import get_all_users, grant_admin_rights
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
    get_doctors_by_clinic,
    get_doctor_by_id,
    get_available_time_slots,
    create_doctor,
    deactivate_doctor,
    set_weekly_schedule,
    add_doctor_exception,
)

bot = Bot(token=TOKEN)
dp = Dispatcher()


# Уведомление для пользователя
async def reminder_worker():
    await asyncio.sleep(5)
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
    choosing_doctor = State()
    choosing_date = State()
    choosing_time = State()

# --- Клавиатуры ---
consent_kb = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text="📄 Прочитать согласие",
                          url="https://docs.google.com/document/d/14bjKlifFNWM5reJbzbOlqYEUe9m5sm0Db5n-mgk_Wmk/edit?usp=sharing")],
    [InlineKeyboardButton(text="✅ Я даю согласие", callback_data="accept_consent")]
])

def doctors_kb(doctors):
    keyboard = []
    for doc in doctors:
        title = doc.full_name
        if doc.specialty:
            title += f" — {doc.specialty}"
        keyboard.append([InlineKeyboardButton(text=title, callback_data=f"doctor_{doc.doctor_id}")])

    keyboard.append([
        InlineKeyboardButton(text="🔙 Назад", callback_data="back_to_clinic"),
        InlineKeyboardButton(text="🏠 Главное меню", callback_data="return_main"),
    ])
    return InlineKeyboardMarkup(inline_keyboard=keyboard)


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

async def get_any_doctors():
    async with async_session() as session:
        result = await session.execute(select(Doctor))
        return result.scalars().first()

# СРАЗУ ПОСЛЕ КАЛЕНДАРЯ ДОБАВЛЯЕМ ФУНКЦИЮ ВРЕМЕНИ:
async def get_times_kb(year, month, day, doctor_id):
    slots = await get_available_time_slots(doctor_id, year, month, day)

    keyboard = []
    for text, _start_time in slots:
        keyboard.append([InlineKeyboardButton(text=text, callback_data=f"time_{text}")])

    if not keyboard:
        keyboard.append([InlineKeyboardButton(text="Нет доступного времени 😔", callback_data="ignore")])

    keyboard.append([
        InlineKeyboardButton(text="🔙 Назад", callback_data="back_to_date"),
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

    clinic_name = clinic_map[callback.data]
    await state.update_data(clinic=clinic_name)

    doctors = await get_doctors_by_clinic(clinic_name)
    await state.set_state(BookingState.choosing_doctor)

    progress = await get_progress_text(state)

    if not doctors:
        await callback.message.edit_text(
            f"{progress}В этой клинике пока нет врачей. Добавьте их в базу.",
            reply_markup=get_back_to_main_kb()
        )
        return

    await callback.message.edit_text(
        f"{progress}👨‍⚕️ Выберите врача:",
        reply_markup=doctors_kb(doctors)
    )


@dp.callback_query(BookingState.choosing_doctor, F.data.startswith("doctor_"))
async def choose_doctor(callback: CallbackQuery, state: FSMContext):
    await callback.answer()

    doctor_id = int(callback.data.split("_")[1])
    doctor = await get_doctor_by_id(doctor_id)

    if not doctor:
        await callback.message.edit_text("Врач не найден.", reply_markup=get_back_to_main_kb())
        return

    await state.update_data(
        doctor_id=doctor.doctor_id,
        doctor_name=doctor.full_name,
    )

    await state.set_state(BookingState.choosing_date)
    now = datetime.now(MSK_TZ)
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

    await state.update_data(date=date_text, b_year=year, b_month=month, b_day=day)
    await state.set_state(BookingState.choosing_time)

    data = await state.get_data()
    doctor_id = data["doctor_id"]
    progress = await get_progress_text(state)

    await callback.message.edit_text(
        f"{progress}⏰ Выберите время:",
        reply_markup=await get_times_kb(year, month, day, doctor_id)
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
    doctor_name = user_data.get("doctor_name")
    doctor_id = user_data.get("doctor_id")

    time = callback.data.replace("time_", "")
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
👨‍⚕️ Врач: {doctor_name}
📅 Дата: {date}
⏰ Время: {time}

Подтвердить запись?
""",
        reply_markup=confirm_kb
    )

@dp.callback_query(F.data == "back_to_time")
async def back_to_time(callback: CallbackQuery, state: FSMContext):
    await callback.answer()

    await state.update_data(time=None)
    data = await state.get_data()

    year = data.get("b_year")
    month = data.get("b_month")
    day = data.get("b_day")
    doctor_id = data.get("doctor_id")

    progress = await get_progress_text(state)
    await state.set_state(BookingState.choosing_time)

    await callback.message.edit_text(
        f"{progress}⏰ Выберите время:",
        reply_markup=await get_times_kb(year, month, day, doctor_id)
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

    await create_appointment(
        user_id=callback.from_user.id,
        city=data["city"],
        place=data["clinic"],
        year=data["b_year"],
        month=data["b_month"],
        day=data["b_day"],
        time_slot=data["time"],
        doctor_id=data.get("doctor_id"),
        doctor_name=data.get("doctor_name"),
    )

    await state.clear()

    await callback.message.edit_text(
        f"""
✅ Заявка успешно создана!

📍 {data['city']}
🏥 {data['clinic']}
👨‍⚕️ {data['doctor_name']}
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
            f"👨‍⚕️ {appt.doctor_name or 'не указан'}\n"
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
    await seed_doctors_if_empty()
    asyncio.create_task(reminder_worker())

dp.startup.register(on_startup)

async def main():
    print("Бот запускается...")
    await dp.start_polling(bot)

async def seed_doctors_if_empty():
    doctors = await get_doctors_by_clinic("Клиника №1 (ст. м. ВДНХ)")
    if doctors:
        return

    clinic_names = [
        "Клиника №1 (ст. м. ВДНХ)",
        "Клиника №2 (ст. м. Лубянка)",
        "Клиника №3 (ст. м. Бауманская)",
    ]

    sample = [
        ("Анна Сергеевна Петрова", "Педиатр"),
        ("Илья Викторович Смирнов", "Невролог"),
        ("Мария Андреевна Кузнецова", "ЛОР"),
    ]

    for clinic in clinic_names:
        for name, spec in sample:
            doctor = await create_doctor(clinic=clinic, full_name=name, specialty=spec)
            # Пн-Пт 09:00-17:00
            for wd in range(5):
                await set_weekly_schedule(doctor.doctor_id, wd, "09:00", "17:00", True)



# --- Настройки и Фильтры Админки ---
class AdminState(StatesGroup):
    waiting_for_broadcast = State()
    waiting_for_new_admin_id = State()


class IsAdmin(BaseFilter):
    async def __call__(self, message: Message) -> bool:
        # 1. Суперадмин из конфига пускается всегда
        if message.from_user.id == SUPERADMIN_ID:
            return True

        # 2. Остальные проверяются по базе данных
        user = await get_user_by_id(message.from_user.id)
        return user.is_root if user else False


def get_admin_kb(user_id: int):
    kb = [
        [InlineKeyboardButton(text="📢 Сделать рассылку", callback_data="admin_broadcast")],
        [InlineKeyboardButton(text="📊 Статистика", callback_data="admin_stats")]
    ]
    # Кнопку добавления админов показываем ТОЛЬКО Суперадмину
    if user_id == SUPERADMIN_ID:
        kb.append([InlineKeyboardButton(text="👮‍♂️ Добавить админа", callback_data="admin_add_new")])

    kb.append([InlineKeyboardButton(text="🏠 Выйти", callback_data="return_main")])
    return InlineKeyboardMarkup(inline_keyboard=kb)


# ==========================================
#             АДМИН - ПАНЕЛЬ
# ==========================================

# 1. Вход в админку
@dp.message(Command("admin"), IsAdmin())
async def cmd_admin(message: Message, state: FSMContext):
    await state.clear()
    await message.answer(
        "👋 <b>Добро пожаловать в панель администратора!</b>",
        parse_mode="HTML",
        reply_markup=get_admin_kb(message.from_user.id)
    )


# 2. Статистика
@dp.callback_query(F.data == "admin_stats")
async def admin_stats(callback: CallbackQuery):
    await callback.answer()
    users = await get_all_users()
    await callback.message.edit_text(
        f"📊 <b>Статистика бота:</b>\n\n👥 Пользователей в базе: {len(users)}",
        parse_mode="HTML",
        reply_markup=get_admin_kb(callback.from_user.id)
    )


# 3. Добавление нового админа по ID
@dp.callback_query(F.data == "admin_add_new")
async def ask_for_new_admin(callback: CallbackQuery, state: FSMContext):
    if callback.from_user.id != SUPERADMIN_ID:
        await callback.answer("У вас нет прав для этого действия!", show_alert=True)
        return

    await callback.answer()
    await state.set_state(AdminState.waiting_for_new_admin_id)

    cancel_kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_admin_action")]
    ])

    await callback.message.edit_text(
        "👮‍♂️ <b>Добавление администратора</b>\n\n"
        "Отправьте мне Telegram ID пользователя (только цифры).\n"
        "<i>Пользователь уже должен быть в базе (нажать /start).</i>",
        parse_mode="HTML",
        reply_markup=cancel_kb
    )


@dp.message(AdminState.waiting_for_new_admin_id, IsAdmin())
async def process_new_admin(message: Message, state: FSMContext):
    if not message.text.isdigit():
        await message.answer("❌ ID должен состоять только из цифр. Попробуйте еще раз:")
        return

    target_id = int(message.text)
    success = await grant_admin_rights(target_id)

    await state.clear()

    if success:
        await message.answer(
            f"✅ Пользователь <code>{target_id}</code> назначен администратором!",
            parse_mode="HTML",
            reply_markup=get_admin_kb(message.from_user.id)
        )
    else:
        await message.answer(
            f"❌ Пользователь {target_id} не найден в базе данных.\nПусть сначала напишет /start.",
            reply_markup=get_admin_kb(message.from_user.id)
        )



#Добавление врача
# /doctor_add Клиника №1 (ст. м. ВДНХ) | Тестовый Доктор | Терапевт
@dp.message(Command("doctor_add"), IsAdmin())
async def cmd_doctor_add(message: Message):
    try:
        text = message.text.replace("/doctor_add", "").strip()
        parts = [p.strip() for p in text.split("|")]

        if len(parts) < 3:
            await message.answer("Формат:\n/doctor_add клиника | ФИО | специальность")
            return

        clinic = parts[0]
        full_name = parts[1]
        specialty = parts[2]

        doctor = await create_doctor(
            clinic=clinic,
            full_name=full_name,
            specialty=specialty
        )

        await message.answer(f"✅ Врач добавлен:\n{doctor.full_name}\nID={doctor.doctor_id}")

    except Exception as e:
        await message.answer(f"❌ Ошибка: {e}")

#Команда задать рабочие часы на неделю
@dp.message(Command("doctor_week"), IsAdmin())
async def cmd_doctor_week(message: Message):
    # /doctor_week doctor_id | weekday | 09:00 | 15:00 | 1
    # weekday: 0=Пн ... 6=Вс
    parts = [p.strip() for p in message.text.split("|")]
    if len(parts) != 5:
        await message.answer("Формат:\n/doctor_week doctor_id | weekday(0-6) | start(HH:MM) | end(HH:MM) | 1/0")
        return

    doctor_id = int(parts[0].split()[1])
    weekday = int(parts[1])
    start_time = parts[2]
    end_time = parts[3]
    is_working = parts[4] == "1"

    await set_weekly_schedule(doctor_id, weekday, start_time, end_time, is_working)
    await message.answer("✅ Расписание сохранено.")


#Команда исключение на конкретную дату
@dp.message(Command("doctor_dayoff"), IsAdmin())
async def cmd_doctor_dayoff(message: Message):
    # /doctor_dayoff doctor_id | 2026-04-10 | причина
    parts = [p.strip() for p in message.text.split("|")]
    if len(parts) < 2:
        await message.answer("Формат:\n/doctor_dayoff doctor_id | YYYY-MM-DD | причина")
        return

    doctor_id = int(parts[0].split()[1])
    exc_date = datetime.strptime(parts[1], "%Y-%m-%d").date()
    note = parts[2] if len(parts) >= 3 else "Выходной"

    await add_doctor_exception(
        doctor_id=doctor_id,
        exc_date=exc_date,
        is_working=False,
        note=note,
    )
    await message.answer("✅ Выходной добавлен.")


#Команда нестандартного приема в конкретный день
@dp.message(Command("doctor_workday"), IsAdmin())
async def cmd_doctor_workday(message: Message):
    # /doctor_workday doctor_id | 2026-04-10 | 12:00 | 18:00
    parts = [p.strip() for p in message.text.split("|")]
    if len(parts) != 4:
        await message.answer("Формат:\n/doctor_workday doctor_id | YYYY-MM-DD | start(HH:MM) | end(HH:MM)")
        return

    doctor_id = int(parts[0].split()[1])
    exc_date = datetime.strptime(parts[1], "%Y-%m-%d").date()
    start_time = parts[2]
    end_time = parts[3]

    await add_doctor_exception(
        doctor_id=doctor_id,
        exc_date=exc_date,
        is_working=True,
        start_time=start_time,
        end_time=end_time,
        note="Индивидуальный прием",
    )
    await message.answer("✅ Специальный рабочий день сохранен.")

#Удаление врача /doctor_delete 3
@dp.message(Command("doctor_delete"), IsAdmin())
async def cmd_delete_doctor(message: Message, command: CommandObject):
    if not command.args:
        await message.answer("Формат: /doctor_delete ID")
        return

    try:
        doctor_id = int(command.args.strip())

        success = await deactivate_doctor(doctor_id)

        if success:
            await message.answer(f"✅ Врач {doctor_id} отключен")
        else:
            await message.answer("❌ Врач не найден")

    except ValueError:
        await message.answer("❌ ID должен быть числом")

# 4. Запуск рассылки
@dp.callback_query(F.data == "admin_broadcast")
async def admin_broadcast_start(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    await state.set_state(AdminState.waiting_for_broadcast)

    cancel_kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_admin_action")]
    ])

    await callback.message.edit_text(
        "📢 <b>Режим рассылки</b>\n\nОтправьте боту сообщение (текст, фото или видео).",
        parse_mode="HTML",
        reply_markup=cancel_kb
    )


@dp.message(AdminState.waiting_for_broadcast, IsAdmin())
async def process_broadcast(message: Message, state: FSMContext):
    users = await get_all_users()
    status_msg = await message.answer(f"⏳ Рассылаю {len(users)} пользователям...")

    success = 0
    for user in users:
        try:
            await message.copy_to(chat_id=user.user_id)
            success += 1
        except Exception:
            pass
        await asyncio.sleep(0.05)

    await state.clear()
    await status_msg.edit_text(
        f"✅ <b>Рассылка завершена!</b>\nДоставлено: {success}",
        parse_mode="HTML",
        reply_markup=get_admin_kb(message.from_user.id)
    )


# 5. Общая кнопка отмены действий (для рассылки и добавления админа)
@dp.callback_query(F.data == "cancel_admin_action")
async def cancel_admin_action(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    await state.clear()
    await callback.message.edit_text("❌ Действие отменено.", reply_markup=get_admin_kb(callback.from_user.id))

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('Exit')