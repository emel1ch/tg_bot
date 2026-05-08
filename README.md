# tg_bot / master-miniapp

Ветка `master-miniapp` содержит:
- Telegram-бот на `aiogram`
- Telegram Mini App на `React + Vite`
- backend для Mini App (оплата YooKassa, проверка доступа, промокоды, мини-админка промокодов)

## Структура

- `tgbotik.py` — Telegram-бот
- `config.py` — чтение `TOKEN`, `GROUP_ID`, `SUPERADMIN_ID`, `DATABASE_URL`, `WORKER_URL` из переменных окружения
- `MiniApp/` — фронтенд Mini App
- `MiniApp/server/` — backend Mini App

## Возможности Mini App

- Материалы по двум направлениям: кровь / стоматолог
- Платный доступ для стоматологии
- Оплата через YooKassa (test/prod ключи через env)
- Промокоды со скидкой в процентах
- Встроенная админка промокодов (права синхронизируются с БД Telegram-бота)
- Серверная проверка `initData` подписи Telegram

## Требования

- Node.js `20.19+` (для Vite 7)
- npm `10+`
- Python `3.11+`

## Быстрый старт

### 1) Telegram-бот

```powershell
cd C:\path\to\repo
copy .env.example .env
```

Заполнить `.env`:

```env
TOKEN=...
GROUP_ID=...
SUPERADMIN_ID=...
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname
WORKER_URL=https://your-worker-domain.example
```

Запуск:

```powershell
python tgbotik.py
```

### 2) Mini App (frontend + backend)

```powershell
cd C:\path\to\repo\MiniApp
npm ci
npm --prefix server ci
copy .env.example .env
copy server\.env.example server\.env
```

Заполнить `MiniApp/.env`:

```env
VITE_API_BASE_URL=http://localhost:3000
```

Заполнить `MiniApp/server/.env`:

```env
PORT=3000
YOOKASSA_SHOP_ID=...
YOOKASSA_SECRET_KEY=...
YOOKASSA_RETURN_URL=https://t.me
DENTIST_PRICE=69
TELEGRAM_BOT_TOKEN=...
BOT_DATABASE_URL=postgresql://user:pass@host:5432/dbname
ADMIN_TELEGRAM_IDS=
```

Важно:
- `BOT_DATABASE_URL` должен указывать на ту же БД, что использует Telegram-бот.
- Если в боте стоит `DATABASE_URL=postgresql+asyncpg://...`, для MiniApp server используйте формат `postgresql://...` (без `+asyncpg`).

Запуск одной командой:

```powershell
npm run dev:all
```

Отдельно:

```powershell
npm run dev:host
npm run dev:server
```

## Туннель для Mini App

```powershell
cd MiniApp
npm run tunnel:front
```

Скопировать выданный `https://...` в `WEBAPP_URL` (в `.env` рядом с `tgbotik.py`), перезапустить бота.

В текущей версии `origin/master` URL Mini App в кнопке может быть захардкожен в `tgbotik.py`.
Если ссылка не меняется через env, обновите URL в функции `get_main_menu_kb()`.

## Команды разработки

```powershell
cd MiniApp
npm run lint
npm run build
```

## Безопасность

- Секреты не хранятся в репозитории (`.env` исключены из git)
- Доступ в админку Mini App определяется только сервером:
  - криптографическая проверка Telegram `initData`
  - проверка `users.is_root` в БД Telegram-бота (через `BOT_DATABASE_URL`)
  - `ADMIN_TELEGRAM_IDS` можно использовать как резервный whitelist

## Примечание по веткам

На `origin` основная ветка называется `master` (не `main`).
