'use client'

import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_UTM_CONFIG, UTM_PLATFORMS, buildPlatformUrls, type UtmConfig } from '@/lib/utm'

export function UtmCampaignPanel() {
  const [config, setConfig] = useState<UtmConfig>(DEFAULT_UTM_CONFIG)
  const [target, setTarget] = useState('')
  const [campaign, setCampaign] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState('')

  async function load() {
    const res = await fetch('/api/utm')
    const data = await res.json()
    if (res.ok) setConfig(data.config)
    else setMessage(data.error ?? 'Cannot load config')
  }

  async function save() {
    setSaving(true)
    setMessage('')
    const res = await fetch('/api/utm', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    })
    const data = await res.json()
    if (res.ok) { setConfig(data.config); setMessage('config saved') }
    else setMessage(data.error ?? 'save failed')
    setSaving(false)
  }

  async function copy(url: string, platform: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(platform)
      setTimeout(() => setCopied(''), 1500)
    } catch {
      setMessage('copy failed')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const urls = useMemo(() => {
    if (!target.trim()) return []
    return buildPlatformUrls(target.trim(), campaign, config)
  }, [target, campaign, config])

  const inputStyle = { borderColor: 'rgba(124,58,237,.25)' }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border p-4 grid gap-3 md:grid-cols-2" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.35)' }}>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="font-mono text-xs" style={{ color: '#A78BFA' }}>Target URL หรือ path</span>
          <input value={target} onChange={e => setTarget(e.target.value)} placeholder="/articles/my-slug หรือ https://..." className="px-3 py-2 rounded-lg border bg-transparent text-sm text-white outline-none" style={inputStyle} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-xs" style={{ color: '#A78BFA' }}>Campaign</span>
          <input value={campaign} onChange={e => setCampaign(e.target.value)} placeholder="เช่น launch-2026 (เว้นว่าง = ใช้ default)" className="px-3 py-2 rounded-lg border bg-transparent text-sm text-white outline-none" style={inputStyle} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-xs" style={{ color: '#A78BFA' }}>Medium</span>
          <input value={config.medium} onChange={e => setConfig(c => ({ ...c, medium: e.target.value }))} className="px-3 py-2 rounded-lg border bg-transparent text-sm text-white outline-none" style={inputStyle} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="font-mono text-xs" style={{ color: '#A78BFA' }}>Base URL (สำหรับ path แบบ relative)</span>
          <input value={config.baseUrl} onChange={e => setConfig(c => ({ ...c, baseUrl: e.target.value }))} className="px-3 py-2 rounded-lg border bg-transparent text-sm text-white outline-none" style={inputStyle} />
        </label>
        {UTM_PLATFORMS.map(platform => (
          <label key={platform} className="flex flex-col gap-1">
            <span className="font-mono text-xs" style={{ color: '#A78BFA' }}>utm_source · {platform}</span>
            <input
              value={config.source[platform]}
              onChange={e => setConfig(c => ({ ...c, source: { ...c.source, [platform]: e.target.value } }))}
              className="px-3 py-2 rounded-lg border bg-transparent text-sm text-white outline-none"
              style={inputStyle}
            />
          </label>
        ))}
        <div className="md:col-span-2 flex items-center gap-3">
          <button type="button" onClick={save} disabled={saving} className="px-4 py-2 rounded-lg border font-mono text-xs disabled:opacity-50" style={{ color: '#A78BFA', borderColor: 'rgba(124,58,237,.35)' }}>
            {saving ? 'saving...' : 'save defaults'}
          </button>
          {message && <span className="font-mono text-xs text-accent">{message}</span>}
        </div>
      </section>

      <section className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(124,58,237,.18)' }}>
        <table className="w-full text-sm">
          <thead style={{ background: 'rgba(45,27,94,.3)' }}>
            <tr>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Platform</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Tagged URL</th>
              <th className="text-right px-4 py-3 font-mono text-xs text-purple">Copy</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'rgba(124,58,237,.08)' }}>
            {urls.map(({ platform, url }) => (
              <tr key={platform}>
                <td className="px-4 py-3 font-mono text-xs text-white">{platform}</td>
                <td className="px-4 py-3 font-mono text-[11px] break-all" style={{ color: '#9B8EC4' }}>{url}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" onClick={() => copy(url, platform)} className="font-mono text-xs text-accent hover:underline">
                    {copied === platform ? 'copied' : 'copy'}
                  </button>
                </td>
              </tr>
            ))}
            {urls.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-12 text-center font-mono text-xs" style={{ color: 'rgba(155,142,196,.5)' }}>ใส่ target URL เพื่อสร้างลิงก์</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
