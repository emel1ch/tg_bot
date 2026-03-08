import asyncio
import calendar
from datetime import datetime
from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, CallbackQuery
from aiogram.types.web_app_info import WebAppInfo
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import StatesGroup, State
from aiogram.filters import StateFilter
from config import TOKEN, GROUP_ID

bot = Bot(token=TOKEN)
dp = Dispatcher()


# --- Состояния ---
class UserState(StatesGroup):
    waiting_for_consent = State()


class SupportState(StatesGroup):
    waiting_for_message = State()

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

    cal = calendar.monthcalendar(year, month)
    keyboard = []

    month_title = f"{MONTH_NAMES[month-1]} {year}"

    keyboard.append([
        InlineKeyboardButton(text=month_title, callback_data="ignore")
    ])

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
                row.append(
                    InlineKeyboardButton(
                        text=str(day),
                        callback_data=f"day_{year}_{month}_{day}"
                    )
                )
        keyboard.append(row)

    keyboard.append([
        InlineKeyboardButton(text="◀️", callback_data=f"prev_{year}_{month}"),
        InlineKeyboardButton(text="▶️", callback_data=f"next_{year}_{month}")
    ])

    keyboard.append([
        InlineKeyboardButton(text="🔙 Назад", callback_data="back_to_clinic"),
        InlineKeyboardButton(text="🏠 Главное меню", callback_data="return_main")
    ])

    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def get_main_menu_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="Сервис 'Иду к врачу'",
                              url="https://youtu.be/dQw4w9WgXcQ?si=Kgr7WKcdwiUi5e1k")],
        [InlineKeyboardButton(text="📚 Подготовка (Материалы)", web_app=WebAppInfo(url="https://ya.ru"))],
        # Замени на HTTPS ссылку твоего веб-сервиса
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

# --- Обработчики старта и согласия ---
@dp.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext):
    await state.clear()  # Сбрасываем любые старые состояния при перезапуске

    welcome_text = (
        "Привет! Я цифровой помощник «Иду к врачу».\n\n"
        "Я помогаю ребёнку с РАС подготовиться к посещению врача и сделать его менее тревожным.\n\n"
        "Для продолжения работы мне необходимо ваше согласие на обработку персональных данных. "
        "Пожалуйста, ознакомьтесь с документом по ссылке ниже и подтвердите согласие."
    )
    await state.set_state(UserState.waiting_for_consent)
    await message.answer(welcome_text, reply_markup=consent_kb)


@dp.message(UserState.waiting_for_consent)
async def block_unconsented_user(message: Message):
    await message.answer(
        "Пожалуйста, ознакомьтесь с документом и нажмите кнопку «✅ Я даю согласие», чтобы получить доступ к функционалу бота.")


@dp.callback_query(F.data == "accept_consent") # Убрали UserState.waiting_for_consent
async def on_consent_accepted(callback: CallbackQuery, state: FSMContext):
    # Очищаем состояние, если оно было
    await state.clear()

    # Убираем "часики" загрузки на кнопке
    await callback.answer("Согласие получено!", show_alert=False)

    # Меняем сообщение на главное меню
    await callback.message.edit_text(
        "Спасибо! Теперь вам доступен весь интерфейс.\n\n"
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
            [InlineKeyboardButton(text="Москва", callback_data="city_moscow")],
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
        "city_moscow": "Москва"
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

    now = datetime.now()

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

    month_name = [
        "января", "февраля", "марта", "апреля", "мая", "июня",
        "июля", "августа", "сентября", "октября", "ноября", "декабря"
    ]

    date_text = f"{day} {month_name[int(month) - 1]} {year}"

    await state.update_data(date=date_text)

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

    progress = await get_progress_text(state)

    await callback.message.edit_text(
        f"{progress}⏰ Выберите время:",
        reply_markup=times_kb()
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
        text += f"⏰ {data['time']}:00\n"

    if text:
        text += "\n"

    return text


@dp.callback_query(BookingState.choosing_date, F.data.startswith("next_"))
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


@dp.callback_query(BookingState.choosing_date,F.data.startswith("prev_"))
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

    # Здесь мы забираем все ответы, которые пользователь давал на предыдущих шагах
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
        reply_markup=times_kb()
    )


# --- Обработчики "Назад" (минимальные, чтобы не ломалось) ---
@dp.callback_query(BookingState.choosing_clinic, F.data == "back_to_city")
async def back_to_city(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    # воссоздаём клавиатуру города (как в start_booking)
    cities_markup = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="Москва", callback_data="city_moscow")],
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

    await state.set_state(BookingState.choosing_clinic)

    progress = await get_progress_text(state)

    await callback.message.edit_text(
        f"{progress}🏥 Выберите клинику:",
        reply_markup=clinics_kb()
    )

@dp.callback_query(BookingState.choosing_time, F.data == "back_to_date")
async def back_to_date(callback: CallbackQuery, state: FSMContext):
    await callback.answer()

    now = datetime.now()

    await state.set_state(BookingState.choosing_date)

    progress = await get_progress_text(state)

    await callback.message.edit_text(
        f"{progress}📅 Выберите дату:",
        reply_markup=calendar_kb(now.year, now.month)
    )


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
    await callback.message.edit_text(
        "📋 Ваши записи:\n\nУ вас пока нет активных записей.",
        reply_markup=get_back_to_main_kb()
    )


@dp.callback_query(F.data == "menu_support")
async def process_support(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    await state.set_state(SupportState.waiting_for_message)

    cancel_kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔙 Отмена", callback_data="return_main")]
    ])

    await callback.message.edit_text(
        "💬 Напишите ваш вопрос одним сообщением ниже.\n\n"
        "Специалисты поддержки получат его и ответят вам прямо в этом чате.",
        reply_markup=cancel_kb
    )


# Пересылка в группу админов
@dp.message(SupportState.waiting_for_message)
async def forward_to_group(message: Message, state: FSMContext):
    user_info = f"👤 Пользователь: {message.from_user.full_name}\n"
    user_info += f"🆔 ID: {message.from_user.id}\n"
    if message.from_user.username:
        user_info += f"🔗 @{message.from_user.username}\n"

    admin_text = f"🚨 #Новое_обращение\n\n{user_info}\n📝 Текст:\n{message.text}"

    try:
        await bot.send_message(chat_id=GROUP_ID, text=admin_text)
        await state.clear()
        await message.answer(
            "✅ Ваше сообщение успешно отправлено специалистам!\nОжидайте ответа.",
            reply_markup=get_main_menu_kb()
        )
    except Exception as e:
        await message.answer("Произошла ошибка при отправке. Попробуйте позже.")
        print(f"Ошибка пересылки в группу: {e}")


# Обработка ответа от админа из группы
@dp.message(F.chat.id == GROUP_ID, F.reply_to_message)
async def reply_from_group(message: Message):
    # Проверяем, что админ ответил именно на сообщение бота
    if message.reply_to_message.from_user.id != bot.id:
        return

    original_text = message.reply_to_message.text
    if not original_text:
        return

    # Ищем ID пользователя в оригинальном сообщении
    if "🆔 ID: " in original_text:
        try:
            user_id_str = original_text.split("🆔 ID: ")[1].split("\n")[0]
            user_id = int(user_id_str)

            answer_text = f"💬 Ответ от поддержки:\n\n{message.text}"
            await bot.send_message(chat_id=user_id, text=answer_text)

            await message.reply("✅ Ответ успешно переслан пользователю.")
        except Exception as e:
            await message.reply(f"❌ Ошибка пересылки ответа: {e}")
async def main():
    await dp.start_polling(bot)


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('Exit')
