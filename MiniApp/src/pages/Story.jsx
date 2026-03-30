import React from 'react'
import Slider from '../components/Slider'

const slides = [
  { image: '', text: 'Страница 1: Введение' },
  { image: '', text: 'Страница 2: Сюжет' },
  { image: '', text: 'Страница 3: Заключение' },
]

export default function Story({ onBack }) {
  return (
    <div className="min-h-screen w-full bg-[#FFFEFA] px-4 py-5">
      <div className="mx-auto flex w-full max-w-md flex-col">
        <button
          onClick={onBack}
          className="mb-4 w-fit rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition active:scale-95"
        >
          ← Назад
        </button>

        <div className="mb-5 text-center">
          <p className="mb-2 text-sm font-medium text-emerald-600">Раздел истории</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Соц-история
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Листайте карточки стрелками внизу.
          </p>
        </div>

        <Slider slides={slides} />
      </div>
    </div>
  )
}