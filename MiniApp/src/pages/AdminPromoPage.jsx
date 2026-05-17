import React, { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import BackArrowIcon from '../components/BackArrowIcon'

const toDateInputValue = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

const createEntry = (id, source = {}) => ({
  id,
  code: String(source?.code || '').trim().toUpperCase(),
  discountPercent: String(source?.discountPercent ?? 0),
  expiresAt: toDateInputValue(source?.expiresAt),
  maxUses: source?.maxUses == null ? '' : String(source.maxUses),
  usedCount: Number(source?.usedCount ?? 0),
  note: String(source?.note || ''),
  active: source?.active !== false,
})

const normalizeEntriesFromResponse = (data) => {
  const rawEntries = Array.isArray(data?.entries)
    ? data.entries
    : Array.isArray(data?.codes)
      ? data.codes.map((code) => ({ code, discountPercent: 100 }))
      : []

  return rawEntries
    .map((entry, index) => createEntry(`${Date.now()}-${index}`, entry))
    .filter((entry) => entry.code)
}

const normalizeHistoryFromResponse = (data) => {
  if (!Array.isArray(data?.history)) return []

  return data.history
    .map((entry) => ({
      id: String(entry?.id || `${entry?.code || 'promo'}-${entry?.appliedAt || Date.now()}`),
      appliedAt: String(entry?.appliedAt || ''),
      code: String(entry?.code || '').trim().toUpperCase(),
      userId: String(entry?.userId || ''),
      discountPercent: Number(entry?.discountPercent ?? 0),
      accessGranted: Boolean(entry?.accessGranted),
      finalAmountValue: String(entry?.finalAmountValue || ''),
      paymentId: String(entry?.paymentId || ''),
      eventType: String(entry?.eventType || ''),
    }))
    .filter((entry) => entry.code)
}

const formatDateTime = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Дата неизвестна'

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const describeHistoryEvent = (entry) => {
  if (entry.eventType === 'free_access') return 'Бесплатный доступ открыт'
  if (entry.eventType === 'payment_confirmed') return 'Оплата подтверждена, доступ открыт'
  if (entry.eventType === 'discount_applied') return 'Скидка применена в форме'
  return entry.accessGranted ? 'Доступ открыт' : 'Скидка применена'
}

const getInputClassName = (extra = '') =>
  `w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus-visible:ring-2 focus-visible:ring-[#18C6C8] disabled:bg-slate-50 disabled:text-slate-400 ${extra}`

export default function AdminPromoPage({ onBack, apiBaseUrl, initDataRaw }) {
  const [entries, setEntries] = useState([createEntry('initial')])
  const [history, setHistory] = useState([])
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
        setHistory(normalizeHistoryFromResponse(data))
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
    setEntries((prev) => [...prev, createEntry(`${Date.now()}-${prev.length}`, { active: true })])
  }

  const removeEntry = (id) => {
    setEntries((prev) => {
      const next = prev.filter((entry) => entry.id !== id)
      return next.length ? next : [createEntry(`${Date.now()}-empty`)]
    })
  }

  const prepareEntriesForSave = () => {
    const preparedEntries = []

    for (const entry of entries) {
      const code = String(entry.code || '').trim().toUpperCase()
      const note = String(entry.note || '').trim()
      const hasAnyValue = Boolean(code || note || entry.expiresAt || entry.maxUses)
      if (!hasAnyValue) continue

      if (!/^[A-Z0-9_-]{3,64}$/.test(code)) {
        return { ok: false, message: 'Код должен быть 3-64 символа: A-Z, 0-9, _ или -' }
      }

      const rawPercent = Number(entry.discountPercent)
      const discountPercent = Number.isFinite(rawPercent) ? Math.round(rawPercent) : NaN
      if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
        return { ok: false, message: `Проверьте скидку для ${code}: нужно число от 0 до 100` }
      }

      const rawMaxUses = entry.maxUses === '' ? null : Number(entry.maxUses)
      const maxUses = rawMaxUses == null || rawMaxUses === ''
        ? null
        : Number.isFinite(rawMaxUses)
          ? Math.round(rawMaxUses)
          : NaN
      if (maxUses != null && (!Number.isFinite(maxUses) || maxUses < 1)) {
        return { ok: false, message: `Проверьте лимит для ${code}: нужно число от 1` }
      }

      preparedEntries.push({
        code,
        discountPercent,
        expiresAt: entry.expiresAt || null,
        maxUses,
        usedCount: Math.max(0, Math.round(Number(entry.usedCount) || 0)),
        note,
        active: Boolean(entry.active),
      })
    }

    return { ok: true, entries: preparedEntries }
  }

  const handleSave = async () => {
    if (!apiReady || isSaving) return

    const prepared = prepareEntriesForSave()
    if (!prepared.ok) {
      setStatus(prepared.message)
      setStatusType('error')
      return
    }

    setIsSaving(true)
    setStatus('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/promo-codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: initDataRaw, entries: prepared.entries }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.ok) {
        setStatus(data.message || 'Не удалось сохранить промокоды')
        setStatusType('error')
        return
      }

      const normalized = normalizeEntriesFromResponse(data)
      setEntries(normalized.length ? normalized : [createEntry(`${Date.now()}-empty`)])
      setHistory(normalizeHistoryFromResponse(data))
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
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            aria-label="Назад"
            onClick={onBack}
            className="ui-back-circle"
          >
            <BackArrowIcon />
          </button>
          <div className="ui-pill-title">Админ панель</div>
        </div>

        <div className="space-y-4">
          <section className="ui-surface-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Промокоды</h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Управляйте скидкой, сроком действия, лимитом, активностью и заметкой.
                </p>
              </div>
              <button
                type="button"
                onClick={addEntry}
                disabled={isLoading || isSaving}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#18C6C8] text-white transition active:scale-[0.98] disabled:opacity-60"
                aria-label="Добавить промокод"
              >
                <Plus size={20} strokeWidth={2.2} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className={`rounded-2xl border p-3 ${
                    entry.active ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
                    <input
                      value={entry.code}
                      onChange={(e) => updateEntry(entry.id, { code: e.target.value.toUpperCase() })}
                      disabled={isLoading || isSaving}
                      placeholder="PROMO20"
                      className={getInputClassName('font-semibold tracking-wide')}
                    />
                    <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={entry.active}
                        onChange={(e) => updateEntry(entry.id, { active: e.target.checked })}
                        disabled={isLoading || isSaving}
                        className="h-4 w-4 accent-[#18C6C8]"
                      />
                      Активен
                    </label>
                    <button
                      type="button"
                      onClick={() => removeEntry(entry.id)}
                      disabled={isLoading || isSaving}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition active:scale-[0.98] disabled:opacity-60"
                      aria-label="Удалить"
                    >
                      <Trash2 size={17} strokeWidth={2.1} />
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <label className="text-xs font-medium text-slate-500">
                      Скидка
                      <div className="relative mt-1">
                        <input
                          value={entry.discountPercent}
                          onChange={(e) => updateEntry(entry.id, { discountPercent: e.target.value.replace(/[^0-9]/g, '') })}
                          disabled={isLoading || isSaving}
                          placeholder="20"
                          inputMode="numeric"
                          className={getInputClassName('pr-7')}
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">%</span>
                      </div>
                    </label>

                    <label className="text-xs font-medium text-slate-500">
                      Действует до
                      <input
                        type="date"
                        value={entry.expiresAt}
                        onChange={(e) => updateEntry(entry.id, { expiresAt: e.target.value })}
                        disabled={isLoading || isSaving}
                        className={getInputClassName('mt-1')}
                      />
                    </label>

                    <label className="text-xs font-medium text-slate-500">
                      Лимит
                      <input
                        value={entry.maxUses}
                        onChange={(e) => updateEntry(entry.id, { maxUses: e.target.value.replace(/[^0-9]/g, '') })}
                        disabled={isLoading || isSaving}
                        placeholder="Без лимита"
                        inputMode="numeric"
                        className={getInputClassName('mt-1')}
                      />
                    </label>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-xs font-medium text-slate-500">Использовано</div>
                      <div className="mt-1 text-sm font-semibold text-slate-800">
                        {entry.usedCount}{entry.maxUses ? ` / ${entry.maxUses}` : ''}
                      </div>
                    </div>
                  </div>

                  <label className="mt-3 block text-xs font-medium text-slate-500">
                    Заметка
                    <input
                      value={entry.note}
                      onChange={(e) => updateEntry(entry.id, { note: e.target.value })}
                      disabled={isLoading || isSaving}
                      placeholder="Например: акция для родителей в мае"
                      className={getInputClassName('mt-1')}
                    />
                  </label>
                </div>
              ))}
            </div>

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
          </section>

          <section className="ui-surface-card p-5">
            <h2 className="text-lg font-semibold text-slate-900">История применений</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Последние успешные применения и выдачи доступа по промокодам.
            </p>

            <div className="mt-4 space-y-3">
              {history.length ? (
                history.slice(0, 30).map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold tracking-wide text-slate-900">{entry.code}</div>
                        <div className="mt-1 text-sm text-slate-600">{describeHistoryEvent(entry)}</div>
                      </div>
                      <div className="shrink-0 text-right text-xs text-slate-400">{formatDateTime(entry.appliedAt)}</div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500 sm:grid-cols-4">
                      <div>
                        <span className="block text-slate-400">Пользователь</span>
                        <span className="font-medium text-slate-700">{entry.userId || 'Неизвестно'}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400">Скидка</span>
                        <span className="font-medium text-slate-700">{entry.discountPercent}%</span>
                      </div>
                      <div>
                        <span className="block text-slate-400">Итог</span>
                        <span className="font-medium text-slate-700">{entry.finalAmountValue || '0.00'} ₽</span>
                      </div>
                      <div>
                        <span className="block text-slate-400">Доступ</span>
                        <span className={entry.accessGranted ? 'font-medium text-emerald-600' : 'font-medium text-slate-700'}>
                          {entry.accessGranted ? 'Открыт' : 'Только скидка'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  Применений пока нет.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
