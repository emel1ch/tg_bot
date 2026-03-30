import React from 'react'

export default function Recommendations({ onBack }) {
  const handleDownload = () => {
    const pdfPath = '/files/parents-guide.pdf'
    const link = document.createElement('a')
    link.href = pdfPath
    link.download = 'parents-guide.pdf'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen w-full bg-[#FFFEFA] px-4 py-5">
      <div className="mx-auto flex w-full max-w-md flex-col">
        <button
          onClick={onBack}
          className="mb-4 w-fit rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition active:scale-95"
        >
          ← Назад
        </button>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-bold text-slate-900">
            Рекомендации для родителей
          </h1>

          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
            <p>
              Здесь находится важная информация о том, как подготовить ребёнка к визиту.
              Используйте простые и спокойные объяснения, чтобы снизить тревогу.
            </p>
            <p className="mt-3">
              Лучше заранее рассказать, что будет происходить, и не пугать ребёнка
              лишними подробностями.
            </p>
          </div>

          <button
            onClick={handleDownload}
            className="mt-6 w-full rounded-2xl bg-red-500 px-5 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-red-600 active:scale-[0.99]"
          >
            Скачать PDF-инструкцию
          </button>
        </div>
      </div>
    </div>
  )
}