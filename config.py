import os
from dotenv import load_dotenv

# Загружаем .env
load_dotenv()

# Читаем переменные
TOKEN = os.getenv("TOKEN")
GROUP_ID = int(os.getenv("GROUP_ID"))
DATABASE_URL = os.getenv("DATABASE_URL")
SUPERADMIN_ID = int(os.getenv("SUPERADMIN_ID"))

# Проверка (очень полезно)
if not TOKEN:
    raise ValueError("TOKEN не найден в .env")
