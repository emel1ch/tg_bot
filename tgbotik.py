import asyncio
from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, CallbackQuery
from aiogram.types.web_app_info import WebAppInfo
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import StatesGroup, State
from aiogram.filters import StateFilter
from config import TOKEN

bot = Bot(token=TOKEN)
dp = Dispatcher()


# --- Состояния ---
class UserState(StatesGroup):
    waiting_for_consent = State()


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


def get_main_menu_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
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

    cities_kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="Москва", callback_data="city_moscow")]
    ])

    await state.set_state(BookingState.choosing_city)
    await callback.message.edit_text("📍 Шаг 1: Выберите ваш город:", reply_markup=cities_kb)


@dp.callback_query(BookingState.choosing_city, F.data.startswith("city_"))
async def choose_city(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    await state.update_data(city=callback.data.split("_")[1])  # Сохраняем город в память

    clinics_kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="Зубная фея", callback_data="clinic_1")],
        [InlineKeyboardButton(text="Отмена", callback_data="return_main")]
    ])

    await state.set_state(BookingState.choosing_clinic)
    await callback.message.edit_text("🏥 Шаг 2: Выберите клинику:", reply_markup=clinics_kb)


@dp.callback_query(BookingState.choosing_clinic, F.data.startswith("clinic_"))
async def choose_clinic(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    await state.update_data(clinic=callback.data)

    dates_kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="Завтра", callback_data="date_tmrw")],
        [InlineKeyboardButton(text="Послезавтра", callback_data="date_after_tmrw")],
        [InlineKeyboardButton(text="Отмена", callback_data="return_main")]
    ])

    await state.set_state(BookingState.choosing_date)
    await callback.message.edit_text("📅 Шаг 3: Выберите желаемую дату:", reply_markup=dates_kb)


@dp.callback_query(BookingState.choosing_date, F.data.startswith("date_"))
async def choose_date(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    await state.update_data(date=callback.data)

    time_kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="08:00 - 10:00", callback_data="time_morning")],
        [InlineKeyboardButton(text="10:00 - 12:00", callback_data="time_day")],
        [InlineKeyboardButton(text="12:00 - 14:00", callback_data="time_day")],
        [InlineKeyboardButton(text="14:00 - 16:00", callback_data="time_day")],
        [InlineKeyboardButton(text="16:00 - 18:00", callback_data="time_day")],
        [InlineKeyboardButton(text="18:00 - 20:00", callback_data="time_day")],
        [InlineKeyboardButton(text="Отмена", callback_data="return_main")]
    ])

    await state.set_state(BookingState.choosing_time)
    await callback.message.edit_text("⏰ Шаг 4: Выберите диапазон времени:", reply_markup=time_kb)


@dp.callback_query(BookingState.choosing_time, F.data.startswith("time_"))
async def choose_time(callback: CallbackQuery, state: FSMContext):
    await callback.answer()

    # Здесь мы забираем все ответы, которые пользователь давал на предыдущих шагах
    user_data = await state.get_data()

    # Очищаем состояние, так как процесс завершен
    await state.clear()

    await callback.message.edit_text(
        "✅ Заявка сформирована!\n\n"
        "Администратор клиники свяжется с вами для уточнения и согласования даты и времени записи.",
        reply_markup=get_back_to_main_kb()
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
async def process_support(callback: CallbackQuery):
    await callback.answer()
    await callback.message.edit_text(
        "💬 Чат со специалистом временно недоступен. Пожалуйста, попробуйте позже.",
        reply_markup=get_back_to_main_kb()
    )


async def main():
    await dp.start_polling(bot)


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:

        print('Exit')
