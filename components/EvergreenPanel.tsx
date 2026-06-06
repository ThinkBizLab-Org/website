'use client'

import { useEffect, useState } from 'react'

const PLATFORMS = ['facebook', 'instagram', 'tiktok', 'line'] as const

type Config = {
  enabled: boolean
  minAgeDays: number
  cooldownDays: number
  minViews: number
  perRun: number
  platforms: string[]
}

export function EvergreenPanel() {
  const [config, setConfig] = useState<Config | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const res = await fetch('/api/evergreen')
    const data = await res.json()
    if (res.ok) setConfig(data.config)
  }

  async function save(next: Config) {
    setConfig(next)
    const res = await fetch('/api/evergreen', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config: next }) })
    const data = await res.json()
    if (res.ok) { setConfig(data.config); setMessage('saved') } else setMessage(data.error ?? 'save failed')
  }

  async function runNow() {
    setMessage('running…')
    const res = await fetch('/api/evergreen', { method: 'POST' })
    const data = await res.json()
    setMessage(res.ok ? `re-shared ${data.reshared ?? 0}${data.skipped ? ` (skipped: ${data.reason})` : ''}` : (data.error ?? 'run failed'))
  }

  if (!config) return null
  const num = (k: keyof Config) => config[k] as number

  return (
    <section className="rounded-xl border p-5" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.5)' }}>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
        <h2 className="font-heading text-lg font-bold text-white">Evergreen re-share</h2>
        <div className="flex items-center gap-3">
          {message && <span className="font-mono text-xs text-accent">{message}</span>}
          <button type="button" onClick={runNow} className="px-3 py-1.5 rounded-lg border font-mono text-xs" style={{ color: '#A78BFA', borderColor: 'rgba(124,58,237,.35)' }}>run now</button>
          <label className="flex items-center gap-1.5 font-mono text-xs cursor-pointer" style={{ color: '#C4B5FD' }}>
            <input type="checkbox" checked={config.enabled} onChange={e => save({ ...config, enabled: e.target.checked })} />
            {config.enabled ? 'on' : 'off'}
          </label>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        {([['minAgeDays', 'min age (days)'], ['cooldownDays', 'cooldown (days)'], ['minViews', 'min views'], ['perRun', 'per run']] as const).map(([key, label]) => (
          <label key={key} className="font-mono text-xs" style={{ color: '#9B8EC4' }}>
            {label}
            <input type="number" value={num(key)} onChange={e => setConfig({ ...config, [key]: Number(e.target.value) })} onBlur={() => save(config)}
              className="mt-1 w-full px-2 py-1.5 rounded border bg-transparent text-white outline-none" style={{ borderColor: 'rgba(124,58,237,.25)' }} />
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-mono text-xs" style={{ color: '#9B8EC4' }}>platforms:</span>
        {PLATFORMS.map(p => {
          const on = config.platforms.includes(p)
          return (
            <button key={p} type="button"
              onClick={() => save({ ...config, platforms: on ? config.platforms.filter(x => x !== p) : [...config.platforms, p] })}
              className="px-3 py-1.5 rounded-lg border font-mono text-xs"
              style={{ borderColor: on ? '#A78BFA' : 'rgba(124,58,237,.2)', color: on ? '#fff' : '#9B8EC4', background: on ? 'rgba(124,58,237,.35)' : 'transparent' }}>
              {p}
            </button>
          )
        })}
      </div>
      <p className="font-mono text-[10px] mt-3" style={{ color: 'rgba(155,142,196,.6)' }}>Re-queues the top published articles (by views) to the selected platforms on a daily cron, respecting the per-article cooldown.</p>
    </section>
  )
}
