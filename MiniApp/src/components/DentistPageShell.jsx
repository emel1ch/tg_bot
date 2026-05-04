// src/components/DentistPageShell.jsx
import React from 'react'

export default function DentistPageShell({
  title,
  subtitle,
  onBack,
  children,
}) {
  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-[#FFFEFA]">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-5 pt-5">
        <div className="sticky top-0 z-20 bg-[#FFFEFA] pb-4">
          <button
            type="button"
            onClick={onBack}
            className="mb-4 w-fit rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition active:scale-95"
          >
            ← Назад
          </button>

          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        </div>

        {subtitle ? (
          <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
        ) : null}

        <div className="mt-5 flex-1 pb-6">{children}</div>
      </div>
    </div>
  )
}