// src/pages/AdaptationDentist.jsx
import React from 'react'
import DentistPageShell from '../components/DentistPageShell'
import { DENTIST_MATERIALS } from '../data/dentistConfig'

function openExternal(url) {
  const tg = window.Telegram?.WebApp

  if (tg?.openLink) {
    tg.openLink(url)
    return
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}

export default function AdaptationDentist({ onNavigate, onBack }) {
  const handleItemClick = (item) => {
    if (item.href) {
      openExternal(item.href)
      return
    }

    if (item.route) {
      onNavigate(item.route)
    }
  }

  return (
    <DentistPageShell
      title="Поход к стоматологу"
      subtitle="Материалы для адаптации"
      onBack={onBack}
    >
      <div className="flex flex-col gap-3">
        {DENTIST_MATERIALS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleItemClick(item)}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition active:scale-[0.99]"
          >
            <div className="font-semibold text-slate-900">{item.title}</div>
            <div className="mt-1 text-sm text-slate-500">{item.description}</div>
          </button>
        ))}
      </div>
    </DentistPageShell>
  )
}