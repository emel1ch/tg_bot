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
    <div className="ui-page-bg min-h-dvh w-full px-4 py-5">
      <div className="mx-auto flex w-full max-w-md flex-col">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 w-fit rounded-full bg-[#D9FBF7] px-4 py-2 text-sm font-semibold text-slate-700 transition active:scale-95"
        >
          ← Назад
        </button>

        <div className="ui-surface-card p-6">
          <h2 className="text-2xl font-bold text-slate-900">Игра</h2>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Нажмите кнопку ниже, чтобы открыть игру в новой вкладке или внутри Telegram.
          </p>

          <button
            type="button"
            onClick={openGame}
            className="ui-primary-btn mt-6 w-full"
          >
            Открыть игру
          </button>
        </div>
      </div>
    </div>
  )
}
