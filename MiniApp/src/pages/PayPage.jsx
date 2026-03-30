import React, { useState } from 'react'

export default function PayPage({ onBack }) {
  const [loading, setLoading] = useState(false)

  const handlePay = async () => {
    try {
      setLoading(true)

      const resp = await fetch('http://localhost:3000/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: '500.00',
          description: 'Стоматолог — консультация',
        }),
      })

      const data = await resp.json()

      if (data.confirmation?.confirmation_url) {
        window.open(data.confirmation.confirmation_url, '_blank', 'noopener,noreferrer')
      } else {
        alert('Не удалось создать платёж. Проверьте сервер.')
      }
    } catch (e) {
      console.error(e)
      alert('Ошибка при создании платежа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#FFFEFA] px-4 py-5">
      <div className="mx-auto flex w-full max-w-md flex-col">
        <button
          onClick={onBack}
          className="mb-4 w-fit rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition active:scale-95"
        >
          ← Назад
        </button>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Оплата услуги</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Вы выбрали платную услугу у стоматолога. Стоимость указана ниже.
          </p>

          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            <div className="text-sm text-slate-500">Цена</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">500 ₽</div>
          </div>

          <button
            onClick={handlePay}
            disabled={loading}
            className="mt-6 w-full rounded-2xl bg-emerald-600 px-5 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70 active:scale-[0.99]"
          >
            {loading ? 'Создаём платёж...' : 'Оплатить'}
          </button>
        </div>
      </div>
    </div>
  )
}