'use client'

import { useEffect, useState } from 'react'

type Bucket = {
  key: string
  generations: number
  failed: number
  inputTokens: number
  outputTokens: number
  costUsd: number
}

type Summary = {
  totals: Bucket
  daily: Bucket[]
  monthly: Bucket[]
  byKind: Record<string, number>
}

function fmtNum(n: number) {
  return n.toLocaleString('en-US')
}

function fmtUsd(n: number) {
  return `$${n.toFixed(2)}`
}

export function AiUsageDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [days, setDays] = useState(60)
  const [view, setView] = useState<'daily' | 'monthly'>('daily')
  const [message, setMessage] = useState('')

  async function load(range = days) {
    const res = await fetch(`/api/ai-usage?days=${range}`)
    const data = await res.json()
    if (res.ok) setSummary(data.summary)
    else setMessage(data.error ?? 'Cannot load usage')
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totals = summary?.totals
  const rows = (view === 'daily' ? summary?.daily : summary?.monthly) ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2">
          {[30, 60, 90].map(range => (
            <button
              key={range}
              type="button"
              onClick={() => { setDays(range); load(range) }}
              className="px-3 py-2 rounded-lg border font-mono text-xs"
              style={{
                borderColor: days === range ? '#A78BFA' : 'rgba(124,58,237,.2)',
                color: days === range ? '#fff' : '#9B8EC4',
                background: days === range ? 'rgba(124,58,237,.35)' : 'rgba(15,13,26,.5)',
              }}
            >
              {range}d
            </button>
          ))}
        </div>
        <button type="button" onClick={() => load()} className="font-mono text-xs text-accent hover:underline">refresh</button>
      </div>

      {message && <div className="font-mono text-xs text-accent">{message}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          ['Generations', fmtNum(totals?.generations ?? 0), '#10B981'],
          ['Failed runs', fmtNum(totals?.failed ?? 0), (totals?.failed ?? 0) > 0 ? '#F87171' : '#9B8EC4'],
          ['Input tokens', fmtNum(totals?.inputTokens ?? 0), '#38BDF8'],
          ['Output tokens', fmtNum(totals?.outputTokens ?? 0), '#A78BFA'],
          ['Est. cost', fmtUsd(totals?.costUsd ?? 0), '#F59E0B'],
        ].map(([label, value, color]) => (
          <div key={String(label)} className="rounded-xl border p-5" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.5)' }}>
            <div className="font-heading text-2xl font-bold mb-1 break-words" style={{ color: String(color) }}>{String(value)}</div>
            <div className="text-xs font-mono" style={{ color: '#9B8EC4' }}>{String(label)}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {(['daily', 'monthly'] as const).map(item => (
          <button
            key={item}
            type="button"
            onClick={() => setView(item)}
            className="px-3 py-2 rounded-lg border font-mono text-xs"
            style={{
              borderColor: view === item ? '#A78BFA' : 'rgba(124,58,237,.2)',
              color: view === item ? '#fff' : '#9B8EC4',
              background: view === item ? 'rgba(124,58,237,.35)' : 'rgba(15,13,26,.5)',
            }}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(124,58,237,.18)' }}>
        <table className="w-full text-sm">
          <thead style={{ background: 'rgba(45,27,94,.3)' }}>
            <tr>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">{view === 'daily' ? 'Date' : 'Month'}</th>
              <th className="text-right px-4 py-3 font-mono text-xs text-purple">Gen</th>
              <th className="text-right px-4 py-3 font-mono text-xs text-purple">Failed</th>
              <th className="text-right px-4 py-3 font-mono text-xs text-purple hidden md:table-cell">Input</th>
              <th className="text-right px-4 py-3 font-mono text-xs text-purple hidden md:table-cell">Output</th>
              <th className="text-right px-4 py-3 font-mono text-xs text-purple">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'rgba(124,58,237,.08)' }}>
            {rows.map(row => (
              <tr key={row.key}>
                <td className="px-4 py-3 font-mono text-xs text-white">{row.key}</td>
                <td className="px-4 py-3 text-right font-mono text-xs" style={{ color: '#10B981' }}>{fmtNum(row.generations)}</td>
                <td className="px-4 py-3 text-right font-mono text-xs" style={{ color: row.failed > 0 ? '#F87171' : '#9B8EC4' }}>{fmtNum(row.failed)}</td>
                <td className="px-4 py-3 text-right font-mono text-xs hidden md:table-cell" style={{ color: '#9B8EC4' }}>{fmtNum(row.inputTokens)}</td>
                <td className="px-4 py-3 text-right font-mono text-xs hidden md:table-cell" style={{ color: '#9B8EC4' }}>{fmtNum(row.outputTokens)}</td>
                <td className="px-4 py-3 text-right font-mono text-xs" style={{ color: '#F59E0B' }}>{fmtUsd(row.costUsd)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center font-mono text-xs" style={{ color: 'rgba(155,142,196,.5)' }}>ยังไม่มีข้อมูลการใช้งาน</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
