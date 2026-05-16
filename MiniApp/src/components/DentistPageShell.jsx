// src/components/DentistPageShell.jsx
import React from 'react'

export default function DentistPageShell({
  title,
  subtitle,
  onBack,
  children,
}) {
  return (
    <div className="ui-page-bg min-h-dvh w-full overflow-x-hidden">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-5 pt-5">
        <div className="sticky top-0 z-20 ui-page-bg pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              aria-label="Назад"
              className="ui-back-circle"
            >
              <span className="text-2xl leading-none">←</span>
            </button>

            <div className="ui-pill-title">{title}</div>
          </div>
        </div>

        {subtitle ? (
          <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
        ) : null}

        <div className="mt-5 flex-1 pb-6">{children}</div>
      </div>
    </div>
  )
}
