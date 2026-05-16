// webapp/src/App.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Welcome from './components/Welcome'
import Home from './pages/Home'
import Adaptation from './pages/Adaptation'
import AdaptationBlood from './pages/AdaptationBlood'
import Recommendations from './pages/Recommendations'
import Story from './pages/Story'
import PaySheetDentist from './components/PaySheetDentist'
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

const resolveMiniAppUserId = () => {
  const telegramUserId = window?.Telegram?.WebApp?.initDataUnsafe?.user?.id
  if (telegramUserId != null) {
    return `tg:${telegramUserId}`
  }

  const existing = window.localStorage.getItem(LOCAL_USER_STORAGE_KEY)
  if (existing) return existing

  const generated = `web:${safeRandomUuid()}`
  window.localStorage.setItem(LOCAL_USER_STORAGE_KEY, generated)
  return generated
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

      openPaymentPage(data.confirmationUrl)
      const paymentResult = await waitForPaymentResult({
        paymentId: data.paymentId,
        userId: currentUserId,
        productId: DENTIST_PRODUCT_ID,
      })

      if (paymentResult.ok) setActivePromo(null)
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
        {route === 'home' && (
          <Home
            onNavigate={navigate}
            onOpenDentistPay={() => setIsDentistPayOpen(true)}
            dentistUnlocked={dentistUnlocked}
            isAdmin={isAdmin}
            onOpenAdmin={() => setRoute('admin-promos')}
          />
        )}

        {route === 'adaptation' && (
          <AdaptationBlood onNavigate={navigate} onBack={() => setRoute('home')} />
        )}

        {route === 'adaptation-dentist' && (
          <Adaptation onNavigate={navigate} onBack={() => setRoute('home')} />
        )}

        {route === 'story' && <Story onBack={() => setRoute('adaptation')} />}
        {route === 'info' && <Recommendations onBack={() => setRoute('adaptation')} />}
        {route === 'admin-promos' && (
          <AdminPromoPage
            onBack={() => setRoute('home')}
            apiBaseUrl={API_BASE_URL}
            initDataRaw={telegramInitDataRaw}
          />
        )}
        {route === 'story-dentist' && <StoryDentist onBack={() => setRoute('adaptation-dentist')} />}
        {route === 'game-dentist' && <GameLinkDentist onBack={() => setRoute('adaptation-dentist')} />}
        {route === 'recommendations-dentist' && <RecommendationsDentist onBack={() => setRoute('adaptation-dentist')} />}

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
