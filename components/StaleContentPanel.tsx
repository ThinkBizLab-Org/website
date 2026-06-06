'use client'

import { useEffect, useState } from 'react'

type Config = {
  enabled: boolean
  staleAfterDays: number
  recentWindowDays: number
  maxRecentViews: number
  perRun: number
}

type StaleArticle = { id: string; title: string; slug: string; recentViews: number; publishedAt: string | null }

export function StaleContentPanel() {
  const [config, setConfig] = useState<Config | null>(null)
  const [stale, setStale] = useState<StaleArticle[]>([])
  const [message, setMessage] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const res = await fetch('/api/stale-content')
    const data = await res.json()
    if (res.ok) { setConfig(data.config); setStale(data.stale ?? []) }
  }

  async function save(next: Config) {
    setConfig(next)
    const res = await fetch('/api/stale-content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config: next }) })
    const data = await res.json()
    if (res.ok) { setConfig(data.config); setMessage('saved'); load() } else setMessage(data.error ?? 'save failed')
  }

  async function runNow() {
    setMessage('running…')
    const res = await fetch('/api/stale-content', { method: 'POST' })
    const data = await res.json()
    setMessage(res.ok ? `refreshed ${data.refreshed ?? 0}${data.skipped ? ` (skipped: ${data.reason})` : ''}` : (data.error ?? 'run failed'))
    load()
  }

  if (!config) return null
  const num = (k: keyof Config) => config[k] as number

  return (
    <section className="rounded-xl border p-5" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.5)' }}>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
        <h2 className="font-heading text-lg font-bold text-white">Stale content
          <span className="ml-3 font-mono text-xs" style={{ color: stale.length ? '#F59E0B' : '#9B8EC4' }}>{stale.length} flagged</span>
        </h2>
        <div className="flex items-center gap-3">
          {message && <span className="font-mono text-xs text-accent">{message}</span>}
          <button type="button" onClick={runNow} className="px-3 py-1.5 rounded-lg border font-mono text-xs" style={{ color: '#A78BFA', borderColor: 'rgba(124,58,237,.35)' }}>refresh now</button>
          <label className="flex items-center gap-1.5 font-mono text-xs cursor-pointer" style={{ color: '#C4B5FD' }}>
            <input type="checkbox" checked={config.enabled} onChange={e => save({ ...config, enabled: e.target.checked })} />
            {config.enabled ? 'auto on' : 'auto off'}
          </label>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {([['staleAfterDays', 'stale after (days)'], ['recentWindowDays', 'views window (days)'], ['maxRecentViews', 'max recent views'], ['perRun', 'per run']] as const).map(([key, label]) => (
          <label key={key} className="font-mono text-xs" style={{ color: '#9B8EC4' }}>
            {label}
            <input type="number" value={num(key)} onChange={e => setConfig({ ...config, [key]: Number(e.target.value) })} onBlur={() => save(config)}
              className="mt-1 w-full px-2 py-1.5 rounded border bg-transparent text-white outline-none" style={{ borderColor: 'rgba(124,58,237,.25)' }} />
          </label>
        ))}
      </div>
      <div className="space-y-1">
        {stale.map(a => (
          <a key={a.id} href={`/admin/articles/${a.id}`} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border hover:border-accent" style={{ borderColor: 'rgba(124,58,237,.12)' }}>
            <span className="text-sm text-white truncate">{a.title}</span>
            <span className="font-mono text-[10px] shrink-0" style={{ color: '#F59E0B' }}>{a.recentViews} views</span>
          </a>
        ))}
        {stale.length === 0 && <p className="font-mono text-xs" style={{ color: 'rgba(155,142,196,.6)' }}>No stale articles right now.</p>}
      </div>
    </section>
  )
}
