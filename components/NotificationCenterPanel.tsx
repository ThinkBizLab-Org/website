'use client'

import { useEffect, useMemo, useState } from 'react'

type LogItem = {
  id: string
  event: string
  channel: string
  status: string
  title: string | null
  message: string | null
  error: string | null
  createdAt: string | null
}

type Routing = Record<string, string[]>

const eventLabels: Record<string, string> = {
  dead_letter: 'Dead letter (failed queue)',
  ready_for_approval: 'Ready for approval',
  published: 'Published',
}

function fmt(date: string | null) {
  return date ? new Date(date).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-'
}

function statusColor(status: string) {
  if (status === 'sent') return '#10B981'
  if (status === 'failed') return '#F87171'
  return '#9B8EC4'
}

export function NotificationCenterPanel() {
  const [log, setLog] = useState<LogItem[]>([])
  const [routing, setRouting] = useState<Routing>({})
  const [events, setEvents] = useState<string[]>([])
  const [channels, setChannels] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [testEvent, setTestEvent] = useState('dead_letter')

  async function load() {
    const res = await fetch('/api/notifications')
    const data = await res.json()
    if (res.ok) {
      setLog(data.log ?? [])
      setRouting(data.routing ?? {})
      setEvents(data.events ?? [])
      setChannels(data.channels ?? [])
    } else {
      setMessage(data.error ?? 'Cannot load notifications')
    }
  }

  function toggle(event: string, channel: string) {
    setRouting(prev => {
      const current = new Set(prev[event] ?? [])
      if (current.has(channel)) current.delete(channel)
      else current.add(channel)
      return { ...prev, [event]: Array.from(current) }
    })
  }

  async function saveRouting() {
    setSaving(true)
    setMessage('')
    const res = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routing }),
    })
    const data = await res.json()
    setMessage(res.ok ? 'routing saved' : data.error ?? 'save failed')
    if (res.ok && data.routing) setRouting(data.routing)
    setSaving(false)
  }

  async function sendTest() {
    setMessage('')
    const res = await fetch('/api/notifications/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: testEvent }),
    })
    const data = await res.json()
    if (!res.ok) {
      setMessage(data.error ?? 'test failed')
      return
    }
    const summary = (data.results ?? []).map((r: { channel: string; status: string }) => `${r.channel}:${r.status}`).join(', ')
    setMessage(`test sent — ${summary || 'no channels routed'}`)
    load()
  }

  useEffect(() => {
    load()
  }, [])

  const counts = useMemo(() => {
    return log.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1
      return acc
    }, {})
  }, [log])

  return (
    <div className="space-y-5">
      <section className="rounded-xl border p-4" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.35)' }}>
        <h2 className="font-heading text-lg font-bold text-white mb-3">Routing</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left px-3 py-2 font-mono text-xs text-purple">Event</th>
                {channels.map(channel => (
                  <th key={channel} className="px-3 py-2 font-mono text-xs text-purple text-center">{channel}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map(event => (
                <tr key={event} className="border-t" style={{ borderColor: 'rgba(124,58,237,.08)' }}>
                  <td className="px-3 py-2 text-white">{eventLabels[event] ?? event}</td>
                  {channels.map(channel => {
                    const on = (routing[event] ?? []).includes(channel)
                    return (
                      <td key={channel} className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => toggle(event, channel)}
                          aria-pressed={on}
                          className="w-9 h-6 rounded-full border transition-colors"
                          style={{
                            borderColor: on ? '#A78BFA' : 'rgba(124,58,237,.25)',
                            background: on ? 'rgba(124,58,237,.55)' : 'rgba(15,13,26,.6)',
                            color: on ? '#fff' : '#9B8EC4',
                          }}
                        >
                          {on ? 'on' : 'off'}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <button type="button" onClick={saveRouting} disabled={saving} className="px-4 py-2 rounded-lg border font-mono text-xs disabled:opacity-50" style={{ color: '#A78BFA', borderColor: 'rgba(124,58,237,.35)' }}>
            {saving ? 'saving...' : 'save routing'}
          </button>
          <select value={testEvent} onChange={e => setTestEvent(e.target.value)} className="px-3 py-2 rounded-lg border bg-transparent text-sm text-white outline-none" style={{ borderColor: 'rgba(124,58,237,.25)', background: '#0F0D1A' }}>
            {events.map(event => <option key={event} value={event}>{eventLabels[event] ?? event}</option>)}
          </select>
          <button type="button" onClick={sendTest} className="font-mono text-xs text-accent hover:underline">send test</button>
        </div>
        <p className="font-mono text-[10px] mt-3" style={{ color: 'rgba(155,142,196,.6)' }}>
          Channels read config from settings/env: LINE (LINE_CHANNEL_ACCESS_TOKEN), Slack (slack_webhook_url), Email (resend_api_key + notify_email_from + notify_email_to). Unconfigured channels are logged as skipped.
        </p>
      </section>

      <div className="grid grid-cols-3 gap-3">
        {['sent', 'failed', 'skipped'].map(item => (
          <div key={item} className="rounded-lg border px-4 py-3" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(15,13,26,.45)' }}>
            <div className="font-heading text-xl font-bold" style={{ color: statusColor(item) }}>{counts[item] ?? 0}</div>
            <div className="font-mono text-[10px]" style={{ color: '#9B8EC4' }}>{item}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="font-heading text-lg font-bold text-white">Delivery log</h2>
        <button type="button" onClick={load} className="font-mono text-xs text-accent hover:underline">refresh</button>
      </div>

      {message && <div className="font-mono text-xs text-accent">{message}</div>}

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(124,58,237,.18)' }}>
        <table className="w-full text-sm">
          <thead style={{ background: 'rgba(45,27,94,.3)' }}>
            <tr>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Event</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Channel</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Status</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple hidden md:table-cell">Message</th>
              <th className="text-right px-4 py-3 font-mono text-xs text-purple">When</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'rgba(124,58,237,.08)' }}>
            {log.map(item => (
              <tr key={item.id}>
                <td className="px-4 py-3 font-mono text-xs text-white">{eventLabels[item.event] ?? item.event}</td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: '#9B8EC4' }}>{item.channel}</td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: statusColor(item.status) }}>
                  {item.status}
                  {item.error && <div className="max-w-xs truncate text-red-300">{item.error}</div>}
                </td>
                <td className="px-4 py-3 font-mono text-xs hidden md:table-cell max-w-md truncate" style={{ color: '#9B8EC4' }}>{item.message ?? '-'}</td>
                <td className="px-4 py-3 text-right font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.5)' }}>{fmt(item.createdAt)}</td>
              </tr>
            ))}
            {log.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center font-mono text-xs" style={{ color: 'rgba(155,142,196,.5)' }}>ยังไม่มี notification</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
