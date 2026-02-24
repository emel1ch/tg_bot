import asyncio
import aiogram

from aiogram import Bot, Dispatcher
from aiogram.filters import CommandStart, Command
from aiogram.types import Message

from config import TOKEN

bot = Bot(token=TOKEN)
dp = Dispatcher()

@dp.message(CommandStart())
async def cmd_start(message: Message):
    await message.answer("""Привет! Я цифровой помощник «Иду к врачу».

Я помогаю ребёнку с РАС подготовиться к посещению врача и сделать его менее тревожным.

Что доступно прямо сейчас:
• Подготовка ребёнка к посещению стоматолога
• Подготовка к сдаче крови
• Запись в клинику

Подготовка включает:
• адаптационные материалы и мультфильмы
• соц-истории
• игры-тренажёры
• рекомендации для родителей

Нажимая кнопку «Начать», вы подтверждаете согласие
на обработку персональных данных.
""")

async def main():
    await dp.start_polling(bot)

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('Exit')