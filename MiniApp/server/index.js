import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import pg from 'pg';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_ENV_PATH = path.resolve(__dirname, '..', '..', '.env');
const LOCAL_ENV_PATH = path.resolve(__dirname, '.env');

// Load shared root env first, then local server env as additive config.
dotenv.config({ path: ROOT_ENV_PATH });
dotenv.config({ path: LOCAL_ENV_PATH });

const app = express();
const PORT = Number(process.env.PORT || 3000);
const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3';
const DEFAULT_RETURN_URL = process.env.YOOKASSA_RETURN_URL || 'https://t.me';

const DENTIST_PRODUCT_ID = 'dentist-course';
const rawBasePrice = Number(process.env.DENTIST_PRICE || 69);
const DENTIST_BASE_PRICE = Number.isFinite(rawBasePrice) ? rawBasePrice : 69;
const DENTIST_CURRENCY = 'RUB';
const DENTIST_PAYMENT_DESCRIPTION = process.env.DEFAULT_PAYMENT_DESCRIPTION || 'MiniApp access payment';

const ENTITLEMENTS_FILE_PATH = path.join(__dirname, 'data', 'entitlements.json');
const PROMO_SETTINGS_FILE_PATH = path.join(__dirname, 'data', 'promo-settings.json');

const TELEGRAM_INIT_DATA_MAX_AGE_SEC = Number(process.env.TELEGRAM_INIT_DATA_MAX_AGE_SEC || 86400);
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const BOT_DATABASE_URL = String(process.env.BOT_DATABASE_URL || process.env.DATABASE_URL || '').trim();

const parseTelegramIdList = (rawValue) =>
  String(rawValue || '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => /^\d+$/.test(id));

const ADMIN_TELEGRAM_IDS = new Set([
  ...parseTelegramIdList(process.env.ADMIN_TELEGRAM_IDS),
  ...parseTelegramIdList(process.env.SUPERADMIN_ID),
]);

const DEFAULT_PROMO_ENTRIES = Array.from(
  new Set(
    String(process.env.DENTIST_PROMO_CODES || '')
      .split(',')
      .map((code) => String(code || '').trim().toUpperCase())
      .filter((code) => /^[A-Z0-9_-]{3,64}$/.test(code))
  )
).map((code) => ({ code, discountPercent: 100 }));

const { Pool } = pg;
let botDbPool = null;

const hasSupportedBotDatabase = () => /^postgres(ql)?:\/\//i.test(BOT_DATABASE_URL);

const getBotDbPool = () => {
  if (!hasSupportedBotDatabase()) return null;
  if (!botDbPool) {
    botDbPool = new Pool({ connectionString: BOT_DATABASE_URL });
  }
  return botDbPool;
};

app.use(cors());
app.use(express.json());

const normalizeUserId = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  if (normalized.length > 128) return null;
  if (!/^[A-Za-z0-9:_-]+$/.test(normalized)) return null;
  return normalized;
};

const normalizeProductId = (value) => (value === DENTIST_PRODUCT_ID ? value : null);

const normalizePromoCode = (value) => {
  const code = String(value || '').trim().toUpperCase();
  if (!code) return null;
  if (!/^[A-Z0-9_-]{3,64}$/.test(code)) return null;
  return code;
};

const normalizeDiscountPercent = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.round(parsed);
  if (rounded < 0 || rounded > 100) return null;
  return rounded;
};

const normalizePromoEntry = (entry) => {
  if (typeof entry === 'string') {
    const code = normalizePromoCode(entry);
    if (!code) return null;
    return { code, discountPercent: 100 };
  }

  if (!entry || typeof entry !== 'object') return null;
  const code = normalizePromoCode(entry.code);
  const discountPercent = normalizeDiscountPercent(
    entry.discountPercent ?? entry.discount ?? entry.percent
  );
  if (!code || discountPercent == null) return null;
  return { code, discountPercent };
};

const normalizePromoEntries = (entries) => {
  const normalized = (entries || [])
    .map((entry) => normalizePromoEntry(entry))
    .filter(Boolean);

  const seen = new Set();
  const unique = [];
  for (const entry of normalized) {
    if (seen.has(entry.code)) continue;
    seen.add(entry.code);
    unique.push(entry);
  }
  return unique;
};

const priceToCents = (value) => Math.round(Number(value) * 100);

const calculateDiscountedAmount = (discountPercent) => {
  const safeDiscountPercent = normalizeDiscountPercent(discountPercent) ?? 0;
  const baseCents = priceToCents(DENTIST_BASE_PRICE);
  const discountCents = Math.round((baseCents * safeDiscountPercent) / 100);
  const finalCents = Math.max(0, baseCents - discountCents);

  return {
    discountPercent: safeDiscountPercent,
    baseAmountValue: (baseCents / 100).toFixed(2),
    finalAmountValue: (finalCents / 100).toFixed(2),
    currency: DENTIST_CURRENCY,
  };
};

const extractTelegramId = (userId) => {
  const match = /^tg:(\d+)$/.exec(String(userId || ''));
  return match ? match[1] : null;
};

const isAdminUser = async (userId) => {
  const telegramId = extractTelegramId(userId);
  if (!telegramId) return false;
  if (ADMIN_TELEGRAM_IDS.has(telegramId)) return true;

  const pool = getBotDbPool();
  if (!pool) return false;

  try {
    const result = await pool.query(
      'SELECT is_root FROM users WHERE user_id = $1 LIMIT 1',
      [Number(telegramId)]
    );
    return Boolean(result.rows?.[0]?.is_root);
  } catch (error) {
    console.error('Failed to check admin rights in bot database:', error);
    return false;
  }
};

const getInitDataRaw = (req) => (req.method === 'GET' ? req.query?.initData : req.body?.initData);

const validateTelegramInitData = (initDataRaw) => {
  if (!TELEGRAM_BOT_TOKEN) {
    return { ok: false, status: 500, message: 'TELEGRAM_BOT_TOKEN is not configured' };
  }

  if (!initDataRaw || typeof initDataRaw !== 'string') {
    return { ok: false, status: 401, message: 'initData is required' };
  }

  const params = new URLSearchParams(initDataRaw);
  const receivedHash = params.get('hash');
  const authDateRaw = params.get('auth_date');
  const userRaw = params.get('user');

  if (!receivedHash || !authDateRaw || !userRaw) {
    return { ok: false, status: 401, message: 'initData is incomplete' };
  }

  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(TELEGRAM_BOT_TOKEN)
    .digest();

  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  const sameLength = calculatedHash.length === receivedHash.length;
  const hashIsValid = sameLength && crypto.timingSafeEqual(
    Buffer.from(calculatedHash, 'hex'),
    Buffer.from(receivedHash, 'hex')
  );

  if (!hashIsValid) {
    return { ok: false, status: 401, message: 'initData signature is invalid' };
  }

  const authDate = Number(authDateRaw);
  if (!Number.isFinite(authDate)) {
    return { ok: false, status: 401, message: 'auth_date is invalid' };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (TELEGRAM_INIT_DATA_MAX_AGE_SEC > 0 && nowSec - authDate > TELEGRAM_INIT_DATA_MAX_AGE_SEC) {
    return { ok: false, status: 401, message: 'initData is expired' };
  }

  let user;
  try {
    user = JSON.parse(userRaw);
  } catch {
    return { ok: false, status: 401, message: 'user payload is invalid' };
  }

  const telegramId = String(user?.id || '').trim();
  if (!telegramId || !/^\d+$/.test(telegramId)) {
    return { ok: false, status: 401, message: 'telegram user id is invalid' };
  }

  return { ok: true, userId: `tg:${telegramId}`, telegramId };
};

const getYooKassaAuthHeader = () => {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secretKey) return null;

  const credentials = Buffer.from(`${shopId}:${secretKey}`).toString('base64');
  return `Basic ${credentials}`;
};

const readJsonObject = async (filePath, fallback) => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(content);
    if (!parsed || typeof parsed !== 'object') return fallback;
    return parsed;
  } catch (error) {
    if (error && error.code === 'ENOENT') return fallback;
    throw error;
  }
};

const readPromoSettings = async () => {
  const parsed = await readJsonObject(PROMO_SETTINGS_FILE_PATH, null);
  if (!parsed) return null;

  if (Array.isArray(parsed.entries)) {
    return { entries: normalizePromoEntries(parsed.entries) };
  }
  if (Array.isArray(parsed.codes)) {
    return { entries: normalizePromoEntries(parsed.codes) };
  }
  return null;
};

const getPromoEntries = async () => {
  const promoSettings = await readPromoSettings();
  if (!promoSettings) return DEFAULT_PROMO_ENTRIES;
  return promoSettings.entries;
};

const findPromoEntryByCode = async (promoCode) => {
  const normalizedCode = normalizePromoCode(promoCode);
  if (!normalizedCode) return null;
  const entries = await getPromoEntries();
  return entries.find((entry) => entry.code === normalizedCode) || null;
};

const writePromoEntries = async (entries, changedByUserId) => {
  const normalizedEntries = normalizePromoEntries(entries);
  await fs.mkdir(path.dirname(PROMO_SETTINGS_FILE_PATH), { recursive: true });
  await fs.writeFile(
    PROMO_SETTINGS_FILE_PATH,
    JSON.stringify(
      {
        entries: normalizedEntries,
        changedAt: new Date().toISOString(),
        changedBy: changedByUserId || null,
      },
      null,
      2
    ),
    'utf8'
  );
  return normalizedEntries;
};

const readEntitlements = async () => readJsonObject(ENTITLEMENTS_FILE_PATH, {});

const writeEntitlements = async (entitlements) => {
  await fs.mkdir(path.dirname(ENTITLEMENTS_FILE_PATH), { recursive: true });
  await fs.writeFile(ENTITLEMENTS_FILE_PATH, JSON.stringify(entitlements, null, 2), 'utf8');
};

const grantEntitlement = async ({ userId, productId, paymentId, source }) => {
  const entitlements = await readEntitlements();
  if (!entitlements[userId]) entitlements[userId] = {};
  entitlements[userId][productId] = {
    grantedAt: new Date().toISOString(),
    paymentId: paymentId || null,
    source: source || 'payment',
  };
  await writeEntitlements(entitlements);
};

const hasEntitlement = async ({ userId, productId }) => {
  const entitlements = await readEntitlements();
  return Boolean(entitlements[userId]?.[productId]);
};

const fetchPaymentFromYooKassa = async (paymentId, authHeader) => {
  const response = await fetch(`${YOOKASSA_API_URL}/payments/${paymentId}`, {
    headers: { Authorization: authHeader },
  });
  const responseBody = await response.json();
  return { response, responseBody };
};

const paymentMatchesDentistProduct = (payment, userId) => {
  const metadata = payment?.metadata || {};
  const amount = payment?.amount || {};
  const expectedAmount = String(metadata.expected_amount_value || '').trim() || DENTIST_BASE_PRICE.toFixed(2);

  return (
    metadata.product_id === DENTIST_PRODUCT_ID &&
    metadata.user_id === userId &&
    amount.value === expectedAmount &&
    amount.currency === DENTIST_CURRENCY
  );
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.get('/api/access', async (req, res) => {
  try {
    const userId = normalizeUserId(req.query.userId);
    const productId = normalizeProductId(req.query.productId);

    if (!userId || !productId) {
      return res.status(400).json({ ok: false, message: 'Invalid userId or productId' });
    }

    const unlocked = await hasEntitlement({ userId, productId });
    return res.json({ ok: true, unlocked });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'Failed to check access',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get('/api/admin/status', async (req, res) => {
  const auth = validateTelegramInitData(getInitDataRaw(req));
  if (!auth.ok) {
    return res.status(auth.status).json({ ok: false, message: auth.message });
  }

  return res.json({ ok: true, isAdmin: await isAdminUser(auth.userId) });
});

app.get('/api/admin/promo-codes', async (req, res) => {
  try {
    const auth = validateTelegramInitData(getInitDataRaw(req));
    if (!auth.ok) {
      return res.status(auth.status).json({ ok: false, message: auth.message });
    }
    if (!(await isAdminUser(auth.userId))) {
      return res.status(403).json({ ok: false, message: 'Forbidden' });
    }

    const entries = await getPromoEntries();
    return res.json({ ok: true, entries });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'Failed to load promo codes',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post('/api/admin/promo-codes', async (req, res) => {
  try {
    const auth = validateTelegramInitData(getInitDataRaw(req));
    if (!auth.ok) {
      return res.status(auth.status).json({ ok: false, message: auth.message });
    }
    if (!(await isAdminUser(auth.userId))) {
      return res.status(403).json({ ok: false, message: 'Forbidden' });
    }

    let rawEntries = [];
    if (Array.isArray(req.body?.entries)) {
      rawEntries = req.body.entries;
    } else if (Array.isArray(req.body?.codes)) {
      rawEntries = req.body.codes;
    } else if (typeof req.body?.codes === 'string') {
      rawEntries = String(req.body.codes)
        .split(/[\n,;\s]+/)
        .filter(Boolean);
    }

    const savedEntries = await writePromoEntries(rawEntries, auth.userId);
    return res.json({ ok: true, entries: savedEntries });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'Не удалось обновить промокоды',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post('/api/promos/apply', async (req, res) => {
  try {
    const userId = normalizeUserId(req.body?.userId);
    const productId = normalizeProductId(req.body?.productId);
    const promoCode = String(req.body?.code || '').trim().toUpperCase();
    const promoEntry = await findPromoEntryByCode(promoCode);

    if (!userId || !productId) {
      return res.status(400).json({ ok: false, message: 'Некорректный userId или productId' });
    }

    if (!promoCode || !promoEntry) {
      return res.status(400).json({ ok: false, message: 'Промокод недействителен' });
    }

    const pricing = calculateDiscountedAmount(promoEntry.discountPercent);

    if (pricing.finalAmountValue === '0.00') {
      await grantEntitlement({
        userId,
        productId,
        paymentId: null,
        source: `promo:${promoEntry.code}`,
      });

      return res.json({
        ok: true,
        message: 'Промокод применён',
        unlocksAccess: true,
        promo: promoEntry,
        pricing,
      });
    }

    return res.json({
      ok: true,
      message: `Промокод применён: скидка ${pricing.discountPercent}%`,
      unlocksAccess: false,
      promo: promoEntry,
      pricing,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'Не удалось применить промокод',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post('/api/payments/create', async (req, res) => {
  const authHeader = getYooKassaAuthHeader();
  if (!authHeader) {
    return res.status(500).json({
      ok: false,
      message: 'YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY are required',
    });
  }

  const productId = normalizeProductId(req.body?.productId);
  const userId = normalizeUserId(req.body?.userId);
  const promoCode = String(req.body?.promoCode || '').trim().toUpperCase();

  if (!productId || !userId) {
    return res.status(400).json({ ok: false, message: 'Некорректный userId или productId' });
  }

  let promoEntry = null;
  if (promoCode) {
    promoEntry = await findPromoEntryByCode(promoCode);
    if (!promoEntry) {
      return res.status(400).json({ ok: false, message: 'Промокод недействителен' });
    }
  }

  const pricing = calculateDiscountedAmount(promoEntry?.discountPercent ?? 0);
  if (pricing.finalAmountValue === '0.00') {
    await grantEntitlement({
      userId,
      productId,
      paymentId: null,
      source: promoEntry ? `promo:${promoEntry.code}` : 'payment',
    });

    return res.json({
      ok: true,
      paymentId: null,
      status: 'succeeded',
      confirmationUrl: null,
      paid: false,
      unlocked: true,
      pricing,
    });
  }

  const returnUrl = req.body?.returnUrl || DEFAULT_RETURN_URL;

  const payload = {
    amount: { value: pricing.finalAmountValue, currency: DENTIST_CURRENCY },
    capture: true,
    confirmation: {
      type: 'redirect',
      return_url: returnUrl,
    },
    description: DENTIST_PAYMENT_DESCRIPTION,
    metadata: {
      product_id: DENTIST_PRODUCT_ID,
      user_id: userId,
      expected_amount_value: pricing.finalAmountValue,
      promo_code: promoEntry?.code || '',
      discount_percent: String(pricing.discountPercent),
    },
  };

  try {
    const response = await fetch(`${YOOKASSA_API_URL}/payments`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        'Idempotence-Key': crypto.randomUUID(),
      },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        message: responseBody?.description || 'YooKassa create payment failed',
        details: responseBody,
      });
    }

    return res.json({
      ok: true,
      paymentId: responseBody.id,
      status: responseBody.status,
      confirmationUrl: responseBody.confirmation?.confirmation_url,
      paid: responseBody.paid,
      pricing,
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      message: 'YooKassa request failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get('/api/payments/:paymentId', async (req, res) => {
  const authHeader = getYooKassaAuthHeader();
  if (!authHeader) {
    return res.status(500).json({
      ok: false,
      message: 'YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY are required',
    });
  }

  const paymentId = String(req.params.paymentId || '').trim();
  const userId = normalizeUserId(req.query.userId);
  const productId = normalizeProductId(req.query.productId);

  if (!paymentId || !userId || !productId) {
    return res.status(400).json({ ok: false, message: 'Invalid paymentId, userId or productId' });
  }

  try {
    const { response, responseBody } = await fetchPaymentFromYooKassa(paymentId, authHeader);

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        message: responseBody?.description || 'YooKassa payment status request failed',
        details: responseBody,
      });
    }

    const paymentStatus = responseBody.status;
    const isAllowedFinalStatus = paymentStatus === 'succeeded' || paymentStatus === 'waiting_for_capture';
    const isProductValid = paymentMatchesDentistProduct(responseBody, userId);

    let unlocked = await hasEntitlement({ userId, productId });

    if (!unlocked && isAllowedFinalStatus && isProductValid) {
      await grantEntitlement({
        userId,
        productId,
        paymentId: responseBody.id,
        source: 'payment',
      });
      unlocked = true;
    }

    return res.json({
      ok: true,
      paymentId: responseBody.id,
      status: paymentStatus,
      paid: responseBody.paid,
      unlocked,
      validation: {
        isProductValid,
        expectedAmount: String(responseBody?.metadata?.expected_amount_value || DENTIST_BASE_PRICE.toFixed(2)),
        actualAmount: responseBody?.amount?.value,
        expectedCurrency: DENTIST_CURRENCY,
        actualCurrency: responseBody?.amount?.currency,
      },
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      message: 'YooKassa request failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
