import React, { useEffect, useMemo, useState } from 'react'

const createEntry = (id, code = '', discountPercent = 0) => ({
  id,
  code,
  discountPercent: String(discountPercent),
})

const normalizeEntriesFromResponse = (data) => {
  if (Array.isArray(data?.entries)) {
    return data.entries
      .map((entry, index) => ({
        id: `${Date.now()}-${index}`,
        code: String(entry?.code || '').trim().toUpperCase(),
        discountPercent: String(entry?.discountPercent ?? 0),
      }))
      .filter((entry) => entry.code)
  }

  if (Array.isArray(data?.codes)) {
    return data.codes
      .map((code, index) => ({
        id: `${Date.now()}-${index}`,
        code: String(code || '').trim().toUpperCase(),
        discountPercent: '100',
      }))
      .filter((entry) => entry.code)
  }

  return []
}

export default function AdminPromoPage({ onBack, apiBaseUrl, initDataRaw }) {
  const [entries, setEntries] = useState([createEntry('initial')])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [statusType, setStatusType] = useState('info')

  const apiReady = useMemo(() => Boolean(apiBaseUrl && initDataRaw), [apiBaseUrl, initDataRaw])

  useEffect(() => {
    const loadEntries = async () => {
      if (!apiReady) {
        setStatus('Не удалось инициализировать API или пользователя')
        setStatusType('error')
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(
          `${apiBaseUrl}/api/admin/promo-codes?initData=${encodeURIComponent(initDataRaw)}`
        )
        const data = await response.json().catch(() => ({}))

        if (!response.ok || !data.ok) {
          setStatus(data.message || 'Нет доступа к админ панели')
          setStatusType('error')
          setIsLoading(false)
          return
        }

        const normalized = normalizeEntriesFromResponse(data)
        setEntries(normalized.length ? normalized : [createEntry(`${Date.now()}-empty`)])
        setStatus('')
        setStatusType('info')
      } catch {
        setStatus('Ошибка соединения при загрузке промокодов')
        setStatusType('error')
      } finally {
        setIsLoading(false)
      }
    }

    loadEntries()
  }, [apiBaseUrl, apiReady, initDataRaw])

  const updateEntry = (id, patch) => {
    setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)))
  }

  const addEntry = () => {
    setEntries((prev) => [...prev, createEntry(`${Date.now()}-${prev.length}`)])
  }

  const removeEntry = (id) => {
    setEntries((prev) => {
      const next = prev.filter((entry) => entry.id !== id)
      return next.length ? next : [createEntry(`${Date.now()}-empty`)]
    })
  }

  const handleSave = async () => {
    if (!apiReady || isSaving) return

    const preparedEntries = entries
      .map((entry) => {
        const code = String(entry.code || '').trim().toUpperCase()
        const rawPercent = Number(entry.discountPercent)
        const discountPercent = Number.isFinite(rawPercent) ? Math.round(rawPercent) : NaN

        if (!code) return null
        if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) return null

        return { code, discountPercent }
      })
      .filter(Boolean)

    setIsSaving(true)
    setStatus('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/promo-codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: initDataRaw, entries: preparedEntries }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.ok) {
        setStatus(data.message || 'Не удалось сохранить промокоды')
        setStatusType('error')
        return
      }

      const normalized = normalizeEntriesFromResponse(data)
      setEntries(normalized.length ? normalized : [createEntry(`${Date.now()}-empty`)])
      setStatus('Промокоды обновлены')
      setStatusType('success')
    } catch {
      setStatus('Ошибка соединения при сохранении')
      setStatusType('error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="ui-page-bg min-h-dvh w-full px-4 py-5">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            aria-label="Назад"
            onClick={onBack}
            className="ui-back-circle"
          >
            <span className="text-2xl leading-none">←</span>
          </button>
          <div className="ui-pill-title">Админ панель</div>
        </div>

        <div className="ui-surface-card p-5">
          <h1 className="text-xl font-semibold text-slate-900">Промокоды со скидкой</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Для каждой строки укажите код и скидку в процентах от 0 до 100.
          </p>

          <div className="mt-4 space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="grid grid-cols-[1fr_104px_40px] items-center gap-2">
                <input
                  value={entry.code}
                  onChange={(e) => updateEntry(entry.id, { code: e.target.value.toUpperCase() })}
                  disabled={isLoading || isSaving}
                  placeholder="PROMO20"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-[#18C6C8]"
                />
                <div className="relative">
                  <input
                    value={entry.discountPercent}
                    onChange={(e) => updateEntry(entry.id, { discountPercent: e.target.value.replace(/[^0-9]/g, '') })}
                    disabled={isLoading || isSaving}
                    placeholder="20"
                    inputMode="numeric"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-7 text-sm text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-[#18C6C8]"
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">%</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeEntry(entry.id)}
                  disabled={isLoading || isSaving}
                  className="rounded-xl border border-slate-200 bg-white px-0 py-2 text-sm text-slate-500 transition active:scale-[0.98] disabled:opacity-60"
                  aria-label="Удалить"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addEntry}
            disabled={isLoading || isSaving}
            className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition active:scale-[0.98]"
          >
            Добавить промокод
          </button>

          {status ? (
            <p className={`mt-3 text-sm ${statusType === 'error' ? 'text-red-500' : statusType === 'success' ? 'text-emerald-600' : 'text-slate-500'}`}>
              {status}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading || isSaving}
            className="ui-primary-btn mt-4 w-full"
          >
            {isSaving ? 'Сохранение...' : 'Сохранить промокоды'}
          </button>
        </div>
      </div>
    </div>
  )
}