// webapp/src/App.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Welcome from './components/Welcome'
import Home from './pages/Home'
import Adaptation from './pages/Adaptation'
import AdaptationBlood from './pages/AdaptationBlood'
import Recommendations from './pages/Recommendations'
import Story from './pages/Story'
import PaySheetDentist from './components/PaySheetDentist'
import AppWindow from './components/AppWindow'
import AdminPromoPage from './pages/AdminPromoPage'

import StoryDentist from './pages/StoryDentist'
import GameLinkDentist from './pages/GameLinkDentist'
import RecommendationsDentist from './pages/RecommendationsDentist'

import { DENTIST_PRICE, DENTIST_PRODUCT_ID } from './data/dentistConfig'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '')
).replace(/\/+$/, '')
const PAYMENT_POLL_INTERVAL_MS = 2500
const PAYMENT_POLL_TIMEOUT_MS = 180000
const LOCAL_USER_STORAGE_KEY = 'miniapp-user-id-v1'
const PENDING_PAYMENT_STORAGE_KEY = 'miniapp-pending-payment-v1'
const PENDING_PAYMENT_MAX_AGE_MS = 24 * 60 * 60 * 1000
let runtimeUserId = ''

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))
const parsePriceValue = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : DENTIST_PRICE
}

const safeRandomUuid = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `fallback-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const readLocalUserId = () => {
  try {
    return window.localStorage.getItem(LOCAL_USER_STORAGE_KEY)
  } catch {
    return ''
  }
}

const writeLocalUserId = (userId) => {
  try {
    window.localStorage.setItem(LOCAL_USER_STORAGE_KEY, userId)
  } catch {
    // Telegram WebView or private browsing can block storage; keep runtime id for this session.
  }
}

const readPendingPayment = () => {
  try {
    const rawValue = window.localStorage.getItem(PENDING_PAYMENT_STORAGE_KEY)
    if (!rawValue) return null

    const parsed = JSON.parse(rawValue)
    const paymentId = String(parsed?.paymentId || '').trim()
    const userId = String(parsed?.userId || '').trim()
    const productId = String(parsed?.productId || '').trim()
    const createdAt = Number(parsed?.createdAt || 0)

    if (!paymentId || !userId || !productId || !Number.isFinite(createdAt)) {
      window.localStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY)
      return null
    }
    if (Date.now() - createdAt > PENDING_PAYMENT_MAX_AGE_MS) {
      window.localStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY)
      return null
    }

    return { paymentId, userId, productId, createdAt }
  } catch {
    try {
      window.localStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY)
    } catch {
      // Ignore storage cleanup failures.
    }
    return null
  }
}

const writePendingPayment = ({ paymentId, userId, productId }) => {
  try {
    window.localStorage.setItem(
      PENDING_PAYMENT_STORAGE_KEY,
      JSON.stringify({
        paymentId,
        userId,
        productId,
        createdAt: Date.now(),
      })
    )
  } catch {
    // Payment polling still runs in this session if storage is unavailable.
  }
}

const clearPendingPayment = (paymentId = null) => {
  try {
    const pendingPayment = readPendingPayment()
    if (paymentId && pendingPayment?.paymentId !== paymentId) return
    window.localStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY)
  } catch {
    // No recovery is needed if storage cleanup is unavailable.
  }
}

const resolveMiniAppUserId = () => {
  const telegramUserId = window?.Telegram?.WebApp?.initDataUnsafe?.user?.id
  if (telegramUserId != null) {
    return `tg:${telegramUserId}`
  }

  const existing = readLocalUserId()
  if (existing) return existing

  if (!runtimeUserId) runtimeUserId = `web:${safeRandomUuid()}`
  writeLocalUserId(runtimeUserId)
  return runtimeUserId
}

const resolveTelegramInitData = () => {
  const direct = window?.Telegram?.WebApp?.initData
  if (direct) return direct

  const rawHash = window?.location?.hash || ''
  const hash = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash
  if (!hash) return ''

  const params = new URLSearchParams(hash)
  const fromHash = params.get('tgWebAppData')
  if (!fromHash) return ''

  try {
    return decodeURIComponent(fromHash)
  } catch {
    return fromHash
  }
}

const openPaymentPage = (url) => {
  const telegramWebApp = window?.Telegram?.WebApp
  const isIosWebView =
    telegramWebApp?.platform === 'ios' ||
    /iP(ad|hone|od)/.test(window.navigator?.userAgent || '')

  if (isIosWebView) {
    window.location.assign(url)
    return
  }

  if (telegramWebApp?.openLink) {
    telegramWebApp.openLink(url)
    return
  }

  const paymentWindow = window.open(url, '_blank', 'noopener,noreferrer')
  if (!paymentWindow) window.location.assign(url)
}

const waitForPaymentResult = async ({ paymentId, userId, productId }) => {
  const startedAt = Date.now()

  while (Date.now() - startedAt < PAYMENT_POLL_TIMEOUT_MS) {
    await sleep(PAYMENT_POLL_INTERVAL_MS)
    const response = await fetch(
      `${API_BASE_URL}/api/payments/${paymentId}?userId=${encodeURIComponent(userId)}&productId=${encodeURIComponent(productId)}`
    )
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return { ok: false, message: data.message || 'Ошибка проверки статуса оплаты' }
    }

    if (data.unlocked) {
      return { ok: true, message: 'Оплата прошла успешно' }
    }

    if (data.status === 'canceled') {
      return { ok: false, message: 'Оплата отменена или не прошла' }
    }
  }

  return { ok: false, message: 'Не удалось дождаться подтверждения оплаты' }
}

export default function App() {
  const [route, setRoute] = useState('welcome')
  const [isDentistPayOpen, setIsDentistPayOpen] = useState(false)
  const [dentistUnlocked, setDentistUnlocked] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activePromo, setActivePromo] = useState(null)
  const currentUserId = useMemo(() => resolveMiniAppUserId(), [])

  const [toastVisible, setToastVisible] = useState(false)
  const [toastPhase, setToastPhase] = useState('hidden')
  const toastHideTimerRef = useRef(null)
  const toastUnmountTimerRef = useRef(null)
  const pendingPaymentCheckRef = useRef(false)
  const telegramInitDataRaw = useMemo(() => resolveTelegramInitData(), [])

  const clearToastTimers = useCallback(() => {
    if (toastHideTimerRef.current) window.clearTimeout(toastHideTimerRef.current)
    if (toastUnmountTimerRef.current) window.clearTimeout(toastUnmountTimerRef.current)
  }, [])

  const showSuccessToast = useCallback(() => {
    clearToastTimers()
    setToastVisible(true)
    setToastPhase('enter')
    toastHideTimerRef.current = window.setTimeout(() => setToastPhase('exit'), 3400)
    toastUnmountTimerRef.current = window.setTimeout(() => {
      setToastVisible(false)
      setToastPhase('hidden')
    }, 4100)
  }, [clearToastTimers])

  const unlockDentist = useCallback(() => {
    setDentistUnlocked(true)
    setIsDentistPayOpen(false)
    setActivePromo(null)
    showSuccessToast()
  }, [showSuccessToast])

  useEffect(() => clearToastTimers, [clearToastTimers])

  const restorePendingPayment = useCallback(async () => {
    if (!API_BASE_URL || pendingPaymentCheckRef.current) return

    const pendingPayment = readPendingPayment()
    if (!pendingPayment) return

    pendingPaymentCheckRef.current = true
    try {
      const paymentResult = await waitForPaymentResult(pendingPayment)
      if (paymentResult.ok) {
        clearPendingPayment(pendingPayment.paymentId)
        if (
          pendingPayment.userId === currentUserId &&
          pendingPayment.productId === DENTIST_PRODUCT_ID
        ) {
          unlockDentist()
        }
        return
      }

      if (paymentResult.message === 'Оплата отменена или не прошла') {
        clearPendingPayment(pendingPayment.paymentId)
      }
    } finally {
      pendingPaymentCheckRef.current = false
    }
  }, [currentUserId, unlockDentist])

  useEffect(() => {
    restorePendingPayment()

    const handleFocus = () => restorePendingPayment()
    const handleVisibilityChange = () => {
      if (!document.hidden) restorePendingPayment()
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [restorePendingPayment])

  useEffect(() => {
    if (!API_BASE_URL || !currentUserId) return

    const controller = new AbortController()
    const loadContext = async () => {
      try {
        const userId = currentUserId

        const accessResponse = await fetch(
          `${API_BASE_URL}/api/access?userId=${encodeURIComponent(userId)}&productId=${encodeURIComponent(DENTIST_PRODUCT_ID)}`,
          { signal: controller.signal }
        )
        const accessData = await accessResponse.json().catch(() => ({}))
        if (accessResponse.ok && accessData.unlocked) {
          setDentistUnlocked(true)
        }

        if (telegramInitDataRaw) {
          const adminResponse = await fetch(
            `${API_BASE_URL}/api/admin/status?initData=${encodeURIComponent(telegramInitDataRaw)}`,
            { signal: controller.signal }
          )
          const adminData = await adminResponse.json().catch(() => ({}))
          if (adminResponse.ok && adminData.ok) {
            setIsAdmin(Boolean(adminData.isAdmin))
          } else {
            setIsAdmin(false)
          }
        }
      } catch {
        // Context precheck is best-effort and should not block app start.
      }
    }

    loadContext()
    return () => controller.abort()
  }, [currentUserId, telegramInitDataRaw, unlockDentist])

  const navigate = (to) => setRoute(to)

  const renderRoute = () => {
    if (route === 'home') {
      return (
        <Home
          onNavigate={navigate}
          onOpenDentistPay={() => setIsDentistPayOpen(true)}
          dentistUnlocked={dentistUnlocked}
          isAdmin={isAdmin}
          onOpenAdmin={() => setRoute('admin-promos')}
        />
      )
    }

    if (route === 'adaptation') {
      return <AdaptationBlood onNavigate={navigate} onBack={() => setRoute('home')} />
    }

    if (route === 'adaptation-dentist') {
      return <Adaptation onNavigate={navigate} onBack={() => setRoute('home')} />
    }

    if (route === 'story') return <Story onBack={() => setRoute('adaptation')} />
    if (route === 'info') return <Recommendations onBack={() => setRoute('adaptation')} />

    if (route === 'admin-promos') {
      return (
        <AdminPromoPage
          onBack={() => setRoute('home')}
          apiBaseUrl={API_BASE_URL}
          initDataRaw={telegramInitDataRaw}
        />
      )
    }

    if (route === 'story-dentist') return <StoryDentist onBack={() => setRoute('adaptation-dentist')} />
    if (route === 'game-dentist') return <GameLinkDentist onBack={() => setRoute('adaptation-dentist')} />
    if (route === 'recommendations-dentist') return <RecommendationsDentist onBack={() => setRoute('adaptation-dentist')} />

    return null
  }

  const handlePromoApply = async (code) => {
    if (!API_BASE_URL) {
      return { ok: false, message: 'Не задан VITE_API_BASE_URL для проверки промокода' }
    }
    if (!currentUserId) {
      return { ok: false, message: 'Не удалось определить пользователя' }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/promos/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          userId: currentUserId,
          productId: DENTIST_PRODUCT_ID,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.ok) {
        return { ok: false, message: data.message || 'Промокод не подошёл' }
      }

      if (data.unlocksAccess) {
        setActivePromo(null)
        return { ok: true, unlocksAccess: true, message: data.message || 'Промокод принят' }
      }

      const nextPromo = {
        code: String(data?.promo?.code || code || '').trim().toUpperCase(),
        discountPercent: Number(data?.pricing?.discountPercent ?? data?.promo?.discountPercent ?? 0),
        finalAmountValue: String(data?.pricing?.finalAmountValue || ''),
      }
      setActivePromo(nextPromo)

      return {
        ok: true,
        unlocksAccess: false,
        message: data.message || `Промокод принят: скидка ${nextPromo.discountPercent}%`,
      }
    } catch {
      return { ok: false, message: 'Ошибка соединения с сервером промокодов' }
    }
  }

  const handleFuturePay = async () => {
    if (!API_BASE_URL) {
      return { ok: false, message: 'Не задан VITE_API_BASE_URL для оплаты' }
    }
    if (!currentUserId) {
      return { ok: false, message: 'Не удалось определить пользователя' }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/payments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: DENTIST_PRODUCT_ID,
          userId: currentUserId,
          returnUrl: window.location.href,
          promoCode: activePromo?.code || '',
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        return { ok: false, message: data.message || 'Не удалось создать платеж' }
      }

      if (data.unlocked) {
        setActivePromo(null)
        return { ok: true, message: 'Оплата прошла успешно' }
      }

      if (!data.confirmationUrl || !data.paymentId) {
        return { ok: false, message: data.message || 'Не удалось создать платеж' }
      }

      writePendingPayment({
        paymentId: data.paymentId,
        userId: currentUserId,
        productId: DENTIST_PRODUCT_ID,
      })
      openPaymentPage(data.confirmationUrl)
      const paymentResult = await waitForPaymentResult({
        paymentId: data.paymentId,
        userId: currentUserId,
        productId: DENTIST_PRODUCT_ID,
      })

      if (paymentResult.ok) {
        clearPendingPayment(data.paymentId)
        setActivePromo(null)
      } else if (paymentResult.message === 'Оплата отменена или не прошла') {
        clearPendingPayment(data.paymentId)
      }
      return paymentResult
    } catch {
      return { ok: false, message: 'Ошибка соединения с сервером оплаты' }
    }
  }

  if (route === 'welcome') {
    return <Welcome onFinish={() => setRoute('home')} duration={4000} flyDuration={2000} />
  }

  return (
    <>
      <div className="min-h-screen w-full bg-white">
        <AnimatePresence mode="wait">
          <AppWindow key={route}>
            {renderRoute()}
          </AppWindow>
        </AnimatePresence>

        <PaySheetDentist
          isOpen={isDentistPayOpen}
          price={parsePriceValue(activePromo?.finalAmountValue)}
          onClose={() => setIsDentistPayOpen(false)}
          onApplyPromo={handlePromoApply}
          onPay={handleFuturePay}
          onSuccess={unlockDentist}
        />
      </div>

      {toastVisible && (
        <div
          className="fixed left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-sm ring-1 ring-emerald-200"
          style={{
            top: '16px',
            animation: toastPhase === 'enter'
              ? 'dentistToastIn 260ms cubic-bezier(0.22, 1, 0.36, 1) both'
              : 'dentistToastOut 700ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
          }}
          aria-live="polite"
        >
          Куплено. Доступ открыт
        </div>
      )}

      <style>{`
        @keyframes dentistToastIn {
          from { transform: translate3d(-50%, -12px, 0); opacity: 0; }
          to { transform: translate3d(-50%, 0, 0); opacity: 1; }
        }
        @keyframes dentistToastOut {
          0% { transform: translate3d(-50%, 0, 0); opacity: 1; }
          100% { transform: translate3d(-50%, -12px, 0); opacity: 0; }
        }
      `}</style>
    </>
  )
}
