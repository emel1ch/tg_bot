// src/pages/Adaptation.jsx
import React from 'react'

export default function Adaptation({ onNavigate, onBack }) {
  // Константы со ссылками
  const RUTUBE_URL = "https://rutube.ru/video/private/ed02a8fd70e1c94fc4757ce31bb84bcc/?p=tPToE79p2R8lRMYapilT0Q"
  const GAME_URL = "https://example.com/your-game" // Замените на вашу ссылку

  const handleLinkClick = (url) => {
    // Если приложение открыто в Telegram, используем его метод, 
    // иначе — стандартное открытие в новой вкладке
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openLink(url)
    } else {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="w-full">
      <button onClick={onBack} className="mb-4 text-blue-500 font-medium">← Назад</button>
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Материалы для адаптации</h1>
      
      <div className="grid grid-cols-1 gap-4">
        {/* Блок 1: Мультфильм (Внешняя ссылка) */}
        <button
          onClick={() => handleLinkClick(RUTUBE_URL)}
          className="p-6 bg-white border-2 border-blue-100 rounded-xl shadow-sm active:scale-95 transition-transform text-lg font-semibold text-blue-700"
        >
          Мультфильм
        </button>

        {/* Блок 2: Соц. история (Внутренняя страница) */}
        <button
          onClick={() => onNavigate('story')}
          className="p-6 bg-white border-2 border-green-100 rounded-xl shadow-sm active:scale-95 transition-transform text-lg font-semibold text-green-700"
        >
          Соц. история
        </button>

        {/* Блок 3: Игра-тренажер (Внешняя ссылка) */}
        <button
          onClick={() => handleLinkClick(GAME_URL)}
          className="p-6 bg-white border-2 border-purple-100 rounded-xl shadow-sm active:scale-95 transition-transform text-lg font-semibold text-purple-700"
        >
          Игра-тренажер
        </button>

        {/* Блок 4: Рекомендации (Внутренняя страница) */}
        <button
          onClick={() => onNavigate('info')}
          className="p-6 bg-white border-2 border-orange-100 rounded-xl shadow-sm active:scale-95 transition-transform text-lg font-semibold text-orange-700"
        >
          Рекомендации для родителей
        </button>
      </div>
    </div>
  )
}