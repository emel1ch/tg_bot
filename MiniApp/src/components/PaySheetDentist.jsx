import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DENTIST_PRICE } from '../data/dentistConfig'

function CheckIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function PaySheetDentist({
  isOpen,
  price = DENTIST_PRICE,
  onClose,
  onApplyPromo,
  onPay,
  onSuccess,
}) {
  const [promoCode, setPromoCode] = useState('')
  const [status, setStatus] = useState('')
  const [statusType, setStatusType] = useState('')
  const [translateY, setTranslateY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  const dragRef = useRef({
    startY: 0,
    deltaY: 0,
  })

  const closeTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  const resetLocalState = () => {
    setPromoCode('')
    setStatus('')
    setStatusType('')
    setTranslateY(0)
    setIsDragging(false)
    setIsClosing(false)
  }

  const requestClose = () => {
    if (isClosing) return

    setIsClosing(true)
    setIsDragging(false)
    setTranslateY(0)

    closeTimerRef.current = window.setTimeout(() => {
      resetLocalState()
      onClose?.()
    }, 220)
  }

  const handleClose = () => {
    requestClose()
  }

  const handleSuccess = (message) => {
    setStatus(message || '')
    setStatusType('success')
    onSuccess?.()
    requestClose()
  }

  const handleApplyPromo = async () => {
    try {
      const result = await Promise.resolve(
        onApplyPromo?.(promoCode) ?? {
          ok: false,
          message: 'Промокод не подошёл',
        }
      )

      setStatus(result.message || '')
      setStatusType(result.ok ? 'success' : 'error')

      if (result.ok) {
        setPromoCode('')
        handleSuccess(result.message || 'Промокод принят')
      }
    } catch {
      setStatus('Промокод не подошёл')
      setStatusType('error')
    }
  }

  const handlePromoSubmit = async (e) => {
    e.preventDefault()
    await handleApplyPromo()
  }

  const handlePay = async () => {
    try {
      const result = await Promise.resolve(
        onPay?.() ?? { ok: true, message: 'Оплата прошла успешно' }
      )

      if (result && result.ok === false) {
        setStatus(result.message || 'Оплата не прошла')
        setStatusType('error')
        return
      }

      handleSuccess(result?.message || 'Оплата прошла успешно')
    } catch {
      setStatus('Оплата не прошла')
      setStatusType('error')
    }
  }

  const handlePointerDown = (e) => {
    if (isClosing) return
    if (e.button != null && e.button !== 0) return

    const target = e.target
    if (target instanceof Element) {
      if (target.closest('input, button, textarea, select, option, a')) return
    }

    setIsDragging(true)
    dragRef.current.startY = e.clientY
    dragRef.current.deltaY = 0

    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // no-op
    }
  }

  const handlePointerMove = (e) => {
    if (!isDragging) return

    const deltaY = Math.max(0, e.clientY - dragRef.current.startY)
    dragRef.current.deltaY = deltaY
    setTranslateY(deltaY)
  }

  const handlePointerUp = () => {
    if (!isDragging) return

    setIsDragging(false)

    if (dragRef.current.deltaY > 110) {
      requestClose()
      return
    }

    setTranslateY(0)
  }

  if (!isOpen) return null
  if (typeof document === 'undefined') return null

  const courseItems = [
    'Социальная история',
    'Онлайн-игра',
    'Мультфильм',
    'Методические рекомендации',
  ]

  const panelTransform = isClosing
    ? 'translateY(calc(100% + 24px))'
    : `translateY(${translateY}px)`

  return createPortal(
    <div
      className="fixed inset-0 z-99999 flex items-end justify-center bg-black/40"
      onClick={handleClose}
    >
      <div
        className={`relative z-10 w-full max-w-md rounded-t-4xl bg-white px-5 pb-5 pt-3 shadow-[0_-12px_40px_rgba(15,23,42,0.18)] ${
          isDragging ? 'transition-none' : 'transition-transform duration-300 ease-out'
        }`}
        style={{
          transform: panelTransform,
          touchAction: 'none',
        }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />

        <h2 className="text-[26px] font-bold tracking-tight text-slate-900">
          Покупка доступа
        </h2>
        <p className="mt-1 text-sm text-slate-500">Поход к стоматологу</p>

        <div className="mt-5 rounded-3xl bg-teal-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-slate-600">Стоимость курса</span>
            <span className="text-xl font-bold text-primary">{price} ₽</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Единоразовая оплата. Доступ навсегда.
          </div>
        </div>

        <div className="mt-5">
          <div className="text-sm font-semibold text-slate-900">
            Что входит в курс:
          </div>

          <ul className="mt-3 space-y-2">
            {courseItems.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-sm text-slate-700"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary bg-transparent">
                  <CheckIcon className="h-3.5 w-3.5 text-primary" />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={handlePromoSubmit} className="mt-5">
          <div className="flex items-center gap-2 rounded-2xl bg-teal-50 p-2">
            <input
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="Введите промокод"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-xl border border-transparent bg-transparent px-3 py-3 text-sm outline-none placeholder:text-slate-400"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white transition active:scale-[0.98]"
            >
              Применить
            </button>
          </div>
        </form>

        {status ? (
          <p
            className={`mt-2 text-sm ${
              statusType === 'error' ? 'text-red-500' : 'text-emerald-600'
            }`}
          >
            {status}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handlePay}
          className="mt-5 w-full rounded-2xl bg-primary px-5 py-4 text-base font-medium text-white transition active:scale-[0.99]"
        >
          Оплатить {price} ₽
        </button>
      </div>
    </div>,
    document.body
  )
}