// src/components/DentistPageShell.jsx
import React from 'react'

export default function DentistPageShell({
  title,
  subtitle,
  onBack,
  children,
}) {
  return (
    <div className="min-h-screen w-full bg-white px-4 py-5">
      <div className="mx-auto w-full max-w-md">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 w-fit rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition active:scale-95"
        >
          ← Назад
        </button>

        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>

        {subtitle ? (
          <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
        ) : null}

        <div className="mt-5">{children}</div>
      </div>
    </div>
  )
}