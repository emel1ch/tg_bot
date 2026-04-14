import React from 'react'

export default function GameLink({ onBack }) {
  const GAME_URL = 'https://example.com/your-game'

  const openGame = () => {
    const tg = window.Telegram?.WebApp

    if (typeof tg?.openLink === 'function') {
      tg.openLink(GAME_URL)
      return
    }

    window.open(GAME_URL, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      className="min-h-dvh w-full px-4 py-5"
      style={{
        background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 48%, #f8fafc 100%)',
      }}
    >
      <div className="mx-auto flex w-full max-w-md flex-col">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 w-fit rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition active:scale-95"
        >
          ← Назад
        </button>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Игра</h2>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Нажмите кнопку ниже, чтобы открыть игру в новой вкладке или внутри Telegram.
          </p>

          <button
            type="button"
            onClick={openGame}
            className="mt-6 w-full rounded-2xl bg-cyan-500 px-5 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-cyan-600 active:scale-[0.99]"
          >
            Открыть игру
          </button>
        </div>
      </div>
    </div>
  )
}