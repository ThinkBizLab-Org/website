'use client'

import { useState } from 'react'
import { LEAD_STATUSES, type LeadStatus } from '@/lib/leads'

const COLORS: Record<LeadStatus, string> = {
  new: '#F59E0B',
  contacted: '#38BDF8',
  qualified: '#A78BFA',
  won: '#10B981',
  lost: '#F87171',
}

export function LeadStatusSelect({ leadId, status: initial }: { leadId: string; status: string }) {
  const [status, setStatus] = useState<string>(initial)
  const [saving, setSaving] = useState(false)

  const change = async (next: string) => {
    const prev = status
    setStatus(next)
    setSaving(true)
    const res = await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    if (!res.ok) setStatus(prev)
    setSaving(false)
  }

  return (
    <select
      value={status}
      onChange={e => change(e.target.value)}
      disabled={saving}
      className="font-mono text-[11px] px-2 py-1 rounded outline-none"
      style={{ background: 'rgba(15,13,26,.7)', border: `1px solid ${COLORS[status as LeadStatus] ?? '#9B8EC4'}40`, color: COLORS[status as LeadStatus] ?? '#9B8EC4' }}
    >
      {LEAD_STATUSES.map(s => <option key={s} value={s} style={{ color: '#fff', background: '#1a1320' }}>{s}</option>)}
    </select>
  )
}
