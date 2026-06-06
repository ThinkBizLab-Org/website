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
  contentBrief: ContentBrief | null
  articleId: string | null
  approvalToken: string | null
  error: string | null
}

type ContentBrief = {
  targetAudience?: string
  angle?: string
  primaryKeywords?: string[]
  outline?: string[]
  cta?: string
  socialObjective?: string
  risks?: string[]
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
  seriesPlansRaw: string
  seriesPlans: ContentSeriesPlan[]
  trendNewsRaw: string
  trendNewsInputs: TrendNewsInput[]
  approvalSla: ApprovalSlaData
}

type ApprovalSlaData = {
  enabled: boolean
  hours: number
  breached: ApprovalSlaBreach[]
}

type ApprovalSlaBreach = {
  id: string
  topic: string
  status: string
  ageHours: number
  waitingSince: string
  scheduledAt: string
  articleId: string | null
}

type ContentSeriesPlan = {
  title: string
  category: string
  tags: string[]
  episodes: string[]
  objective: string | null
  priority: number
}

type TrendNewsInput = {
  headline: string
  category: string
  tags: string[]
  source: string | null
  angle: string | null
  priority: number
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
  const [seriesRaw, setSeriesRaw] = useState('')
  const [seriesSaving, setSeriesSaving] = useState(false)
  const [trendRaw, setTrendRaw] = useState('')
  const [trendSaving, setTrendSaving] = useState(false)
  const [slaEnabled, setSlaEnabled] = useState(true)
  const [slaHours, setSlaHours] = useState(24)
  const [slaSaving, setSlaSaving] = useState(false)

  async function load() {
    const res = await fetch('/api/content-factory/dashboard')
    const json = await res.json()
    if (res.ok) {
      setData(json)
      setSeriesRaw(json.seriesPlansRaw ?? '')
      setTrendRaw(json.trendNewsRaw ?? '')
      setSlaEnabled(json.approvalSla?.enabled !== false)
      setSlaHours(Number(json.approvalSla?.hours ?? 24))
    } else {
      setMessage(json.error ?? 'Cannot load dashboard')
    }
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

  async function actOnTopic(topic: FactoryTopic, action: 'approve' | 'reject' | 'requeue' | 'generate_brief') {
    if (action === 'reject') {
      const reason = window.prompt('Reject reason')
      if (reason === null) return
      await submitTopicAction(topic, action, reason)
      return
    }
    await submitTopicAction(topic, action)
  }

  async function submitTopicAction(topic: FactoryTopic, action: 'approve' | 'reject' | 'requeue' | 'generate_brief', reason = '') {
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

  async function saveTrendNewsInput() {
    setTrendSaving(true)
    setMessage('')
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_factory_trend_news_inputs: trendRaw }),
    })
    const json = await res.json()
    setMessage(res.ok ? 'Trend/news input saved' : json.error ?? 'Save trend/news failed')
    setTrendSaving(false)
    load()
  }

  async function saveSeriesPlans() {
    setSeriesSaving(true)
    setMessage('')
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_factory_series_plans: seriesRaw }),
    })
    const json = await res.json()
    setMessage(res.ok ? 'Content series saved' : json.error ?? 'Save content series failed')
    setSeriesSaving(false)
    load()
  }

  async function saveApprovalSlaSettings(nextEnabled = slaEnabled, nextHours = slaHours) {
    setSlaSaving(true)
    setMessage('')
    const normalizedHours = Math.max(1, Math.min(168, Number(nextHours) || 24))
    const enabledRes = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_factory_approval_sla_enabled: nextEnabled }),
    })
    const hoursRes = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_factory_approval_sla_hours: normalizedHours }),
    })
    const json = enabledRes.ok && hoursRes.ok ? {} : await (enabledRes.ok ? hoursRes : enabledRes).json()
    setSlaHours(normalizedHours)
    setMessage(enabledRes.ok && hoursRes.ok ? 'Approval SLA settings saved' : json.error ?? 'Save approval SLA failed')
    setSlaSaving(false)
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
            ['SLA breached', data.stats.approvalSlaBreached, '#FB7185'],
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

      <Panel title="Approval SLA Alerts" subtitle="LINE alerts for review work that waits too long">
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4 p-4">
          <div className="rounded-lg border p-4" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(15,13,26,.45)' }}>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-white">Enable alerts</span>
              <button
                type="button"
                onClick={() => {
                  const next = !slaEnabled
                  setSlaEnabled(next)
                  saveApprovalSlaSettings(next, slaHours)
                }}
                disabled={slaSaving}
                className="relative h-6 w-12 rounded-full transition-colors disabled:opacity-60"
                style={{ background: slaEnabled ? '#7C3AED' : 'rgba(255,255,255,.15)' }}
              >
                <span className="absolute top-1 h-4 w-4 rounded-full bg-white transition-transform" style={{ left: 4, transform: slaEnabled ? 'translateX(24px)' : 'translateX(0)' }} />
              </button>
            </label>
            <label className="mt-4 block">
              <span className="font-mono text-[10px]" style={{ color: '#9B8EC4' }}>SLA hours</span>
              <input
                type="number"
                min={1}
                max={168}
                value={slaHours}
                onChange={event => setSlaHours(Number(event.target.value))}
                onBlur={() => saveApprovalSlaSettings(slaEnabled, slaHours)}
                className="mt-1 w-full rounded-lg border px-3 py-2 bg-transparent text-sm text-white outline-none"
                style={{ borderColor: 'rgba(124,58,237,.25)' }}
              />
            </label>
          </div>
          <Rows empty="ไม่มีงานค้างเกิน SLA">
            {data.approvalSla.breached.slice(0, 8).map(item => (
              <Link key={item.id} href={item.articleId ? `/admin/articles/${item.articleId}` : '/admin/content-factory'} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#FB7185' }} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white truncate">{item.topic}</div>
                  <div className="font-mono text-[10px] truncate" style={{ color: '#9B8EC4' }}>
                    {item.status} · {Math.round(item.ageHours)}h waiting · since {fmt(item.waitingSince)}
                  </div>
                </div>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded text-red-300" style={{ background: 'rgba(251,113,133,.12)' }}>SLA</span>
              </Link>
            ))}
          </Rows>
        </div>
      </Panel>

      <Panel title="Content Series Planner" subtitle="multi-episode article series that become priority calendar topics">
        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_.8fr] gap-4 p-4">
          <div>
            <textarea
              value={seriesRaw}
              onChange={event => setSeriesRaw(event.target.value)}
              rows={8}
              className="w-full rounded-lg border px-3 py-3 bg-transparent text-sm text-white outline-none"
              style={{ borderColor: 'rgba(124,58,237,.25)' }}
              placeholder="!SME Cashflow Masterclass | Finance | SME, Cashflow | วาง cash conversion cycle; ลด dead stock; เร่งเก็บเงินลูกค้า | สอนเจ้าของกิจการคุมเงินสด | 5"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="font-mono text-[10px]" style={{ color: '#9B8EC4' }}>
                format: series title | category | tags | ep1; ep2; ep3 | objective | priority 1-5
              </div>
              <button
                type="button"
                onClick={saveSeriesPlans}
                disabled={seriesSaving}
                className="px-4 py-2 rounded-lg bg-purple text-white font-mono text-xs disabled:opacity-60"
              >
                {seriesSaving ? 'saving...' : 'save series'}
              </button>
            </div>
          </div>
          <Rows empty="ยังไม่มี content series">
            {data.seriesPlans.slice(0, 8).map((item, index) => (
              <div key={`${item.title}-${index}`} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{item.title}</div>
                    <div className="font-mono text-[10px] truncate" style={{ color: '#9B8EC4' }}>
                      {item.category} · {item.episodes.length} episodes · priority {item.priority}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.episodes.slice(0, 6).map((episode, episodeIndex) => (
                        <span key={`${episode}-${episodeIndex}`} className="rounded border px-2 py-1 font-mono text-[10px]" style={{ borderColor: 'rgba(124,58,237,.2)', color: '#A78BFA' }}>
                          EP.{episodeIndex + 1} {episode}
                        </span>
                      ))}
                    </div>
                    {item.objective && <div className="text-xs truncate mt-2" style={{ color: '#A78BFA' }}>{item.objective}</div>}
                  </div>
                </div>
              </div>
            ))}
          </Rows>
        </div>
      </Panel>

      <Panel title="Trend / News Input" subtitle="curated signals that become priority content topics">
        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_.8fr] gap-4 p-4">
          <div>
            <textarea
              value={trendRaw}
              onChange={event => setTrendRaw(event.target.value)}
              rows={8}
              className="w-full rounded-lg border px-3 py-3 bg-transparent text-sm text-white outline-none"
              style={{ borderColor: 'rgba(124,58,237,.25)' }}
              placeholder="!ค่าแรงขั้นต่ำปรับขึ้นกระทบ SME | Finance | SME, Cost | https://... | เจ้าของกิจการควรคุมต้นทุนอย่างไร | 5"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="font-mono text-[10px]" style={{ color: '#9B8EC4' }}>
                format: headline | category | tags | source | angle | priority 1-5
              </div>
              <button
                type="button"
                onClick={saveTrendNewsInput}
                disabled={trendSaving}
                className="px-4 py-2 rounded-lg bg-purple text-white font-mono text-xs disabled:opacity-60"
              >
                {trendSaving ? 'saving...' : 'save input'}
              </button>
            </div>
          </div>
          <Rows empty="ยังไม่มี trend/news input">
            {data.trendNewsInputs.slice(0, 8).map((item, index) => (
              <div key={`${item.headline}-${index}`} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{item.headline}</div>
                    <div className="font-mono text-[10px] truncate" style={{ color: '#9B8EC4' }}>
                      {item.category} · priority {item.priority}{item.tags.length ? ` · ${item.tags.join(', ')}` : ''}
                    </div>
                    {item.angle && <div className="text-xs truncate mt-1" style={{ color: '#A78BFA' }}>{item.angle}</div>}
                  </div>
                  {item.source && <span className="font-mono text-[10px] text-accent shrink-0">source</span>}
                </div>
              </div>
            ))}
          </Rows>
        </div>
      </Panel>

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
            {upcoming.map(topic => (
              <TopicRow
                key={topic.id}
                topic={topic}
                actions={{
                  busy: actingTopicId === topic.id,
                  onGenerateBrief: () => actOnTopic(topic, 'generate_brief'),
                }}
              />
            ))}
          </Rows>
        </Panel>
      </section>

      {data.failures.length > 0 && (
        <section>
          <Panel title="Rework queue" subtitle="rejected or failed topics that can be generated again">
            <Rows empty="ไม่มี topic ที่ต้อง rework">
              {data.failures.map(topic => (
                <TopicRow
                  key={topic.id}
                  topic={topic}
                  actions={{
                    busy: actingTopicId === topic.id,
                    onRequeue: () => actOnTopic(topic, 'requeue'),
                  }}
                />
              ))}
            </Rows>
          </Panel>
        </section>
      )}

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
  actions?: { busy: boolean; onApprove?: () => void; onReject?: () => void; onRequeue?: () => void; onGenerateBrief?: () => void }
}) {
  const color = statusColor[topic.status] ?? '#9B8EC4'
  const brief = topic.contentBrief
  return (
    <div className="px-4 py-3 hover:bg-white/5">
      <div className="flex items-center gap-3">
      <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      <Link href={topic.articleId ? `/admin/articles/${topic.articleId}` : '/admin/calendar'} className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white truncate">{topic.topic}</div>
        <div className="font-mono text-[10px] truncate" style={{ color: topic.error ? '#F87171' : '#9B8EC4' }}>{topic.error ?? `${topic.category ?? 'auto'} · ${fmt(topic.scheduledAt)}`}</div>
      </Link>
      {actions && (
        <div className="flex items-center gap-2">
          {actions.onApprove && <button type="button" disabled={actions.busy} onClick={actions.onApprove} className="font-mono text-[10px] text-emerald-300 hover:underline disabled:opacity-50">approve</button>}
          {actions.onReject && <button type="button" disabled={actions.busy} onClick={actions.onReject} className="font-mono text-[10px] text-red-300 hover:underline disabled:opacity-50">reject</button>}
          {actions.onRequeue && <button type="button" disabled={actions.busy} onClick={actions.onRequeue} className="font-mono text-[10px] text-accent hover:underline disabled:opacity-50">requeue</button>}
          {actions.onGenerateBrief && <button type="button" disabled={actions.busy} onClick={actions.onGenerateBrief} className="font-mono text-[10px] text-accent hover:underline disabled:opacity-50">{brief ? 'regen brief' : 'brief'}</button>}
        </div>
      )}
      <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ color, background: `${color}18` }}>{topic.status}</span>
      </div>
      {brief && (
        <div className="mt-3 ml-5 rounded-lg border px-3 py-2" style={{ borderColor: 'rgba(124,58,237,.16)', background: 'rgba(15,13,26,.45)' }}>
          <div className="font-mono text-[10px] text-purple mb-1">BRIEF</div>
          <div className="grid gap-1 text-xs" style={{ color: '#9B8EC4' }}>
            {brief.targetAudience && <div><span className="text-white">Audience:</span> {brief.targetAudience}</div>}
            {brief.angle && <div><span className="text-white">Angle:</span> {brief.angle}</div>}
            {brief.primaryKeywords?.length ? <div><span className="text-white">Keywords:</span> {brief.primaryKeywords.join(', ')}</div> : null}
            {brief.cta && <div><span className="text-white">CTA:</span> {brief.cta}</div>}
          </div>
        </div>
      )}
    </div>
  )
}
