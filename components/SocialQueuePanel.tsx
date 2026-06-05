'use client'

import { useEffect, useMemo, useState } from 'react'

type QueueItem = {
  id: string
  articleId: string | null
  platform: string
  status: string
  attempts: number | null
  error: string | null
  scheduledAt: string | null
  processedAt: string | null
  createdAt: string | null
}

const statuses = ['ทั้งหมด', 'queued', 'processing', 'failed', 'success', 'cancelled']

function fmt(date: string | null) {
  return date ? new Date(date).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-'
}

export function SocialQueuePanel() {
  const [items, setItems] = useState<QueueItem[]>([])
  const [status, setStatus] = useState('ทั้งหมด')
  const [message, setMessage] = useState('')
  const [processing, setProcessing] = useState(false)

  async function load() {
    const res = await fetch('/api/social-queue')
    const data = await res.json()
    if (res.ok) setItems(data.queue ?? [])
    else setMessage(data.error ?? 'Cannot load queue')
  }

  async function act(id: string, action: 'retry' | 'cancel') {
    const res = await fetch(`/api/social-queue/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await res.json()
    if (!res.ok) {
      setMessage(data.error ?? `${action} failed`)
      return
    }
    setMessage(`${action} queued`)
    load()
  }

  async function processQueue() {
    setProcessing(true)
    setMessage('')
    const res = await fetch('/api/social-queue/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 10 }),
    })
    const data = await res.json()
    setMessage(res.ok ? `processed ${data.processed ?? 0} queue items` : data.error ?? 'process failed')
    setProcessing(false)
    load()
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    return status === 'ทั้งหมด' ? items : items.filter(item => item.status === status)
  }, [items, status])

  return (
    <div className="space-y-5">
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
        <div className="flex items-center gap-3">
          <button type="button" onClick={processQueue} disabled={processing} className="font-mono text-xs text-accent hover:underline disabled:opacity-60">
            {processing ? 'processing...' : 'process queue'}
          </button>
          <button type="button" onClick={load} className="font-mono text-xs text-accent hover:underline">refresh</button>
        </div>
      </div>

      {message && <div className="font-mono text-xs text-accent">{message}</div>}

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(124,58,237,.18)' }}>
        <table className="w-full text-sm">
          <thead style={{ background: 'rgba(45,27,94,.3)' }}>
            <tr>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Platform</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Status</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Article</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Attempts</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Created</th>
              <th className="text-right px-4 py-3 font-mono text-xs text-purple">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'rgba(124,58,237,.08)' }}>
            {filtered.map(item => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-white capitalize">{item.platform}</td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: item.status === 'failed' ? '#F87171' : item.status === 'success' ? '#10B981' : item.status === 'queued' ? '#38BDF8' : '#9B8EC4' }}>
                  {item.status}
                  {item.error && <div className="max-w-xs truncate text-red-300">{item.error}</div>}
                </td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: '#9B8EC4' }}>{item.articleId ?? '-'}</td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: '#9B8EC4' }}>{item.attempts ?? 0}</td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: '#9B8EC4' }}>{fmt(item.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  {item.status === 'failed' && <button type="button" onClick={() => act(item.id, 'retry')} className="font-mono text-xs text-accent hover:underline mr-4">retry</button>}
                  {item.status !== 'success' && item.status !== 'cancelled' && <button type="button" onClick={() => act(item.id, 'cancel')} className="font-mono text-xs text-red-300 hover:underline">cancel</button>}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center font-mono text-xs" style={{ color: 'rgba(155,142,196,.5)' }}>ไม่มี queue items</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
