import React from 'react'
import { Download } from 'lucide-react'

function BackIcon({ width = 18, height = 18 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={width}
      height={height}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M15 18L9 12L15 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function RecommendationsDentist({ onBack }) {
  const handleDownload = () => {
    const pdfPath = '/files/dentist_recommendations.pdf'
    const link = document.createElement('a')
    link.href = pdfPath
    link.download = 'Рекомендации_подготовка_к_стоматологу.pdf'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#FFFEFA]">
      <div className="flex h-full w-full flex-col bg-[#FFFEFA]">
        {/* Верхняя панель */}
        <div className="shrink-0 bg-[#FFFEFA] px-4 pt-3 pb-3">
          <div className="mx-auto flex w-full max-w-md items-center gap-3">
            <button
              onClick={onBack}
              type="button"
              aria-label="Назад"
              className="ui-back-circle"
            >
              <BackIcon />
            </button>

            <div className="ui-pill-title">
              Поход к стоматологу
            </div>
          </div>
        </div>

        {/* Скролл идет на всю ширину экрана */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#FFFEFA]">
          <div className="mx-auto w-full max-w-md px-5 pb-6">
            <h2 className="mb-1 text-[22px] font-bold text-gray-900">
              Рекомендации для родителей
            </h2>

            <p className="mb-8 text-[15px] text-gray-600">
              Подготовка к стоматологической помощи детей с РАС
            </p>

            <h3 className="mb-5 text-[19px] font-bold text-[#18C6C8]">
              Общие рекомендации
            </h3>

            <ol className="space-y-6 text-[15.5px] leading-[1.45] text-gray-800">
              <li className="flex gap-3">
                <span className="shrink-0 font-bold text-gray-900">1.</span>
                <span>
                  Включать в повседневные игры с ребёнком игру в стоматолога,
                  по возможности использовать игровые стоматологические наборы
                  (инструменты, нагрудную салфетку, перчатки и т.д.);
                </span>
              </li>

              <li className="flex gap-3">
                <span className="shrink-0 font-bold text-gray-900">2.</span>
                <span>
                  Учить ребёнка в игровой форме держать рот открытым,
                  можно в виде соревнования с Вами (кто дольше);
                </span>
              </li>

              <li className="flex gap-3">
                <span className="shrink-0 font-bold text-gray-900">3.</span>
                <span>
                  Закладывать за щеку ватку, постепенно увеличивая время
                  её нахождения в полости рта, начиная с 1–2 секунд;
                </span>
              </li>

              <li className="flex gap-3">
                <span className="shrink-0 font-bold text-gray-900">4.</span>
                <span>
                  Считать друг другу зубки и записывать результат в тетрадь;
                </span>
              </li>

              <li className="flex gap-3">
                <span className="shrink-0 font-bold text-gray-900">5.</span>
                <span>
                  Использовать электрическую зубную щётку сначала самим, чтобы ребёнок наблюдал
                  за Вами со стороны. Затем предложить ребёнку детскую зубную щётку, чтобы ребёнок
                  привыкал к вибрации, звуку, механическим движениям. Хорошо, если найдёте щётку
                  с изображением любимого героя, или в той цветовой гамме, которая нравится ребёнку;
                </span>
              </li>

              <li className="flex gap-3">
                <span className="shrink-0 font-bold text-gray-900">6.</span>
                <span>
                  Полезно заранее познакомить ребёнка на фото и видеоматериалах
                  с клиникой, в которой будет проходить приём.
                </span>
              </li>

              <li className="flex gap-3">
                <span className="shrink-0 font-bold text-gray-900">7.</span>
                <span>
                  Здорово, если у Вас получится побывать с ребёнком на экскурсии по
                  стоматологии, вживую увидеть всю окружающую обстановку, познакомиться
                  с врачом, увидеть, потрогать инструменты, посидеть в кресле.
                </span>
              </li>
            </ol>
          </div>
        </div>

        {/* Нижняя панель */}
        <div
          className="shrink-0 bg-[#FFFEFA] px-4 pt-4"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        >
          <div className="mx-auto flex w-full max-w-md gap-3">
            <button
              onClick={onBack}
              type="button"
              className="ui-secondary-btn flex-1"
            >
              Закрыть
            </button>

            <button
              onClick={handleDownload}
              type="button"
              className="ui-primary-btn flex flex-1 items-center justify-center gap-2"
            >
              <Download size={20} />
              Скачать
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
