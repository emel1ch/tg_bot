import re
import asyncio
import calendar
from datetime import datetime, timezone, timedelta
from database import async_session
from database import Doctor
from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart, Command, BaseFilter
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, CallbackQuery, ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove
from aiogram.types.web_app_info import WebAppInfo
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import StatesGroup, State
from aiogram.client.session.aiohttp import AiohttpSession
from aiogram.client.telegram import TelegramAPIServer
from config import TOKEN, GROUP_ID, WORKER_URL, SUPERADMIN_ID
from database import date_has_slots
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
    get_weekly_schedule,
    get_doctor_exceptions,
    delete_weekly_rule,
    delete_doctor_exception,
)
from database import (
    create_city, get_cities, delete_city,
    create_clinic, get_clinics_by_city, delete_clinic
)



# 1. Подключаем этот сервер к aiohttp сессии
session = AiohttpSession(proxy=WORKER_URL)

# 2. Инициализируем бота с этой сессией
bot = Bot(token=TOKEN, session=session)
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

WEEKDAY_NAMES = {
    0: "Понедельник",
    1: "Вторник",
    2: "Среда",
    3: "Четверг",
    4: "Пятница",
    5: "Суббота",
    6: "Воскресенье"
}

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


async def calendar_kb(year, month, doctor_id=None, mode="booking"):
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
                continue

            target_date = datetime(year, month, day).date()

            if target_date < now.date():
                row.append(InlineKeyboardButton(text="❌", callback_data="ignore"))
                continue

            # Режим для админа: выбор даты исключения
            if mode == "admin_exception":
                # В режиме исключений можно нажимать любой будущий день,
                # даже если он сейчас закрыт крестиком
                if doctor_id is not None:
                    available = await date_has_slots(doctor_id, year, month, day)
                    label = str(day) if available else f"❌ {day}"
                else:
                    label = str(day)

                row.append(InlineKeyboardButton(text=label, callback_data=f"day_{year}_{month}_{day}"))
                continue

            # Обычный режим записи к врачу
            if doctor_id is None:
                row.append(InlineKeyboardButton(text="❌", callback_data="ignore"))
                continue

            available = await date_has_slots(doctor_id, year, month, day)
            if not available:
                row.append(InlineKeyboardButton(text="❌", callback_data="ignore"))
                continue

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

def admin_back_kb():
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔙 Назад", callback_data="admin_back")]
    ])
def build_hour_keyboard(hours, prefix, back_callback):
    rows = []
    row = []

    for h in hours:
        row.append(
            InlineKeyboardButton(
                text=f"{h:02d}:00",
                callback_data=f"{prefix}{h:02d}:00"
            )
        )
        if len(row) == 3:
            rows.append(row)
            row = []

    if row:
        rows.append(row)

    rows.append([InlineKeyboardButton(text="🔙 Назад", callback_data=back_callback)])
    return InlineKeyboardMarkup(inline_keyboard=rows)

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
        [InlineKeyboardButton(text="📚 Подготовка (Материалы)", web_app=WebAppInfo(url="https://lglph-95-85-230-68.run.pinggy-free.link"))],
        [InlineKeyboardButton(text="📅 Запись к врачу", callback_data="menu_book_appointment")],
        [InlineKeyboardButton(text="📋 Мои записи", callback_data="menu_my_records")],
        [InlineKeyboardButton(text="💬 Написать нам", callback_data="menu_support")]
    ])


# Функция для возврата в меню (используется на разных этапах)
def get_back_to_main_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔙 Вернуться на главную", callback_data="return_main")]
    ])

async def clinics_kb(city_id):
    clinics = await get_clinics_by_city(city_id)

    if not clinics:
        keyboard = [[InlineKeyboardButton(text="Нет клиник 😔", callback_data="ignore")]]
    else:
        keyboard = [
            [InlineKeyboardButton(text=c.name, callback_data=f"clinic_{c.clinic_id}")]
            for c in clinics
        ]

    keyboard.append([
        InlineKeyboardButton(text="🔙 Назад", callback_data="back_to_city"),
        InlineKeyboardButton(text="🏠 Главное меню", callback_data="return_main")
    ])

    return InlineKeyboardMarkup(inline_keyboard=keyboard)

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
    await state.set_state(BookingState.choosing_city)

    cities = await get_cities()

    kb = [
        [InlineKeyboardButton(text=c.name, callback_data=f"city_{c.city_id}")]
        for c in cities
    ]
    kb.append([
        InlineKeyboardButton(text="🏠 Главное меню", callback_data="return_main")
    ])

    await callback.message.edit_text(
        "📍 Выберите город:",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=kb)
    )


@dp.callback_query(BookingState.choosing_city, F.data.startswith("city_"))
async def choose_city(callback: CallbackQuery, state: FSMContext):
    await callback.answer()

    city_id = int(callback.data.split("_")[1])

    cities = await get_cities()
    city = next(c.name for c in cities if c.city_id == city_id)

    await state.update_data(
        city_id=city_id,
        city=city
    )

    await state.set_state(BookingState.choosing_clinic)

    await callback.message.edit_text(
        "🏥 Выберите клинику:",
        reply_markup=await clinics_kb(city_id)
    )

@dp.callback_query(BookingState.choosing_clinic, F.data.startswith("clinic_"))
async def choose_clinic(callback: CallbackQuery, state: FSMContext):
    await callback.answer()

    clinic_id = int(callback.data.split("_")[1])

    data = await state.get_data()
    city_id = data["city_id"]

    clinics = await get_clinics_by_city(city_id)
    clinic = next(c.name for c in clinics if c.clinic_id == clinic_id)

    await state.update_data(
        clinic_id=clinic_id,
        clinic=clinic
    )

    doctors = await get_doctors_by_clinic(clinic_id)

    await state.set_state(BookingState.choosing_doctor)

    if not doctors:
        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🔙 Назад", callback_data="back_to_clinic")],
            [InlineKeyboardButton(text="🏠 Главное меню", callback_data="return_main")]
        ])

        await callback.message.edit_text(
            "В этой клинике нет врачей",
            reply_markup=kb
        )
        return

    await callback.message.edit_text(
        "👨‍⚕️ Выберите врача:",
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
        reply_markup=await calendar_kb(now.year, now.month, doctor_id)
    )

@dp.callback_query(BookingState.choosing_doctor, F.data == "back_to_clinic")
async def back_to_clinic_from_doctor(callback: CallbackQuery, state: FSMContext):
    await callback.answer()

    data = await state.get_data()
    city_id = data["city_id"]

    await state.set_state(BookingState.choosing_clinic)

    await callback.message.edit_text(
        "🏥 Выберите клинику:",
        reply_markup=await clinics_kb(city_id)
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

    await callback.message.edit_text("⏳ Загружаю доступное время...")

    try:
        kb = await get_times_kb(year, month, day, doctor_id)
        await callback.message.edit_text(
            f"{progress}⏰ Выберите время:",
            reply_markup=kb
        )
    except Exception as e:
        print(f"get_times_kb error: {e}")
        await callback.message.edit_text(
            f"{progress}❌ Не удалось загрузить время на выбранную дату.",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="🔙 Назад", callback_data="back_to_date")],
                [InlineKeyboardButton(text="🏠 Главное меню", callback_data="return_main")]
            ])
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
async def next_month(callback: CallbackQuery, state: FSMContext):
    await callback.answer()

    _, year, month = callback.data.split("_")
    year = int(year)
    month = int(month) + 1

    if month > 12:
        month = 1
        year += 1

    data = await state.get_data()
    doctor_id = data.get("doctor_id")
    mode = data.get("calendar_mode", "booking")

    await callback.message.edit_reply_markup(
        reply_markup=await calendar_kb(year, month, doctor_id, mode=mode)
    )


@dp.callback_query(F.data.startswith("prev_"))
async def prev_month(callback: CallbackQuery, state: FSMContext):
    await callback.answer()

    _, year, month = callback.data.split("_")
    year = int(year)
    month = int(month) - 1

    if month < 1:
        month = 12
        year -= 1

    data = await state.get_data()
    doctor_id = data.get("doctor_id")
    mode = data.get("calendar_mode", "booking")

    await callback.message.edit_reply_markup(
        reply_markup=await calendar_kb(year, month, doctor_id, mode=mode)
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

    cities = await get_cities()

    kb = [
        [InlineKeyboardButton(text=c.name, callback_data=f"city_{c.city_id}")]
        for c in cities
    ]

    await state.set_state(BookingState.choosing_city)

    kb.append([
        InlineKeyboardButton(text="🏠 Главное меню", callback_data="return_main")
    ])

    await callback.message.edit_text(
        "📍 Выберите город:",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=kb)
    )


@dp.callback_query(F.data == "back_to_weekday")
async def back_to_weekday(callback: CallbackQuery, state: FSMContext):
    await start_schedule(callback, state)


@dp.callback_query(F.data == "back_to_start")
async def back_to_start(callback: CallbackQuery, state: FSMContext):
    await state.set_state(AdminState.choosing_time_start)
    await callback.message.edit_text("Выбери время начала:")


@dp.callback_query(F.data == "back_to_end")
async def back_to_end(callback: CallbackQuery, state: FSMContext):
    await state.set_state(AdminState.choosing_time_end)
    await callback.message.edit_text("Выбери время окончания:")

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

    data = await state.get_data()
    city_id = data["city_id"]

    await callback.message.edit_text(
        f"{progress}🏥 Выберите клинику:",
        reply_markup=await clinics_kb(city_id)
    )

@dp.callback_query(BookingState.choosing_time, F.data == "back_to_date")
async def back_to_date(callback: CallbackQuery, state: FSMContext):
    await callback.answer()

    await state.update_data(date=None, time=None)

    now = datetime.now(MSK_TZ)

    await state.set_state(BookingState.choosing_date)

    progress = await get_progress_text(state)

    data = await state.get_data()
    doctor_id = data.get("doctor_id")

    await callback.message.edit_text(
        f"{progress}📅 Выберите дату:",
        reply_markup=await calendar_kb(now.year, now.month, doctor_id)
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
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="🔙 Назад", callback_data="return_main")]
            ])
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
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🔙 Назад", callback_data="return_main")]
        ])
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
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="🏠 Главное меню", callback_data="return_main")]
            ])
        )
    except Exception as e:
        # Если бот не добавлен в группу или нет прав
        await message.answer(
            "❌ Произошла ошибка при отправке сообщения. Пожалуйста, попробуйте позже.",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="🏠 Главное меню", callback_data="return_main")]
            ])
        )
        print(f"Ошибка отправки в группу: {e}")

    # Очищаем состояние
    await state.clear()


# Инициализация Бд
# async def on_startup(bot: Bot, **kwargs):
#     await init_db()
#     await seed_doctors_if_empty()
#     asyncio.create_task(reminder_worker())

# dp.startup.register(on_startup)

async def main():
    print("Запуск бота...")

    try:
        await init_db()
        print("БД подключена")

        await bot.delete_webhook(drop_pending_updates=True)
        print("Webhook удален")

        await dp.start_polling(bot)

    except Exception as e:
        print("❌ ОШИБКА ПРИ ЗАПУСКЕ:")
        print(e)

# async def seed_doctors_if_empty():
#     doctors = await get_doctors_by_clinic("Клиника №1 (ст. м. ВДНХ)")
#     if doctors:
#         return
#
#     clinic_names = [
#         "Клиника №1 (ст. м. ВДНХ)",
#         "Клиника №2 (ст. м. Лубянка)",
#         "Клиника №3 (ст. м. Бауманская)",
#     ]
#
#     sample = [
#         ("Анна Сергеевна Петрова", "Педиатр"),
#         ("Илья Викторович Смирнов", "Невролог"),
#         ("Мария Андреевна Кузнецова", "ЛОР"),
#     ]
#
#     for clinic in clinic_names:
#         for name, spec in sample:
#             doctor = await create_doctor(clinic=clinic, full_name=name, specialty=spec)
#             # Пн-Пт 09:00-17:00
#             for wd in range(5):
#                 await set_weekly_schedule(doctor.doctor_id, wd, "09:00", "17:00", True)



# --- Настройки и Фильтры Админки ---
class AdminState(StatesGroup):
    waiting_for_broadcast = State()
    waiting_for_new_admin_id = State()
    waiting_city_name = State()
    waiting_clinic_name = State()
    waiting_clinic_city = State()
    choosing_city_for_doctor = State()
    choosing_clinic_for_doctor = State()
    waiting_doctor_name = State()
    waiting_doctor_specialty = State()
    choosing_weekday = State()
    choosing_time_start = State()
    choosing_time_end = State()
    confirm_schedule = State()
    choosing_exception_date = State()
    choosing_exception_type = State()
    choosing_exception_start = State()
    choosing_exception_end = State()
    editing_name=State()
    editing_spec = State()


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
        [InlineKeyboardButton(text="🏙 Города", callback_data="admin_cities")],
        [InlineKeyboardButton(text="🏥 Клиники", callback_data="admin_clinics")],
        [InlineKeyboardButton(text="👨‍⚕️ Врачи", callback_data="admin_doctors")],
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
#Меню клиник
@dp.callback_query(F.data == "admin_clinics")
async def admin_clinics(callback: CallbackQuery):
    cities = await get_cities()

    kb = [
        [InlineKeyboardButton(text=c.name, callback_data=f"clinic_city_{c.city_id}")]
        for c in cities
    ]

    kb.append([InlineKeyboardButton(text="🔙 Назад", callback_data="admin_back")])

    await callback.message.edit_text("Выбери город:", reply_markup=InlineKeyboardMarkup(inline_keyboard=kb))

@dp.callback_query(F.data.startswith("del_doc_"))
async def delete_doctor(callback: CallbackQuery, state: FSMContext):
    doctor_id = int(callback.data.split("_")[2])

    await deactivate_doctor(doctor_id)

    await callback.answer("Удалено")

    data = await state.get_data()
    clinic_id = data.get("clinic_id")

    doctors = await get_doctors_by_clinic(clinic_id)

    kb = []
    for d in doctors:
        kb.append([
            InlineKeyboardButton(text=f"✏️ {d.full_name}", callback_data=f"edit_doc_{d.doctor_id}"),
            InlineKeyboardButton(text="❌", callback_data=f"del_doc_{d.doctor_id}")
        ])

    kb.append([InlineKeyboardButton(text="➕ Добавить врача", callback_data="add_new_doctor")])
    kb.append([InlineKeyboardButton(text="🔙 Назад", callback_data="admin_back")])

    await callback.message.edit_text("👨‍⚕️ Врачи:", reply_markup=InlineKeyboardMarkup(inline_keyboard=kb))

@dp.callback_query(F.data.startswith("clinic_city_"))
async def clinics_in_city(callback: CallbackQuery):
    city_id = int(callback.data.split("_")[2])
    clinics = await get_clinics_by_city(city_id)

    kb = [
        [InlineKeyboardButton(text=f"❌ {c.name}", callback_data=f"delete_clinic_{c.clinic_id}")]
        for c in clinics
    ]

    kb.append([InlineKeyboardButton(text=f"➕ Добавить", callback_data=f"add_clinic_{city_id}")])
    kb.append([InlineKeyboardButton(text="🔙 Назад", callback_data="admin_back")])
    await callback.message.edit_text("🏥 Клиники:", reply_markup=InlineKeyboardMarkup(inline_keyboard=kb))

@dp.callback_query(F.data == "admin_back")
async def admin_back(callback: CallbackQuery):
    await callback.answer()
    await callback.message.edit_text(
        "Админ панель:",
        reply_markup=get_admin_kb(callback.from_user.id)
    )

@dp.message(AdminState.waiting_city_name)
async def save_city(message: Message, state: FSMContext):
    try:
        await create_city(message.text)
        await message.answer("✅ Город добавлен")
    except Exception:
        await message.answer("❌ Такой город уже существует")

    await state.clear()


@dp.callback_query(F.data.startswith("add_clinic_"))
async def add_clinic_start(callback: CallbackQuery, state: FSMContext):
    city_id = int(callback.data.split("_")[2])
    await state.update_data(city_id=city_id)
    await state.set_state(AdminState.waiting_clinic_name)

    await callback.message.edit_text("Введите название клиники:")

@dp.message(AdminState.waiting_clinic_name)
async def save_clinic(message: Message, state: FSMContext):
    data = await state.get_data()
    await create_clinic(message.text, data["city_id"])

    await state.clear()
    await message.answer("✅ Клиника добавлена")

@dp.callback_query(F.data.startswith("delete_clinic_"))
async def delete_clinic_handler(callback: CallbackQuery):
    clinic_id = int(callback.data.split("_")[2])
    await delete_clinic(clinic_id)

    await callback.answer("Удалено")
    await clinics_in_city(callback)

@dp.callback_query(F.data == "admin_doctors")
async def admin_doctors(callback: CallbackQuery, state: FSMContext):
    await state.set_state(AdminState.choosing_city_for_doctor)

    cities = await get_cities()

    kb = [
        [InlineKeyboardButton(text=c.name, callback_data=f"doc_city_{c.city_id}")]
        for c in cities
    ]

    kb.append([InlineKeyboardButton(text="🔙 Назад", callback_data="admin_back")])

    await callback.message.edit_text(
        "Выбери город для врача:",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=kb)
    )

@dp.callback_query(AdminState.choosing_city_for_doctor, F.data.startswith("doc_city_"))
async def choose_city_for_doctor(callback: CallbackQuery, state: FSMContext):
    city_id = int(callback.data.split("_")[2])

    await state.update_data(city_id=city_id)
    await state.set_state(AdminState.choosing_clinic_for_doctor)

    clinics = await get_clinics_by_city(city_id)

    kb = [
        [InlineKeyboardButton(text=c.name, callback_data=f"doc_clinic_{c.clinic_id}")]
        for c in clinics
    ]

    kb.append([InlineKeyboardButton(text="🔙 Назад", callback_data="admin_back")])

    await callback.message.edit_text(
        "Выбери клинику:",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=kb)
    )

@dp.callback_query(AdminState.choosing_clinic_for_doctor, F.data.startswith("doc_clinic_"))
async def choose_clinic_for_doctor(callback: CallbackQuery, state: FSMContext):
    clinic_id = int(callback.data.split("_")[2])

    await state.update_data(clinic_id=clinic_id)

    doctors = await get_doctors_by_clinic(clinic_id)

    kb = []

    for d in doctors:
        kb.append([
            InlineKeyboardButton(text=f"✏️ {d.full_name}", callback_data=f"edit_doc_{d.doctor_id}"),
            InlineKeyboardButton(text="❌", callback_data=f"del_doc_{d.doctor_id}")
        ])

    kb.append([InlineKeyboardButton(text="➕ Добавить врача", callback_data="add_new_doctor")])
    kb.append([InlineKeyboardButton(text="🔙 Назад", callback_data="admin_back")])

    await callback.message.edit_text(
        "👨‍⚕️ Врачи:",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=kb)
    )

@dp.message(AdminState.editing_name)
async def save_new_name(message: Message, state: FSMContext):
    data = await state.get_data()
    doctor_id = data.get("doctor_id")

    if not doctor_id:
        await message.answer("❌ Ошибка: врач не найден")
        return

    async with async_session() as session:
        doctor = await session.get(Doctor, doctor_id)

        if not doctor:
            await message.answer("❌ Врач не найден")
            return

        doctor.full_name = message.text
        await session.commit()

    await state.clear()
    await message.answer("✅ ФИО обновлено")



@dp.callback_query(F.data == "add_new_doctor")
async def add_new_doctor(callback: CallbackQuery, state: FSMContext):
    await state.set_state(AdminState.waiting_doctor_name)

    await callback.message.edit_text(
        "Введите ФИО врача:",
        reply_markup=back_main_admin_kb()
    )


@dp.callback_query(F.data.startswith("edit_doc_"))
async def edit_doctor(callback: CallbackQuery, state: FSMContext):
    doctor_id = int(callback.data.split("_")[2])
    await state.update_data(doctor_id=doctor_id)

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✏️ Изменить ФИО", callback_data="edit_name")],
        [InlineKeyboardButton(text="🩺 Изменить специальность", callback_data="edit_spec")],
        [InlineKeyboardButton(text="📅 Расписание и исключения", callback_data="doctor_schedule_menu")],
        [InlineKeyboardButton(text="🔙 К списку врачей", callback_data="back_to_doctor_list")]
    ])

    await callback.message.edit_text("Редактирование врача:", reply_markup=kb)


@dp.callback_query(F.data == "doctor_schedule_menu")
async def doctor_schedule_menu(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    doctor_id = data.get("doctor_id")

    if not doctor_id:
        await callback.answer("Врач не найден", show_alert=True)
        return

    weekly = await get_weekly_schedule(doctor_id)
    exceptions = await get_doctor_exceptions(doctor_id)

    text = "📅 Расписание врача:\n\n"

    if weekly:
        text += "Обычные дни:\n"
        for rule in weekly:
            text += f"• {WEEKDAY_NAMES[rule.weekday]} {rule.start_time.strftime('%H:%M')}–{rule.end_time.strftime('%H:%M')}\n"
    else:
        text += "Обычных рабочих дней пока нет.\n"

    text += "\nИсключения (перекрывают обычное расписание):\n"
    if exceptions:
        for exc in exceptions:
            if exc.is_working and exc.start_time and exc.end_time:
                desc = f"рабочий день {exc.start_time.strftime('%H:%M')}–{exc.end_time.strftime('%H:%M')}"
            else:
                desc = "выходной"
            text += f"• {exc.exception_date.strftime('%d.%m.%Y')} — {desc}\n"
    else:
        text += "Нет исключений.\n"

    kb = []
    for rule in weekly:
        kb.append([
            InlineKeyboardButton(
                text=f"❌ Убрать {WEEKDAY_NAMES[rule.weekday]} {rule.start_time.strftime('%H:%M')}–{rule.end_time.strftime('%H:%M')}",
                callback_data=f"del_rule_{rule.id}"
            )
        ])

    for exc in exceptions:
        kb.append([
            InlineKeyboardButton(
                text=f"❌ Убрать исключение {exc.exception_date.strftime('%d.%m.%Y')}",
                callback_data=f"del_exc_{exc.id}"
            )
        ])

    kb.append([InlineKeyboardButton(text="➕ Добавить рабочий день", callback_data="add_schedule")])
    kb.append([InlineKeyboardButton(text="🚫 Добавить исключение", callback_data="add_exception")])
    kb.append([InlineKeyboardButton(text="🔙 Назад", callback_data="back_to_doctor_menu")])

    await callback.message.edit_text(text, reply_markup=InlineKeyboardMarkup(inline_keyboard=kb))


@dp.callback_query(F.data == "back_to_doctor_menu")
async def back_to_doctor_menu(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    doctor_id = data.get("doctor_id")

    if not doctor_id:
        await callback.answer("Врач не найден", show_alert=True)
        return

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✏️ Изменить ФИО", callback_data="edit_name")],
        [InlineKeyboardButton(text="🩺 Изменить специальность", callback_data="edit_spec")],
        [InlineKeyboardButton(text="📅 Расписание и исключения", callback_data="doctor_schedule_menu")],
        [InlineKeyboardButton(text="🔙 К списку врачей", callback_data="back_to_doctor_list")]
    ])

    await callback.message.edit_text("Редактирование врача:", reply_markup=kb)


@dp.callback_query(F.data.startswith("del_rule_"))
async def delete_rule(callback: CallbackQuery, state: FSMContext):
    rule_id = int(callback.data.split("_")[2])
    await delete_weekly_rule(rule_id)
    await callback.answer("Удалено")
    await doctor_schedule_menu(callback, state)


@dp.callback_query(F.data.startswith("del_exc_"))
async def delete_exc(callback: CallbackQuery, state: FSMContext):
    exc_id = int(callback.data.split("_")[2])
    await delete_doctor_exception(exc_id)
    await callback.answer("Удалено")
    await doctor_schedule_menu(callback, state)


@dp.callback_query(F.data == "back_to_doctor_list")
async def back_to_doctor_list(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    clinic_id = data.get("clinic_id")

    if not clinic_id:
        await callback.answer("Клиника не найдена", show_alert=True)
        return

    doctors = await get_doctors_by_clinic(clinic_id)

    kb = []
    for d in doctors:
        kb.append([
            InlineKeyboardButton(text=f"✏️ {d.full_name}", callback_data=f"edit_doc_{d.doctor_id}"),
            InlineKeyboardButton(text="❌", callback_data=f"del_doc_{d.doctor_id}")
        ])

    kb.append([InlineKeyboardButton(text="➕ Добавить врача", callback_data="add_new_doctor")])
    kb.append([InlineKeyboardButton(text="🔙 Назад", callback_data="admin_back")])

    await callback.message.edit_text(
        "👨‍⚕️ Врачи:",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=kb)
    )


@dp.callback_query(F.data == "edit_name")
async def edit_name(callback: CallbackQuery, state: FSMContext):
    await state.set_state(AdminState.editing_name)

    await callback.message.edit_text(
        "Введите новое ФИО:",
        reply_markup=back_main_admin_kb("back_to_doctor_menu")
    )


@dp.message(AdminState.editing_name)
async def save_new_name(message: Message, state: FSMContext):
    data = await state.get_data()
    doctor_id = data["doctor_id"]

    async with async_session() as session:
        doctor = await session.get(Doctor, doctor_id)
        doctor.full_name = message.text
        await session.commit()

    await state.clear()
    await message.answer("✅ ФИО обновлено", reply_markup=get_admin_kb(message.from_user.id))

@dp.callback_query(F.data == "edit_spec")
async def edit_spec(callback: CallbackQuery, state: FSMContext):
    await state.set_state(AdminState.editing_spec)

    await callback.message.edit_text(
        "Введите новую специальность:",
        reply_markup=back_main_admin_kb("back_to_doctor_menu")
    )

@dp.message(AdminState.editing_spec)
async def save_new_spec(message: Message, state: FSMContext):
    data = await state.get_data()
    doctor_id = data["doctor_id"]

    async with async_session() as session:
        doctor = await session.get(Doctor, doctor_id)
        doctor.specialty = message.text
        await session.commit()

    await state.clear()
    await message.answer("✅ Специальность обновлена", reply_markup=get_admin_kb(message.from_user.id))

@dp.message(AdminState.waiting_doctor_name)
async def input_doctor_name(message: Message, state: FSMContext):
    await state.update_data(full_name=message.text)
    await state.set_state(AdminState.waiting_doctor_specialty)

    await message.answer(
        "Введите специальность врача:",
        reply_markup=back_main_admin_kb("back_to_doctor_list")
    )

def back_main_admin_kb(back_callback="admin_back"):
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔙 Назад", callback_data=back_callback)],
        [InlineKeyboardButton(text="🏠 Главное меню", callback_data="return_main")]
    ])

@dp.message(AdminState.waiting_doctor_specialty)
async def input_doctor_specialty(message: Message, state: FSMContext):
    data = await state.get_data()

    doctor = await create_doctor(
        clinic_id=data["clinic_id"],
        full_name=data["full_name"],
        specialty=message.text
    )

    await state.update_data(doctor_id=doctor.doctor_id)

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📅 Добавить расписание", callback_data="add_schedule")],
        [InlineKeyboardButton(text="🚫 Исключения (даты)", callback_data="add_exception")],
        [InlineKeyboardButton(text="🏠 В админку", callback_data="admin_back")]
    ])

    await message.answer(
        f"✅ Врач добавлен:\n{doctor.full_name}",
        reply_markup=kb
    )

#Управление городами
@dp.callback_query(F.data == "add_city")
async def add_city(callback: CallbackQuery, state: FSMContext):
    await state.set_state(AdminState.waiting_city_name)
    await callback.message.edit_text("Введите название города:")

@dp.callback_query(F.data.startswith("delete_city_"))
async def delete_city_handler(callback: CallbackQuery):
    city_id = int(callback.data.split("_")[2])
    await delete_city(city_id)

    await callback.answer("Удалено")
    await admin_cities(callback)

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

#Управление городами
@dp.callback_query(F.data == "admin_cities")
async def admin_cities(callback: CallbackQuery):
    cities = await get_cities()

    kb = [
        [InlineKeyboardButton(text=f"❌ {c.name}", callback_data=f"delete_city_{c.city_id}")]
        for c in cities
    ]

    kb.append([InlineKeyboardButton(text="➕ Добавить город", callback_data="add_city")])
    kb.append([InlineKeyboardButton(text="🔙 Назад", callback_data="admin_back")])

    await callback.message.edit_text("🏙 Города:", reply_markup=InlineKeyboardMarkup(inline_keyboard=kb))


#Выбор дня недели
@dp.callback_query(F.data == "add_schedule")
async def start_schedule(callback: CallbackQuery, state: FSMContext):
    await state.set_state(AdminState.choosing_weekday)

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="Пн", callback_data="day_0")],
        [InlineKeyboardButton(text="Вт", callback_data="day_1")],
        [InlineKeyboardButton(text="Ср", callback_data="day_2")],
        [InlineKeyboardButton(text="Чт", callback_data="day_3")],
        [InlineKeyboardButton(text="Пт", callback_data="day_4")],
        [InlineKeyboardButton(text="Сб", callback_data="day_5")],
        [InlineKeyboardButton(text="Вс", callback_data="day_6")],
        [InlineKeyboardButton(text="🔙 Назад", callback_data="back_to_admin")]
    ])

    await callback.message.edit_text("Выбери день недели:", reply_markup=kb)

@dp.callback_query(AdminState.choosing_weekday, F.data.startswith("day_"))
async def choose_weekday(callback: CallbackQuery, state: FSMContext):
    weekday = int(callback.data.split("_")[1])

    await state.update_data(weekday=weekday)
    await state.set_state(AdminState.choosing_time_start)

    kb = build_hour_keyboard(range(7, 14), "start_", "back_to_weekday")

    await callback.message.edit_text(
        "Выбери время начала:",
        reply_markup=kb
    )
@dp.callback_query(AdminState.choosing_time_start, F.data.startswith("start_"))
async def choose_start(callback: CallbackQuery, state: FSMContext):
    start_time = callback.data.replace("start_", "")

    await state.update_data(start_time=start_time)
    await state.set_state(AdminState.choosing_time_end)

    kb = build_hour_keyboard(range(14, 21), "end_", "back_to_start")

    await callback.message.edit_text(
        "Выбери время окончания:",
        reply_markup=kb
    )

    await callback.message.edit_text("Выбери время окончания:", reply_markup=kb)

@dp.callback_query(AdminState.choosing_time_end, F.data.startswith("end_"))
async def choose_end(callback: CallbackQuery, state: FSMContext):
    end_time = callback.data.replace("end_", "")

    data = await state.get_data()

    await state.update_data(end_time=end_time)
    await state.set_state(AdminState.confirm_schedule)

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✅ Сохранить", callback_data="save_schedule")],
        [InlineKeyboardButton(text="🔙 Назад", callback_data="back_to_end")]
    ])

    await callback.message.edit_text(
        f"""
Проверь:

День: {WEEKDAY_NAMES[data['weekday']]}
Время: {data['start_time']} - {end_time}
""",
        reply_markup=kb
    )

@dp.callback_query(F.data == "save_schedule")
async def save_schedule(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()

    await set_weekly_schedule(
        doctor_id=data["doctor_id"],
        weekday=data["weekday"],
        start_time=data["start_time"],
        end_time=data["end_time"]
    )

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="➕ Добавить ещё день", callback_data="add_schedule")],
        [InlineKeyboardButton(text="🏠 В админку", callback_data="admin_back")]
    ])

    await callback.message.edit_text(
        "✅ Расписание сохранено",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="➕ Добавить ещё день", callback_data="add_schedule")],
            [InlineKeyboardButton(text="🚫 Добавить исключение", callback_data="add_exception")],
            [InlineKeyboardButton(text="📅 К расписанию", callback_data="doctor_schedule_menu")],
            [InlineKeyboardButton(text="🔙 Назад", callback_data="back_to_doctor_menu")]
        ])
    )

@dp.callback_query(F.data == "add_exception")
async def start_exception(callback: CallbackQuery, state: FSMContext):
    await state.set_state(AdminState.choosing_exception_date)
    await state.update_data(calendar_mode="admin_exception")

    now = datetime.now(MSK_TZ)

    await callback.message.edit_text(
        "📅 Выбери дату исключения:",
        reply_markup=await calendar_kb(now.year, now.month, mode="admin_exception")
    )

@dp.callback_query(AdminState.choosing_exception_date, F.data.startswith("day_"))
async def choose_exception_date(callback: CallbackQuery, state: FSMContext):
    _, year, month, day = callback.data.split("_")
    year, month, day = int(year), int(month), int(day)

    await state.update_data(exc_year=year, exc_month=month, exc_day=day)
    await state.set_state(AdminState.choosing_exception_type)

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="❌ Выходной (не работает)", callback_data="exc_off")],
        [InlineKeyboardButton(text="🟢 Сделать рабочим", callback_data="exc_work")],
        [InlineKeyboardButton(text="⏰ Особые часы", callback_data="exc_custom")],
        [InlineKeyboardButton(text="🔙 Назад", callback_data="admin_back")]
    ])

    await callback.message.edit_text(
        "Выбери тип исключения:",
        reply_markup=kb
    )

@dp.callback_query(AdminState.choosing_exception_type, F.data == "exc_off")
async def exception_off(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()

    await add_doctor_exception(
        doctor_id=data["doctor_id"],
        exc_date=datetime(data["exc_year"], data["exc_month"], data["exc_day"]).date(),
        is_working=False
    )

    await state.clear()

    await callback.message.edit_text(
        "✅ День успешно заблокирован",
        reply_markup=back_main_admin_kb()
    )


@dp.callback_query(AdminState.choosing_exception_type, F.data == "exc_work")
async def exception_work(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()

    await state.set_state(AdminState.choosing_exception_start)

    kb = build_hour_keyboard(range(7, 14), "exc_start_", "admin_back")

    await callback.message.edit_text(
        "Выбери время начала рабочего дня:",
        reply_markup=kb
    )


@dp.callback_query(AdminState.choosing_exception_type, F.data == "exc_custom")
async def exception_custom_start(callback: CallbackQuery, state: FSMContext):
    await state.set_state(AdminState.choosing_exception_start)

    kb = build_hour_keyboard(range(7, 14), "exc_start_", "admin_back")

    await callback.message.edit_text(
        "Выбери время начала:",
        reply_markup=kb
    )

@dp.callback_query(AdminState.choosing_exception_start, F.data.startswith("exc_start_"))
async def exception_custom_end(callback: CallbackQuery, state: FSMContext):
    start_time = callback.data.replace("exc_start_", "")

    await state.update_data(exc_start=start_time)
    await state.set_state(AdminState.choosing_exception_end)

    kb = build_hour_keyboard(range(14, 21), "exc_end_", "admin_back")

    await callback.message.edit_text(
        "Выбери время окончания:",
        reply_markup=kb
    )

@dp.callback_query(AdminState.choosing_exception_end, F.data.startswith("exc_end_"))
async def save_exception(callback: CallbackQuery, state: FSMContext):
    end_time = callback.data.replace("exc_end_", "")
    data = await state.get_data()

    await add_doctor_exception(
        doctor_id=data["doctor_id"],
        exc_date=datetime(data["exc_year"], data["exc_month"], data["exc_day"]).date(),
        is_working=True,
        start_time=data["exc_start"],
        end_time=end_time
    )

    await state.clear()

    await callback.message.edit_text(
        "✅ Особое расписание сохранено",
        reply_markup=admin_back_kb()
    )


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
