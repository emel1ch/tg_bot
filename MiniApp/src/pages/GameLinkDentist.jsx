// src/pages/GameLinkDentist.jsx
import React from 'react'
import DentistPageShell from '../components/DentistPageShell'
import { DENTIST_GAME_URL } from '../data/dentistConfig'

function openExternal(url) {
  const tg = window.Telegram?.WebApp
  if (tg?.openLink) {
    tg.openLink(url)
    return
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}

export default function GameLinkDentist({ onBack }) {
  return (
    <DentistPageShell
      title="Игра"
      subtitle="Здесь позже будет переход на сайт игры."
      onBack={onBack}
    >
      <button
        type="button"
        onClick={() => openExternal(DENTIST_GAME_URL)}
        className="ui-primary-btn w-full sm:w-auto"
      >
        Открыть игру
      </button>
    </DentistPageShell>
  )
}
