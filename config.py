import os
from dotenv import load_dotenv

# Загружаем .env
load_dotenv()

TOKEN = os.getenv("TOKEN")
if not TOKEN:
    raise ValueError("TOKEN не найден в .env")

# Безопасное чтение чисел
try:
    GROUP_ID = int(os.getenv("GROUP_ID", 0))
    SUPERADMIN_ID = int(os.getenv("SUPERADMIN_ID", 0))
except ValueError:
    raise ValueError("GROUP_ID или SUPERADMIN_ID должны быть числами в .env")

DATABASE_URL = os.getenv("DATABASE_URL")

# Безопасное чтение URL
worker_env = os.getenv("WORKER_URL")
WORKER_URL = worker_env.rstrip('/') if worker_env else None
if not WORKER_URL:
    raise ValueError("WORKER_URL не найден в .env")