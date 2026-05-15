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


def parse_admin_ids(raw_value: str | None) -> set[int]:
    ids: set[int] = set()
    if not raw_value:
        return ids

    for chunk in raw_value.split(","):
        value = chunk.strip()
        if not value:
            continue
        if not value.isdigit():
            raise ValueError("ADMIN_TELEGRAM_IDS должен содержать только числа, разделенные запятой")
        ids.add(int(value))

    return ids


ADMIN_TELEGRAM_IDS = parse_admin_ids(os.getenv("ADMIN_TELEGRAM_IDS"))
if SUPERADMIN_ID > 0:
    ADMIN_TELEGRAM_IDS.add(SUPERADMIN_ID)

DATABASE_URL = os.getenv("DATABASE_URL")

# Безопасное чтение URL
worker_env = os.getenv("WORKER_URL")
WORKER_URL = worker_env.rstrip('/') if worker_env else None
if not WORKER_URL:
    raise ValueError("WORKER_URL не найден в .env")
