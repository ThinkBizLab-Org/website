'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'

type FactoryTopic = {
  id: string
  topic: string
  category: string | null
  status: string
  scheduledAt: string
  articleId: string | null
  approvalToken: string | null
  error: string | null
}

type QueueItem = {
  id: string
  articleId: string | null
  platform: string
  status: string
  attempts: number | null
  error: string | null
  scheduledAt: string | null
  createdAt: string | null
}

type Draft = {
  id: string
  title: string
  status: string | null
  category: string | null
  publishScheduledAt: string | null
  geoScore: number | null
  coverImage: string | null
}

type DashboardData = {
  stats: Record<string, number>
  topics: FactoryTopic[]
  drafts: Draft[]
  queue: QueueItem[]
  failures: FactoryTopic[]
  notifications: { id: string; severity: string; name: string; message: string; createdAt: string | null }[]
  performance: { category: string; views: number }[]
  recentAttempts: { id: string; platform: string; status: string; error: string | null; createdAt: string | null }[]
}

const statusColor: Record<string, string> = {
  planned: '#64748B',
  generated: '#A78BFA',
  notified: '#F59E0B',
  approved: '#38BDF8',
  published: '#10B981',
  rejected: '#FB7185',
  failed: '#F87171',
  queued: '#38BDF8',
  processing: '#F59E0B',
  success: '#10B981',
  cancelled: '#94A3B8',
  review: '#F59E0B',
}

function fmt(date: string | null) {
  return date ? new Date(date).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-'
}

export function ContentFactoryDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [message, setMessage] = useState('')
  const [running, setRunning] = useState(false)
  const [actingTopicId, setActingTopicId] = useState<string | null>(null)

  async function load() {
    const res = await fetch('/api/content-factory/dashboard')
    const json = await res.json()
    if (res.ok) setData(json)
    else setMessage(json.error ?? 'Cannot load dashboard')
  }

  async function runFactory() {
    setRunning(true)
    setMessage('')
    const res = await fetch('/api/content-factory/run', { method: 'POST' })
    const json = await res.json()
    setMessage(res.ok ? `generated ${json.result?.generated ?? 0} items` : json.error ?? 'Run failed')
    setRunning(false)
    load()
  }

  async function actOnTopic(topic: FactoryTopic, action: 'approve' | 'reject') {
    if (action === 'reject') {
      const reason = window.prompt('Reject reason')
      if (reason === null) return
      await submitTopicAction(topic, action, reason)
      return
    }
    await submitTopicAction(topic, action)
  }

  async function submitTopicAction(topic: FactoryTopic, action: 'approve' | 'reject', reason = '') {
    setActingTopicId(topic.id)
    setMessage('')
    const res = await fetch(`/api/content-factory/topics/${topic.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason }),
    })
    const json = await res.json()
    setMessage(res.ok ? json.message ?? `${action} done` : json.message ?? json.error ?? `${action} failed`)
    setActingTopicId(null)
    load()
  }

  useEffect(() => {
    load()
  }, [])

  const waiting = useMemo(() => data?.topics.filter(topic => ['generated', 'notified'].includes(topic.status)) ?? [], [data])
  const upcoming = useMemo(() => data?.topics.filter(topic => topic.status === 'planned').slice(0, 12) ?? [], [data])
  const queue = useMemo(() => data?.queue.filter(item => ['queued', 'processing', 'failed'].includes(item.status)).slice(0, 12) ?? [], [data])

  if (!data) {
    return (
      <div className="rounded-xl border p-8 text-center" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.35)' }}>
        <span className="inline-block w-5 h-5 rounded-full border-2 border-accent/25 border-t-accent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-wrap gap-3">
          {([
            ['Planned', data.stats.planned, '#64748B'],
            ['Waiting approval', data.stats.waitingApproval, '#F59E0B'],
            ['Approved', data.stats.approved, '#38BDF8'],
            ['Published', data.stats.published, '#10B981'],
            ['Failed', data.stats.failed + data.stats.queueFailed, '#F87171'],
            ['Overdue', data.stats.overdue, '#F97316'],
          ] as [string, number, string][]).map(([label, value, color]) => (
            <div key={label} className="rounded-xl border px-4 py-3 min-w-[140px]" style={{ borderColor: `${color}33`, background: 'rgba(15,13,26,.55)' }}>
              <div className="font-heading text-2xl font-bold" style={{ color }}>{value}</div>
              <div className="font-mono text-[10px]" style={{ color: '#9B8EC4' }}>{label}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="px-4 py-2 rounded-lg border font-mono text-xs text-accent" style={{ borderColor: 'rgba(124,58,237,.25)' }}>refresh</button>
          <button onClick={runFactory} disabled={running} className="px-4 py-2 rounded-lg bg-purple text-white font-mono text-xs disabled:opacity-60">
            {running ? 'running...' : 'run factory'}
          </button>
        </div>
      </div>

      {message && <div className="font-mono text-xs text-accent">{message}</div>}

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Panel title="Waiting LINE approval" subtitle="drafts that need your review">
          <Rows empty="ไม่มีงานรอ approve">
            {waiting.map(topic => (
              <TopicRow
                key={topic.id}
                topic={topic}
                actions={topic.articleId ? {
                  busy: actingTopicId === topic.id,
                  onApprove: () => actOnTopic(topic, 'approve'),
                  onReject: () => actOnTopic(topic, 'reject'),
                } : undefined}
              />
            ))}
          </Rows>
        </Panel>
        <Panel title="Upcoming topic plan" subtitle="auto-planned calendar topics">
          <Rows empty="ยังไม่มี topic ที่ plan ไว้">
            {upcoming.map(topic => <TopicRow key={topic.id} topic={topic} />)}
          </Rows>
        </Panel>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Panel title="Production drafts" subtitle="recent content created by factory or editors">
          <Rows empty="ไม่มี draft ล่าสุด">
            {data.drafts.map(draft => (
              <Link key={draft.id} href={`/admin/articles/${draft.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: statusColor[draft.status ?? 'draft'] ?? '#9B8EC4' }} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white truncate">{draft.title}</div>
                  <div className="font-mono text-[10px]" style={{ color: '#9B8EC4' }}>{draft.category ?? 'no category'} · GEO {draft.geoScore ?? 0}</div>
                </div>
                <span className="font-mono text-[10px]" style={{ color: '#9B8EC4' }}>{fmt(draft.publishScheduledAt)}</span>
              </Link>
            ))}
          </Rows>
        </Panel>
        <Panel title="Social queue" subtitle="per-platform publishing jobs">
          <Rows empty="queue ว่าง">
            {queue.map(item => (
              <Link key={item.id} href="/admin/social-queue" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: statusColor[item.status] ?? '#9B8EC4' }} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white capitalize">{item.platform}</div>
                  <div className="font-mono text-[10px] truncate" style={{ color: item.error ? '#F87171' : '#9B8EC4' }}>{item.error ?? item.articleId ?? '-'}</div>
                </div>
                <span className="font-mono text-[10px]" style={{ color: '#9B8EC4' }}>{item.status}</span>
              </Link>
            ))}
          </Rows>
        </Panel>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Panel title="Analytics feedback" subtitle="top categories by views">
          <Rows empty="ยังไม่มี analytics">
            {data.performance.map(row => (
              <div key={row.category} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-white">{row.category}</span>
                <span className="font-mono text-xs text-accent">{row.views}</span>
              </div>
            ))}
          </Rows>
        </Panel>
        <Panel title="Notifications" subtitle="factory and cron events">
          <Rows empty="ไม่มี notification">
            {data.notifications.slice(0, 8).map(row => (
              <div key={row.id} className="px-4 py-3">
                <div className="font-mono text-[10px]" style={{ color: row.severity === 'error' ? '#F87171' : '#A78BFA' }}>{row.name}</div>
                <div className="text-xs truncate" style={{ color: '#9B8EC4' }}>{row.message}</div>
              </div>
            ))}
          </Rows>
        </Panel>
        <Panel title="Recent publish attempts" subtitle="last platform outcomes">
          <Rows empty="ยังไม่มี attempt">
            {data.recentAttempts.slice(0, 8).map(row => (
              <div key={row.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: statusColor[row.status] ?? '#9B8EC4' }} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white capitalize">{row.platform}</div>
                  <div className="font-mono text-[10px] truncate" style={{ color: row.error ? '#F87171' : '#9B8EC4' }}>{row.error ?? row.status}</div>
                </div>
              </div>
            ))}
          </Rows>
        </Panel>
      </section>
    </div>
  )
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.35)' }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(124,58,237,.12)' }}>
        <h2 className="font-heading font-bold text-white">{title}</h2>
        <p className="text-xs" style={{ color: '#9B8EC4' }}>{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

function Rows({ children, empty }: { children: ReactNode[]; empty: string }) {
  return <div className="divide-y" style={{ borderColor: 'rgba(124,58,237,.08)' }}>{children.length ? children : <div className="px-4 py-10 text-center font-mono text-xs" style={{ color: '#9B8EC4' }}>{empty}</div>}</div>
}

function TopicRow({ topic, actions }: {
  topic: FactoryTopic
  actions?: { busy: boolean; onApprove: () => void; onReject: () => void }
}) {
  const color = statusColor[topic.status] ?? '#9B8EC4'
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/5">
      <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      <Link href={topic.articleId ? `/admin/articles/${topic.articleId}` : '/admin/calendar'} className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white truncate">{topic.topic}</div>
        <div className="font-mono text-[10px] truncate" style={{ color: topic.error ? '#F87171' : '#9B8EC4' }}>{topic.error ?? `${topic.category ?? 'auto'} · ${fmt(topic.scheduledAt)}`}</div>
      </Link>
      {actions && (
        <div className="flex items-center gap-2">
          <button type="button" disabled={actions.busy} onClick={actions.onApprove} className="font-mono text-[10px] text-emerald-300 hover:underline disabled:opacity-50">approve</button>
          <button type="button" disabled={actions.busy} onClick={actions.onReject} className="font-mono text-[10px] text-red-300 hover:underline disabled:opacity-50">reject</button>
        </div>
      )}
      <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ color, background: `${color}18` }}>{topic.status}</span>
    </div>
  )
}
