// webapp/src/pages/PayPage.jsx
import React, { useState } from 'react';

export default function PayPage({ onBack, onNavigate }) {
  const [loading, setLoading] = useState(false);

  const handlePay = () => {
    setLoading(true);
    // Имитация успешной оплаты через 1 секунду
    setTimeout(() => {
      setLoading(false);
      if (onNavigate) {
        onNavigate('adaptation');   // перенаправляем на страницу адаптации
      } else {
        alert('Оплата прошла успешно! (демо)');
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-1 -ml-1 rounded-full hover:bg-gray-100 transition text-2xl">
          ←
        </button>
        <h1 className="text-xl font-bold text-gray-800">Оплата</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-2xl">
              💳
            </div>
            <h2 className="text-xl font-bold text-gray-800">Оплата услуги</h2>
          </div>

          <p className="text-sm leading-6 text-gray-500">
            Вы выбрали платную услугу у стоматолога. Стоимость указана ниже.
          </p>

          <div className="mt-5 rounded-xl bg-gray-50 p-4">
            <div className="text-sm text-gray-500">Цена</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">500 ₽</div>
          </div>

          <button
            onClick={handlePay}
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-4 text-base font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-70 active:scale-[0.99]"
          >
            {loading ? 'Обработка...' : 'Оплатить'}
          </button>
        </div>
      </div>
    </div>
  );
}