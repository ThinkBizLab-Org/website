'use client'

import { useEffect, useMemo, useState } from 'react'

type QueueItem = {
  id: string
  articleId: string | null
  assetType: string
  status: string
  attempts: number | null
  error: string | null
  providerJobId: string | null
  resultUrl: string | null
  scheduledAt: string | null
  processedAt: string | null
  createdAt: string | null
}

const statuses = ['ทั้งหมด', 'queued', 'processing', 'waiting', 'failed', 'success', 'cancelled']
const assetTypes = [
  ['cover_image', 'Cover image'],
  ['instagram_image', 'Instagram image'],
  ['short_video', 'Short video'],
] as const

function fmt(date: string | null) {
  return date ? new Date(date).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-'
}

function statusColor(status: string) {
  if (status === 'success') return '#10B981'
  if (status === 'failed') return '#F87171'
  if (status === 'queued') return '#38BDF8'
  if (status === 'waiting' || status === 'processing') return '#F59E0B'
  return '#9B8EC4'
}

export function MediaProductionQueuePanel() {
  const [items, setItems] = useState<QueueItem[]>([])
  const [status, setStatus] = useState('ทั้งหมด')
  const [message, setMessage] = useState('')
  const [processing, setProcessing] = useState(false)
  const [articleId, setArticleId] = useState('')
  const [assetType, setAssetType] = useState('cover_image')
  const [prompt, setPrompt] = useState('')

  async function load() {
    const res = await fetch('/api/media-production-queue')
    const data = await res.json()
    if (res.ok) setItems(data.queue ?? [])
    else setMessage(data.error ?? 'Cannot load queue')
  }

  async function enqueue() {
    setMessage('')
    const payload: Record<string, string> = {}
    if (prompt.trim()) {
      if (assetType === 'short_video') payload.script = prompt.trim()
      else payload.prompt = prompt.trim()
    }
    const res = await fetch('/api/media-production-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId: articleId.trim(), assetType, payload }),
    })
    const data = await res.json()
    if (!res.ok) {
      setMessage(data.error ?? 'enqueue failed')
      return
    }
    setMessage(data.created ? 'queued' : 'already queued')
    setPrompt('')
    load()
  }

  async function act(id: string, action: 'retry' | 'cancel') {
    const res = await fetch(`/api/media-production-queue/${id}`, {
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
    const res = await fetch('/api/media-production-queue/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 5 }),
    })
    const data = await res.json()
    setMessage(res.ok ? `processed ${data.processed ?? 0} queue items` : data.error ?? 'process failed')
    setProcessing(false)
    load()
  }

  // Live progress: poll the queue every 10s so HeyGen/render jobs advance on
  // screen (waiting → success) without manual refresh.
  useEffect(() => {
    load()
    const timer = setInterval(load, 10000)
    return () => clearInterval(timer)
  }, [])

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
      <section className="rounded-xl border p-4 grid gap-4 lg:grid-cols-[1fr_220px_1.4fr_auto]" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.35)' }}>
        <input
          value={articleId}
          onChange={e => setArticleId(e.target.value)}
          placeholder="Article ID"
          className="px-3 py-2 rounded-lg border bg-transparent text-sm text-white outline-none"
          style={{ borderColor: 'rgba(124,58,237,.25)' }}
        />
        <select
          value={assetType}
          onChange={e => setAssetType(e.target.value)}
          className="px-3 py-2 rounded-lg border bg-transparent text-sm text-white outline-none"
          style={{ borderColor: 'rgba(124,58,237,.25)', background: '#0F0D1A' }}
        >
          {assetTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder={assetType === 'short_video' ? 'Optional video script override' : 'Optional prompt override'}
          className="px-3 py-2 rounded-lg border bg-transparent text-sm text-white outline-none"
          style={{ borderColor: 'rgba(124,58,237,.25)' }}
        />
        <button
          type="button"
          onClick={enqueue}
          disabled={!articleId.trim()}
          className="px-4 py-2 rounded-lg border font-mono text-xs disabled:opacity-50"
          style={{ color: '#A78BFA', borderColor: 'rgba(124,58,237,.35)' }}
        >
          enqueue
        </button>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {['queued', 'waiting', 'processing', 'failed', 'success'].map(item => (
          <div key={item} className="rounded-lg border px-4 py-3" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(15,13,26,.45)' }}>
            <div className="font-heading text-xl font-bold" style={{ color: statusColor(item) }}>{counts[item] ?? 0}</div>
            <div className="font-mono text-[10px]" style={{ color: '#9B8EC4' }}>{item}</div>
          </div>
        ))}
      </div>

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
          <span className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>● อัปเดตอัตโนมัติทุก 10 วิ</span>
          <button type="button" onClick={processQueue} disabled={processing}
            className="px-3 py-1.5 rounded-lg border font-mono text-xs disabled:opacity-60"
            style={{ color: '#C4B5FD', borderColor: 'rgba(124,58,237,.4)', background: 'rgba(124,58,237,.15)' }}>
            {processing ? 'กำลังประมวลผล...' : '⚡ Process now'}
          </button>
          <button type="button" onClick={load} className="font-mono text-xs text-accent hover:underline">refresh</button>
        </div>
      </div>

      {message && <div className="font-mono text-xs text-accent">{message}</div>}

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(124,58,237,.18)' }}>
        <table className="w-full text-sm">
          <thead style={{ background: 'rgba(45,27,94,.3)' }}>
            <tr>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Asset</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Status</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Article</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Attempts</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Scheduled</th>
              <th className="text-right px-4 py-3 font-mono text-xs text-purple">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'rgba(124,58,237,.08)' }}>
            {filtered.map(item => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-white">
                  <div>{item.assetType.replace('_', ' ')}</div>
                  {item.resultUrl && <a href={item.resultUrl} target="_blank" className="font-mono text-[10px] text-accent hover:underline">open asset</a>}
                  {item.providerJobId && <div className="font-mono text-[10px]" style={{ color: '#9B8EC4' }}>job {item.providerJobId}</div>}
                </td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: statusColor(item.status) }}>
                  {item.status}
                  {item.error && <div className="max-w-xs truncate text-red-300">{item.error}</div>}
                </td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: '#9B8EC4' }}>{item.articleId ?? '-'}</td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: '#9B8EC4' }}>{item.attempts ?? 0}</td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: '#9B8EC4' }}>{fmt(item.scheduledAt)}</td>
                <td className="px-4 py-3 text-right">
                  {(item.status === 'failed' || item.status === 'waiting') && <button type="button" onClick={() => act(item.id, 'retry')} className="font-mono text-xs text-accent hover:underline mr-4">retry</button>}
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
