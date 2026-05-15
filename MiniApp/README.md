# MiniApp

Frontend и backend для Telegram Mini App.

## Стек

- React 19 + Vite 7
- Tailwind CSS 4
- Express (server)
- YooKassa API

## Установка

```powershell
cd MiniApp
npm ci
npm --prefix server ci
copy .env.example .env
copy server\.env.example server\.env
```

## Переменные окружения

`MiniApp/.env`:

```env
VITE_API_BASE_URL=http://localhost:3000
```

`MiniApp/server/.env`:

```env
PORT=3000
YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=
YOOKASSA_RETURN_URL=https://t.me
DENTIST_PRICE=69
DENTIST_PROMO_CODES=
ADMIN_TELEGRAM_IDS=
TELEGRAM_BOT_TOKEN=
TELEGRAM_INIT_DATA_MAX_AGE_SEC=86400
DEFAULT_PAYMENT_DESCRIPTION=MiniApp access payment
BOT_DATABASE_URL=
```

Админ-доступ:
- MiniApp server сначала валидирует Telegram `initData`.
- Затем проверяет админ-права в БД Telegram-бота (`users.is_root`) через `BOT_DATABASE_URL`.
- `ADMIN_TELEGRAM_IDS` остаётся как резервный fallback.

Важно по строке подключения:
- Если у бота `DATABASE_URL` в формате `postgresql+asyncpg://...`, в `BOT_DATABASE_URL` для Node.js нужно указывать `postgresql://...` (без `+asyncpg`).

## Запуск

Оба сервиса:

```powershell
npm run dev:all
```

Отдельно:

```powershell
npm run dev:host
npm run dev:server
```

Туннель:

```powershell
npm run tunnel:front
```

## Проверка

```powershell
npm run lint
npm run build
```
