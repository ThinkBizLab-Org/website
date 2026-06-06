'use client'

import { useEffect, useState } from 'react'

type Profile = {
  tone: string
  audience: string
  dos: string[]
  donts: string[]
  samplePhrases: string[]
  keywords: string[]
}

const EMPTY: Profile = { tone: '', audience: '', dos: [], donts: [], samplePhrases: [], keywords: [] }

const listFields: { key: keyof Profile; label: string; hint: string }[] = [
  { key: 'dos', label: 'Do (บรรทัดละข้อ)', hint: 'สิ่งที่ต้องทำ เช่น ใช้ตัวอย่างจริง, น้ำเสียงเป็นกันเอง' },
  { key: 'donts', label: "Don't (บรรทัดละข้อ)", hint: 'สิ่งที่ต้องเลี่ยง เช่น ศัพท์เทคนิคเกินจำเป็น' },
  { key: 'samplePhrases', label: 'Preferred phrases (บรรทัดละข้อ)', hint: 'วลีที่อยากให้ใช้บ่อย' },
  { key: 'keywords', label: 'Brand keywords (บรรทัดละข้อ)', hint: 'คำที่อยากให้สอดแทรกอย่างเป็นธรรมชาติ' },
]

export function BrandVoicePanel() {
  const [profile, setProfile] = useState<Profile>(EMPTY)
  const [preview, setPreview] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const res = await fetch('/api/brand-voice')
    const data = await res.json()
    if (res.ok) {
      setProfile({ ...EMPTY, ...data.profile })
      setPreview(data.preview ?? '')
    } else {
      setMessage(data.error ?? 'Cannot load brand voice')
    }
  }

  async function save() {
    setSaving(true)
    setMessage('')
    const res = await fetch('/api/brand-voice', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile }),
    })
    const data = await res.json()
    if (res.ok) {
      setProfile({ ...EMPTY, ...data.profile })
      setPreview(data.preview ?? '')
      setMessage('brand voice saved')
    } else {
      setMessage(data.error ?? 'save failed')
    }
    setSaving(false)
  }

  useEffect(() => {
    load()
  }, [])

  const inputStyle = { borderColor: 'rgba(124,58,237,.25)' }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border p-4 grid gap-4 md:grid-cols-2" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.35)' }}>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-xs" style={{ color: '#A78BFA' }}>Tone</span>
          <input value={profile.tone} onChange={e => setProfile(p => ({ ...p, tone: e.target.value }))} placeholder="เช่น เป็นกันเอง มั่นใจ ใช้ภาษาธุรกิจที่เข้าใจง่าย" className="px-3 py-2 rounded-lg border bg-transparent text-sm text-white outline-none" style={inputStyle} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-xs" style={{ color: '#A78BFA' }}>Audience</span>
          <input value={profile.audience} onChange={e => setProfile(p => ({ ...p, audience: e.target.value }))} placeholder="เช่น เจ้าของธุรกิจ SME ในไทย" className="px-3 py-2 rounded-lg border bg-transparent text-sm text-white outline-none" style={inputStyle} />
        </label>

        {listFields.map(field => (
          <label key={field.key} className="flex flex-col gap-1">
            <span className="font-mono text-xs" style={{ color: '#A78BFA' }}>{field.label}</span>
            <textarea
              value={(profile[field.key] as string[]).join('\n')}
              onChange={e => setProfile(p => ({ ...p, [field.key]: e.target.value.split('\n') }))}
              rows={4}
              placeholder={field.hint}
              className="px-3 py-2 rounded-lg border bg-transparent text-sm text-white outline-none resize-y"
              style={inputStyle}
            />
          </label>
        ))}

        <div className="md:col-span-2 flex items-center gap-3">
          <button type="button" onClick={save} disabled={saving} className="px-4 py-2 rounded-lg border font-mono text-xs disabled:opacity-50" style={{ color: '#A78BFA', borderColor: 'rgba(124,58,237,.35)' }}>
            {saving ? 'saving...' : 'save brand voice'}
          </button>
          {message && <span className="font-mono text-xs text-accent">{message}</span>}
        </div>
      </section>

      <section className="rounded-xl border p-4" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(15,13,26,.5)' }}>
        <h2 className="font-heading text-sm font-bold text-white mb-2">Prompt preview</h2>
        <p className="font-mono text-[10px] mb-2" style={{ color: 'rgba(155,142,196,.6)' }}>บล็อกนี้จะถูกแนบเข้า system prompt ทุกครั้งที่ Content Factory สร้างบทความ</p>
        <pre className="font-mono text-[11px] leading-5 whitespace-pre-wrap m-0" style={{ color: preview ? '#C4B5FD' : 'rgba(155,142,196,.5)' }}>
          {preview || 'ยังไม่ได้ตั้งค่า brand voice — prompt จะไม่มีบล็อกนี้'}
        </pre>
      </section>
    </div>
  )
}
