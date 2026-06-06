'use client'

import { useEffect, useState } from 'react'

type Config = {
  enabled: boolean
  minQualityScore: number
  maxUnsupported: number
  requireFactCheck: boolean
}

export function AutoApprovePanel() {
  const [config, setConfig] = useState<Config | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const res = await fetch('/api/auto-approve')
    const data = await res.json()
    if (res.ok) setConfig(data.config)
  }

  async function save(next: Config) {
    setConfig(next)
    const res = await fetch('/api/auto-approve', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config: next }) })
    const data = await res.json()
    if (res.ok) { setConfig(data.config); setMessage('saved') } else setMessage(data.error ?? 'save failed')
  }

  if (!config) return null

  return (
    <section className="rounded-xl border p-5" style={{ borderColor: config.enabled ? 'rgba(16,185,129,.35)' : 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.5)' }}>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
        <h2 className="font-heading text-lg font-bold text-white">Auto-approve gate
          <span className="ml-3 font-mono text-xs" style={{ color: config.enabled ? '#10B981' : '#9B8EC4' }}>{config.enabled ? 'on' : 'off'}</span>
        </h2>
        <div className="flex items-center gap-3">
          {message && <span className="font-mono text-xs text-accent">{message}</span>}
          <label className="flex items-center gap-1.5 font-mono text-xs cursor-pointer" style={{ color: '#C4B5FD' }}>
            <input type="checkbox" checked={config.enabled} onChange={e => save({ ...config, enabled: e.target.checked })} />
            enabled
          </label>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="font-mono text-xs" style={{ color: '#9B8EC4' }}>
          min quality score
          <input type="number" min={0} max={100} value={config.minQualityScore} onChange={e => setConfig({ ...config, minQualityScore: Number(e.target.value) })} onBlur={() => save(config)}
            className="mt-1 w-full px-2 py-1.5 rounded border bg-transparent text-white outline-none" style={{ borderColor: 'rgba(124,58,237,.25)' }} />
        </label>
        <label className="font-mono text-xs" style={{ color: '#9B8EC4' }}>
          max unsupported claims
          <input type="number" min={0} max={100} value={config.maxUnsupported} onChange={e => setConfig({ ...config, maxUnsupported: Number(e.target.value) })} onBlur={() => save(config)}
            className="mt-1 w-full px-2 py-1.5 rounded border bg-transparent text-white outline-none" style={{ borderColor: 'rgba(124,58,237,.25)' }} />
        </label>
      </div>
      <label className="flex items-center gap-2 font-mono text-xs mt-3 cursor-pointer" style={{ color: '#9B8EC4' }}>
        <input type="checkbox" checked={config.requireFactCheck} onChange={e => save({ ...config, requireFactCheck: e.target.checked })} />
        require a successful fact-check (a failed/missing fact-check blocks auto-approval)
      </label>
      <p className="font-mono text-[10px] mt-3" style={{ color: 'rgba(155,142,196,.6)' }}>Drafts that clear quality + fact-check are approved and scheduled automatically; everything else still goes through manual LINE approval.</p>
    </section>
  )
}
