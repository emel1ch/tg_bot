// src/pages/RecommendationsDentist.jsx
import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react'; // или замените на свои иконки

export default function RecommendationsDentist({ onBack }) {
  const handleDownload = () => {
    // Укажите правильный путь к вашему PDF-файлу
    const pdfPath = '/files/dentist_recommendations.pdf';
    const link = document.createElement('a');
    link.href = pdfPath;
    link.download = 'recommendations_dentist.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Альтернативный вариант – открыть PDF в новой вкладке
  // const handleOpen = () => {
  //   window.open('/files/dentist_recommendations.pdf', '_blank');
  // };

  return (
    <div className="min-h-screen w-full bg-gray-50">
      {/* Шапка */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-1 -ml-1 rounded-full hover:bg-gray-100 transition">
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-xl font-bold text-gray-800">Рекомендации для родителей</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <FileText size={24} className="text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Рекомендации для родителей</h2>
          </div>

          <div className="mt-2 rounded-xl bg-gray-50 p-4 text-sm leading-7 text-gray-700">
            <p>
              Здесь находится важная информация о том, как подготовить ребёнка к визиту к стоматологу.
              Используйте простые и спокойные объяснения, чтобы снизить тревогу.
            </p>
            <p className="mt-3">
              Лучше заранее рассказать, что будет происходить, и не пугать ребёнка лишними подробностями.
            </p>
            <p className="mt-3">
              Полные методические рекомендации по подготовке ребенка к визиту к стоматологу: общие советы и специальные приемы.
            </p>
          </div>

          <button
            onClick={handleDownload}
            className="mt-6 w-full rounded-xl bg-blue-500 hover:bg-blue-600 px-5 py-4 text-base font-semibold text-white shadow-sm transition active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <FileText size={20} />
            Скачать PDF-инструкцию
          </button>
        </div>
      </div>
    </div>
  );
}