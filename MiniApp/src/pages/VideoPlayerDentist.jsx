// src/pages/VideoPlayerDentist.jsx
import React from 'react'
import DentistPageShell from '../components/DentistPageShell'
import { DENTIST_VIDEO_URL } from '../data/dentistConfig'

function openExternal(url) {
  const tg = window.Telegram?.WebApp
  if (tg?.openLink) {
    tg.openLink(url)
    return
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}

export default function VideoPlayerDentist({ onBack }) {
  return (
    <DentistPageShell
      title="Видео"
      subtitle="Здесь позже будет переход на видео."
      onBack={onBack}
    >
      <button
        type="button"
        onClick={() => openExternal(DENTIST_VIDEO_URL)}
        className="rounded-2xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white"
      >
        Открыть видео
      </button>
    </DentistPageShell>
  )
}