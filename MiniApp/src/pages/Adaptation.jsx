import React from 'react'

export default function Adaptation({ onNavigate, onBack }) {
  const RUTUBE_URL =
    'https://rutube.ru/video/private/ed02a8fd70e1c94fc4757ce31bb84bcc/?p=tPToE79p2R8lRMYapilT0Q'
  const GAME_URL = 'https://example.com/your-game'

  const handleLinkClick = (url) => {
    const tg = window.Telegram?.WebApp
    if (tg?.openLink) {
      tg.openLink(url)
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const cardClass =
    'w-full max-w-sm mx-auto rounded-3xl border border-slate-200 bg-white px-5 py-4 text-center shadow-sm transition-all duration-200 active:scale-[0.98] hover:shadow-md'

  return (
    <div className="min-h-screen w-full bg-[#FFFEFA] px-4 py-5">
      <div className="mx-auto flex w-full max-w-md flex-col">
        <button
          onClick={onBack}
          className="mb-4 w-fit rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition active:scale-95"
        >
          ← Назад
        </button>

        <div className="mb-5 text-center">
          <p className="mb-2 text-sm font-medium text-sky-600">Раздел материалов</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Материалы для адаптации
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Выберите нужный блок ниже.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={() => handleLinkClick(RUTUBE_URL)}
            className={`${cardClass} border-sky-100`}
          >
            <div className="text-lg font-semibold text-slate-900">Мультфильм</div>
            <div className="mt-1 text-sm text-slate-500">Открыть ролик в Rutube</div>
          </button>

          <button
            onClick={() => onNavigate('story')}
            className={`${cardClass} border-emerald-100`}
          >
            <div className="text-lg font-semibold text-slate-900">Соц. история</div>
            <div className="mt-1 text-sm text-slate-500">
              Карточки с перелистыванием
            </div>
          </button>

          <button
            onClick={() => handleLinkClick(GAME_URL)}
            className={`${cardClass} border-violet-100`}
          >
            <div className="text-lg font-semibold text-slate-900">Игра-тренажёр</div>
            <div className="mt-1 text-sm text-slate-500">Открыть сайт с игрой</div>
          </button>

          <button
            onClick={() => onNavigate('info')}
            className={`${cardClass} border-amber-100`}
          >
            <div className="text-lg font-semibold text-slate-900">
              Рекомендации для родителей
            </div>
            <div className="mt-1 text-sm text-slate-500">Короткая памятка и PDF</div>
          </button>
        </div>
      </div>
    </div>
  )
}