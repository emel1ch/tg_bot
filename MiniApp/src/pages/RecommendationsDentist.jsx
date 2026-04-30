// src/pages/RecommendationsDentist.jsx
import React from 'react';
import { Download } from 'lucide-react';

// Иконка стрелки назад — как в Adaptation.jsx
function BackIcon({ width = 18, height = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={width} height={height} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function RecommendationsDentist({ onBack }) {
  const handleDownload = () => {
    const pdfPath = '/files/dentist_recommendations.pdf';
    const link = document.createElement('a');
    link.href = pdfPath;
    link.download = 'Рекомендации_подготовка_к_стоматологу.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#FFFEFA] flex flex-col">   {/* ← Желтоватый фон из Adaptation.jsx */}
      <div className="max-w-md mx-auto w-full flex flex-col min-h-screen">

        {/* Шапка */}
        <div className="sticky top-0 z-10 bg-white px-4 py-3 flex items-center gap-3 border-b border-gray-100">
          <button
            onClick={onBack}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#D9FBF7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <BackIcon />
          </button>

          <div className="flex-1 bg-[#18C6C8] text-white text-[17px] font-semibold px-6 py-[13px] rounded-[30px] text-center shadow-sm">
            Поход к стоматологу
          </div>
        </div>

        {/* Основной контент */}
        <div className="flex-1 px-5 pt-6 pb-28">
          <h2 className="text-[22px] font-bold text-gray-900 mb-1">
            Рекомендации для родителей
          </h2>
          <p className="text-gray-600 text-[15px] mb-8">
            Подготовка к стоматологической помощи детей с РАС
          </p>

          <h3 className="text-[#18C6C8] font-bold text-[19px] mb-5">
            Общие рекомендации
          </h3>

          <ol className="space-y-6 text-[15.5px] leading-[1.45] text-gray-800">
            <li className="flex gap-3">
              <span className="font-bold text-gray-900 shrink-0">1.</span>
              <span>
                Включать в повседневные игры с ребёнком игру в стоматолога, 
                по возможности использовать игровые стоматологические наборы 
                (инструменты, нагрудную салфетку, перчатки и т.д.);
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-gray-900 shrink-0">2.</span>
              <span>
                Учить ребёнка в игровой форме держать рот открытым, 
                можно в виде соревнования с Вами (кто дольше);
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-gray-900 shrink-0">3.</span>
              <span>
                Закладывать за щеку ватку, постепенно увеличивая время 
                её нахождения в полости рта, начиная с 1–2 секунд;
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-gray-900 shrink-0">4.</span>
              <span>Считать друг другу зубки и записывать результат в тетрадь;</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-gray-900 shrink-0">5.</span>
              <span>
                Использовать электрическую зубную щётку сначала самим, чтобы ребёнок наблюдал 
                за Вами со стороны. Затем предложить ребёнку детскую зубную щётку, чтобы ребёнок 
                привыкал к вибрации, звуку, механическим движениям. Хорошо, если найдёте щётку 
                с изображением любимого героя, или в той цветовой гамме, которая нравится ребёнку;
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-gray-900 shrink-0">6.</span>
              <span>
                Полезно заранее познакомить ребёнка на фото и видеоматериалах 
                с клиникой, в которой будет проходить приём.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-gray-900 shrink-0">7.</span>
              <span>
                Здорово, если у Вас получится побывать с ребёнком на экскурсии по 
                стоматологии, вживую увидеть всю окружающую обстановку, познакомиться 
                с врачом, увидеть, потрогать инструменты, посидеть в кресле.
              </span>
            </li>
          </ol>
        </div>

        {/* Нижняя панель */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-4 flex gap-3 mt-auto">
          <button
            onClick={onBack}
            className="flex-1 py-[17px] font-medium text-gray-700 active:bg-gray-50 transition"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #D1D5DB',
              borderRadius: '16px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            }}
          >
            Закрыть
          </button>

          <button
            onClick={handleDownload}
            className="flex-1 py-[17px] bg-[#18C6C8] rounded-2xl text-white font-medium flex items-center justify-center gap-2 active:bg-[#16b3b5] transition"
          >
            <Download size={20} />
            Скачать
          </button>
        </div>

      </div>
    </div>
  );
}