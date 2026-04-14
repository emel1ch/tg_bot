// src/pages/StoryDentist.jsx
import React from 'react'
import DentistPageShell from '../components/DentistPageShell'

export default function StoryDentist({ onBack }) {
  return (
    <DentistPageShell
      title="Социальная история"
      subtitle="Здесь позже будет слайдер карточек."
      onBack={onBack}
    >
      <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
        Страница готова как основа для будущего слайдера.
      </div>
    </DentistPageShell>
  )
}