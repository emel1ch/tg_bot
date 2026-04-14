// src/pages/RecommendationsDentist.jsx
import React from 'react'
import DentistPageShell from '../components/DentistPageShell'

const PDF_URL = '/files/recommendations-dentist.pdf'

export default function RecommendationsDentist({ onBack }) {
  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = PDF_URL
    link.download = 'recommendations-dentist.pdf'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <DentistPageShell
      title="Рекомендации для родителей"
      subtitle="Здесь позже будет описание и кнопка скачивания PDF."
      onBack={onBack}
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-600">
          PDF-файл нужно положить в <code>public/files/recommendations-dentist.pdf</code>
        </p>

        <button
          type="button"
          onClick={handleDownload}
          className="mt-4 rounded-xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white"
        >
          Скачать PDF
        </button>
      </div>
    </DentistPageShell>
  )
}