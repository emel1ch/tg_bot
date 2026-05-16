import React from 'react'
import BackArrowIcon from '../components/BackArrowIcon'

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
          className="ui-back-text-btn mb-4 w-fit"
        >
          <BackArrowIcon size={18} />
          <span>Назад</span>
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
