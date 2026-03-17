// src/pages/Recommendations.jsx
import React from 'react'

export default function Recommendations({ onBack }) {
  const handleDownload = () => {
    alert('Начинается скачивание PDF-файла (заглушка)')
  }

  return (
    <div className="w-full">
      <button onClick={onBack} className="mb-4 text-blue-500">← Назад</button>
      <h1 className="text-2xl font-bold mb-4">Рекомендации для родителей</h1>
      
      <div className="bg-gray-50 p-4 rounded-lg mb-6 text-gray-700 leading-relaxed">
        <p>Здесь находится важная информация о том, как подготовить ребенка к визиту. 
        Используйте наши советы, чтобы снизить уровень стресса и сделать посещение врача комфортным.</p>
        <br />
        <p>Важно сохранять спокойствие и использовать позитивные установки.</p>
      </div>

      <button 
        onClick={handleDownload}
        className="w-full bg-red-500 text-white py-4 rounded-lg font-bold shadow-lg"
      >
        Скачать PDF-инструкцию
      </button>
    </div>
  )
}