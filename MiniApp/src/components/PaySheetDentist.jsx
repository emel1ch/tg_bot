// src/components/PaySheetDentist.jsx
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DENTIST_PRICE } from '../data/dentistConfig'

const SHEET_ANIMATION_MS = 260

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
  const [isVisible, setIsVisible] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [isPaying, setIsPaying] = useState(false)

  const dragRef = useRef({
    startY: 0,
    deltaY: 0,
  })

  const closeTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return undefined

    const frame = window.requestAnimationFrame(() => setIsVisible(true))
    return () => window.cancelAnimationFrame(frame)
  }, [isOpen])

  const resetLocalState = () => {
    setPromoCode('')
    setStatus('')
    setStatusType('')
    setTranslateY(0)
    setIsDragging(false)
    setIsVisible(false)
    setIsClosing(false)
    setIsPaying(false)
  }

  const requestClose = (afterClose) => {
    if (isClosing) return
    setIsClosing(true)
    setIsVisible(false)
    setIsDragging(false)
    setTranslateY(0)
    closeTimerRef.current = window.setTimeout(() => {
      resetLocalState()
      onClose?.()
      afterClose?.()
    }, SHEET_ANIMATION_MS)
  }

  const handleClose = () => requestClose()
  const handleSuccess = (message) => {
    setStatus(message || '')
    setStatusType('success')
    requestClose(() => onSuccess?.())
  }

  const handleApplyPromo = async () => {
    try {
      const result = await Promise.resolve(
        onApplyPromo?.(promoCode) ?? { ok: false, message: 'Промокод не подошёл' }
      )
      setStatus(result.message || '')
      setStatusType(result.ok ? 'success' : 'error')
      if (result.ok) {
        setPromoCode('')
        if (result.unlocksAccess) {
          handleSuccess(result.message || 'Промокод принят')
        }
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
    if (isPaying) return
    setIsPaying(true)
    try {
      const result = await Promise.resolve(onPay?.() ?? { ok: true, message: 'Оплата прошла успешно' })
      if (result && result.ok === false) {
        setStatus(result.message || 'Оплата не прошла')
        setStatusType('error')
        return
      }
      handleSuccess(result?.message || 'Оплата прошла успешно')
    } catch {
      setStatus('Оплата не прошла')
      setStatusType('error')
    } finally {
      setIsPaying(false)
    }
  }

  const handlePointerDown = (e) => {
    if (isClosing) return
    if (e.button != null && e.button !== 0) return
    const target = e.target
    if (target instanceof Element && target.closest('input, button, textarea, select, option, a')) return
    setIsDragging(true)
    dragRef.current.startY = e.clientY
    dragRef.current.deltaY = 0
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore unsupported pointer capture */ }
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
    if (dragRef.current.deltaY > 110) requestClose()
    else setTranslateY(0)
  }

  if (!isOpen) return null
  if (typeof document === 'undefined') return null

  const courseItems = [
    'Социальная история',
    'Онлайн-игра "Иду к стоматологу"',
    'Мультфильм "Иду к стоматологу"',
    'Методические рекомендации для родителей',
  ]

  const panelTransform = isClosing || !isVisible
    ? 'translateY(calc(100% + 24px))'
    : `translateY(${translateY}px)`

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-end justify-center bg-black/40 transition-opacity ease-out"
      style={{
        opacity: isVisible && !isClosing ? 1 : 0,
        transitionDuration: `${SHEET_ANIMATION_MS}ms`,
      }}
      onClick={handleClose}
    >
      <div
        className={`relative z-10 w-full max-w-md rounded-t-4xl bg-white px-5 pb-5 pt-3 shadow-[0_-12px_40px_rgba(15,23,42,0.18)] ${
          isDragging ? 'transition-none' : 'transition-transform ease-out'
        }`}
        style={{
          transform: panelTransform,
          transitionDuration: `${SHEET_ANIMATION_MS}ms`,
          touchAction: 'none',
          willChange: 'transform',
        }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />

        <h2 className="text-[26px] font-bold tracking-tight text-slate-900">Покупка доступа</h2>
        <p className="mt-1 text-sm text-slate-500">Поход к стоматологу</p>

        <div className="mt-5 rounded-3xl bg-[#E0F7FA] p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-slate-600">Стоимость курса</span>
            <span className="text-xl font-bold text-[#18C6C8]">{price} ₽</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">Единоразовая оплата. Доступ навсегда.</div>
        </div>

        <div className="mt-5">
          <div className="text-sm font-semibold text-slate-900">Что входит в курс:</div>
          <ul className="mt-3 space-y-2">
            {courseItems.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#18C6C8] bg-transparent">
                  <CheckIcon className="h-3.5 w-3.5 text-[#18C6C8]" />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Поле промокода и кнопка "Применить" */}
        <form onSubmit={handlePromoSubmit} className="mt-5">
          <div className="flex items-center gap-2 rounded-2xl bg-[#E0F7FA] p-2">
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
              className="shrink-0 rounded-xl bg-[#18C6C8] px-4 py-3 text-sm font-medium text-white transition active:scale-[0.98]"
            >
              Применить
            </button>
          </div>
        </form>

        {status ? (
          <p className={`mt-2 text-sm ${statusType === 'error' ? 'text-red-500' : 'text-emerald-600'}`}>
            {status}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handlePay}
          disabled={isPaying}
          className="mt-5 w-full rounded-2xl bg-[#18C6C8] px-5 py-4 text-base font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-70 active:scale-[0.99]"
        >
          {isPaying ? 'Обработка...' : `Оплатить ${price} ₽`}
        </button>
      </div>
    </div>,
    document.body
  )
}
