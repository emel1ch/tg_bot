import React from 'react'
import BackArrowIcon from '../components/BackArrowIcon'

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
    <div className="ui-page-bg min-h-screen w-full px-4 py-5">
      <div className="mx-auto flex w-full max-w-md flex-col">
        <button
          type="button"
          onClick={onBack}
          className="ui-back-text-btn mb-4 w-fit"
        >
          <BackArrowIcon size={18} />
          <span>Назад</span>
        </button>

        <div className="ui-surface-card p-6">
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
            type="button"
            onClick={handleDownload}
            className="ui-primary-btn mt-6 w-full"
          >
            Скачать PDF-инструкцию
          </button>
        </div>
      </div>
    </div>
  )
}
