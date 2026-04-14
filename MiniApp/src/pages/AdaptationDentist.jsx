// src/pages/AdaptationDentist.jsx
import React from 'react'
import DentistPageShell from '../components/DentistPageShell'
import { DENTIST_MATERIALS } from '../data/dentistConfig'

export default function AdaptationDentist({ onNavigate, onBack }) {
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
            onClick={() => onNavigate(item.route)}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left"
          >
            <div className="font-semibold text-slate-900">{item.title}</div>
            <div className="mt-1 text-sm text-slate-500">{item.description}</div>
          </button>
        ))}
      </div>
    </DentistPageShell>
  )
}