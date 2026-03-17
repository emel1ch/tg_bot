// src/pages/Home.jsx
import React from 'react'

export default function Home({ onNavigate }) {
  return (
    <div className="w-full flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-8 text-center">Меню</h1>
      
      <div className="flex flex-col gap-4 w-full">
        <button 
          className="bg-blue-600 text-white p-5 rounded-2xl text-lg font-semibold shadow-md"
          onClick={() => onNavigate('adaptation')}
        >
          Поход к стоматологу (бесплатно)
        </button>
        
        <button 
          className="bg-green-600 text-white p-5 rounded-2xl text-lg font-semibold shadow-md"
          onClick={() => onNavigate('dentist-paid')}
        >
          Поход на сдачу крови (платно)
        </button>
      </div>
    </div>
  )
}