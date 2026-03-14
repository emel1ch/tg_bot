// webapp/src/pages/PayPage.jsx
import React from 'react'

export default function PayPage({ onBack }) {
  const handlePay = async () => {
    try {
      // Для разработки используем прямой локальный URL сервера
      const resp = await fetch('http://localhost:3000/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: '500.00', description: 'Стоматолог — консультация' })
      })
      const data = await resp.json()
      if (data.confirmation?.confirmation_url) {
        window.open(data.confirmation.confirmation_url, '_blank')
      } else {
        alert('Ошибка создания платежа — см сервер')
      }
    } catch (e) {
      console.error(e)
      alert('Ошибка при создании платежа')
    }
  }

  return (
    <div>
      <button onClick={onBack}>Назад</button>
      <h2>Оплата услуги</h2>
      <p>Цена: 500 ₽</p>
      <button onClick={handlePay}>Оплатить</button>
    </div>
  )
}