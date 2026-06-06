'use client'

import { useEffect, useMemo, useState } from 'react'

type DeadLetterItem = {
  id: string
  source: string
  sourceId: string | null
  articleId: string | null
  reference: string | null
  attempts: number | null
  error: string | null
  status: string
  resolvedBy: string | null
  failedAt: string | null
  resolvedAt: string | null
}

const statuses = ['ทั้งหมด', 'pending', 'requeued', 'discarded']
const sources = [
  ['ทั้งหมด', ''],
  ['social', 'social_post_queue'],
  ['media', 'media_production_queue'],
] as const

function fmt(date: string | null) {
  return date ? new Date(date).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-'
}

function statusColor(status: string) {
  if (status === 'pending') return '#F87171'
  if (status === 'requeued') return '#38BDF8'
  if (status === 'discarded') return '#9B8EC4'
  return '#9B8EC4'
}

function sourceLabel(source: string) {
  if (source === 'social_post_queue') return 'social'
  if (source === 'media_production_queue') return 'media'
  return source
}

export function DeadLetterQueuePanel() {
  const [items, setItems] = useState<DeadLetterItem[]>([])
  const [status, setStatus] = useState('ทั้งหมด')
  const [source, setSource] = useState('')
  const [message, setMessage] = useState('')
  const [autoRetry, setAutoRetry] = useState<{ enabled: boolean; maxAutoRetries: number; backoffMinutes: number } | null>(null)

  async function load() {
    const params = new URLSearchParams()
    if (source) params.set('source', source)
    const res = await fetch(`/api/dead-letter-queue${params.toString() ? `?${params.toString()}` : ''}`)
    const data = await res.json()
    if (res.ok) { setItems(data.queue ?? []); if (data.autoRetry) setAutoRetry(data.autoRetry) }
    else setMessage(data.error ?? 'Cannot load queue')
  }

  async function saveAutoRetry(next: { enabled: boolean; maxAutoRetries: number; backoffMinutes: number }) {
    setAutoRetry(next)
    const res = await fetch('/api/dead-letter-queue', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoRetry: next }),
    })
    const data = await res.json()
    if (res.ok) { setAutoRetry(data.autoRetry); setMessage('auto-retry settings saved') }
    else setMessage(data.error ?? 'save failed')
  }

  async function act(id: string, action: 'requeue' | 'discard') {
    setMessage('')
    const res = await fetch(`/api/dead-letter-queue/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await res.json()
    if (!res.ok) {
      setMessage(data.error ?? `${action} failed`)
      return
    }
    setMessage(action === 'requeue' ? (data.requeued ? 'requeued to source queue' : 'marked requeued (source job missing)') : 'discarded')
    load()
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source])

  const filtered = useMemo(() => {
    return status === 'ทั้งหมด' ? items : items.filter(item => item.status === status)
  }, [items, status])

  const counts = useMemo(() => {
    return items.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1
      return acc
    }, {})
  }, [items])

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {['pending', 'requeued', 'discarded'].map(item => (
          <div key={item} className="rounded-lg border px-4 py-3" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(15,13,26,.45)' }}>
            <div className="font-heading text-xl font-bold" style={{ color: statusColor(item) }}>{counts[item] ?? 0}</div>
            <div className="font-mono text-[10px]" style={{ color: '#9B8EC4' }}>{item}</div>
          </div>
        ))}
      </div>

      {autoRetry && (
        <div className="flex items-center gap-4 flex-wrap rounded-xl border px-4 py-3" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.35)' }}>
          <label className="flex items-center gap-2 font-mono text-xs cursor-pointer" style={{ color: '#C4B5FD' }}>
            <input type="checkbox" checked={autoRetry.enabled} onChange={e => saveAutoRetry({ ...autoRetry, enabled: e.target.checked })} />
            Auto-retry {autoRetry.enabled ? 'on' : 'off'}
          </label>
          <label className="flex items-center gap-1.5 font-mono text-xs" style={{ color: '#9B8EC4' }}>
            max retries
            <input type="number" min={0} max={10} value={autoRetry.maxAutoRetries}
              onChange={e => setAutoRetry({ ...autoRetry, maxAutoRetries: Number(e.target.value) })}
              onBlur={() => saveAutoRetry(autoRetry)}
              className="w-14 px-2 py-1 rounded border bg-transparent text-white outline-none" style={{ borderColor: 'rgba(124,58,237,.25)' }} />
          </label>
          <label className="flex items-center gap-1.5 font-mono text-xs" style={{ color: '#9B8EC4' }}>
            backoff (min)
            <input type="number" min={0} max={1440} value={autoRetry.backoffMinutes}
              onChange={e => setAutoRetry({ ...autoRetry, backoffMinutes: Number(e.target.value) })}
              onBlur={() => saveAutoRetry(autoRetry)}
              className="w-16 px-2 py-1 rounded border bg-transparent text-white outline-none" style={{ borderColor: 'rgba(124,58,237,.25)' }} />
          </label>
          <span className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>pending jobs requeue automatically until the cap, then wait for you</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-wrap gap-2">
          {statuses.map(item => (
            <button
              key={item}
              type="button"
              onClick={() => setStatus(item)}
              className="px-3 py-2 rounded-lg border font-mono text-xs"
              style={{
                borderColor: status === item ? '#A78BFA' : 'rgba(124,58,237,.2)',
                color: status === item ? '#fff' : '#9B8EC4',
                background: status === item ? 'rgba(124,58,237,.35)' : 'rgba(15,13,26,.5)',
              }}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {sources.map(([label, value]) => (
            <button
              key={value || 'all'}
              type="button"
              onClick={() => setSource(value)}
              className="px-3 py-2 rounded-lg border font-mono text-xs"
              style={{
                borderColor: source === value ? '#A78BFA' : 'rgba(124,58,237,.2)',
                color: source === value ? '#fff' : '#9B8EC4',
                background: source === value ? 'rgba(124,58,237,.35)' : 'rgba(15,13,26,.5)',
              }}
            >
              {label}
            </button>
          ))}
          <button type="button" onClick={load} className="font-mono text-xs text-accent hover:underline">refresh</button>
        </div>
      </div>

      {message && <div className="font-mono text-xs text-accent">{message}</div>}

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(124,58,237,.18)' }}>
        <table className="w-full text-sm">
          <thead style={{ background: 'rgba(45,27,94,.3)' }}>
            <tr>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Source</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Status</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Article</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Attempts</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Failed</th>
              <th className="text-right px-4 py-3 font-mono text-xs text-purple">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'rgba(124,58,237,.08)' }}>
            {filtered.map(item => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-white">
                  <div>{sourceLabel(item.source)}</div>
                  {item.reference && <div className="font-mono text-[10px]" style={{ color: '#9B8EC4' }}>{item.reference}</div>}
                </td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: statusColor(item.status) }}>
                  {item.status}
                  {item.error && <div className="max-w-xs truncate text-red-300">{item.error}</div>}
                  {item.resolvedBy && <div className="text-[10px]" style={{ color: 'rgba(155,142,196,.5)' }}>by {item.resolvedBy}</div>}
                </td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: '#9B8EC4' }}>{item.articleId ?? '-'}</td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: '#9B8EC4' }}>{item.attempts ?? 0}</td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: '#9B8EC4' }}>{fmt(item.failedAt)}</td>
                <td className="px-4 py-3 text-right">
                  {item.status === 'pending' && (
                    <>
                      <button type="button" onClick={() => act(item.id, 'requeue')} className="font-mono text-xs text-accent hover:underline mr-4">requeue</button>
                      <button type="button" onClick={() => act(item.id, 'discard')} className="font-mono text-xs text-red-300 hover:underline">discard</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center font-mono text-xs" style={{ color: 'rgba(155,142,196,.5)' }}>ไม่มี dead letter items</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
