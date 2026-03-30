import React, { useState } from 'react'

export default function Slider({ slides = [] }) {
  const [i, setI] = useState(0)

  const next = () => setI((s) => Math.min(s + 1, slides.length - 1))
  const prev = () => setI((s) => Math.max(s - 1, 0))

  if (!slides || slides.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-4 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
        Нет слайдов
      </div>
    )
  }

  const current = slides[i]

  return (
    <div className="w-full">
      <div className="min-h-[220px] rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        {current.image ? (
          <img
            src={current.image}
            alt=""
            className="mb-4 w-full rounded-2xl object-cover"
          />
        ) : null}

        <div className="flex min-h-[160px] items-center justify-center rounded-2xl bg-slate-50 p-4 text-center">
          <p className="text-base leading-7 text-slate-700">{current.text}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={prev}
          disabled={i === 0}
          className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ←
        </button>

        <div className="flex-1 text-center text-sm font-medium text-slate-500">
          {i + 1} / {slides.length}
        </div>

        <button
          onClick={next}
          disabled={i === slides.length - 1}
          className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          →
        </button>
      </div>
    </div>
  )
}