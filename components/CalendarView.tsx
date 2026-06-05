'use client'
import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'

interface CalArticle {
  id: string
  title: string
  status: string | null
  publishScheduledAt: Date | null
  publishedAt: Date | null
  coverImage: string | null
  category: string | null
  lineBroadcastSent: boolean | null
  fbSent: boolean | null
  igSent: boolean | null
  ttSent: boolean | null
  lineBroadcastMsg: string | null
  fbCaption: string | null
  igCaption: string | null
  ttCaption: string | null
}

interface FactoryTopic {
  id: string
  topic: string
  category: string | null
  tags: string[] | null
  status: string
  scheduledAt: Date
  articleId: string | null
  approvalToken: string | null
  lineNotifiedAt: Date | null
  approvedAt: Date | null
  error: string | null
}

type ViewMode = 'month' | 'week' | 'day' | 'list'

function articleDate(a: CalArticle): Date | null {
  if (a.publishScheduledAt) return new Date(a.publishScheduledAt)
  if (a.publishedAt) return new Date(a.publishedAt)
  return null
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function statusColor(a: CalArticle) {
  if (a.status === 'published') return '#10B981'
  if (a.status === 'approved') return '#38BDF8'
  if (a.status === 'review') return '#F59E0B'
  const d = articleDate(a)
  if (d && d < new Date()) return '#F87171'
  return '#A78BFA'
}

function PlatformDots({ a }: { a: CalArticle }) {
  const platforms = [
    { icon: '💬', sent: a.lineBroadcastSent, has: !!a.lineBroadcastMsg },
    { icon: '🔵', sent: a.fbSent, has: !!a.fbCaption },
    { icon: '📸', sent: a.igSent, has: !!a.igCaption },
    { icon: '🎵', sent: a.ttSent, has: !!a.ttCaption },
  ]
  return (
    <div className="flex items-center gap-1.5">
      {platforms.map((p, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5">
          <span className="text-xs leading-none">{p.icon}</span>
          <div className="w-1.5 h-1.5 rounded-full" style={{
            background: p.sent ? '#10B981' : p.has ? '#7C3AED' : 'rgba(255,255,255,.15)',
          }} />
        </div>
      ))}
    </div>
  )
}

function ArticleCard({ a }: { a: CalArticle }) {
  const d = articleDate(a)
  const color = statusColor(a)
  return (
    <Link href={`/admin/articles/${a.id}`}>
      <div className="flex items-center gap-3 rounded-xl border px-4 py-3 hover:border-purple/50 transition-colors cursor-pointer"
        style={{ borderColor: `${color}44`, background: 'rgba(15,13,26,.5)' }}>
        {a.coverImage
          ? <img src={a.coverImage} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 opacity-80" />
          : <div className="w-10 h-10 rounded-lg flex-shrink-0" style={{ background: 'rgba(124,58,237,.15)' }} />
        }
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white truncate">{a.title}</div>
          <div className="flex items-center gap-2 mt-0.5">
            {a.category && <span className="font-mono text-[10px]" style={{ color: '#A78BFA' }}>{a.category}</span>}
            {d && <span className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.5)' }}>
              {d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
            </span>}
          </div>
        </div>
        <PlatformDots a={a} />
        <span className="font-mono text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: `${color}18`, color }}>
          {a.status === 'published' ? 'เผยแพร่แล้ว' : d && d < new Date() ? 'เลยกำหนด' : a.status === 'approved' ? 'approved' : a.status === 'review' ? 'review' : 'draft'}
        </span>
      </div>
    </Link>
  )
}

function topicColor(topic: FactoryTopic) {
  if (topic.status === 'approved') return '#38BDF8'
  if (topic.status === 'notified') return '#F59E0B'
  if (topic.status === 'generated') return '#A78BFA'
  if (topic.status === 'rejected') return '#FB7185'
  if (topic.status === 'failed') return '#F87171'
  return '#64748B'
}

function TopicCard({ topic }: { topic: FactoryTopic }) {
  const color = topicColor(topic)
  const href = topic.articleId ? `/admin/articles/${topic.articleId}` : '/admin/calendar'
  return (
    <Link href={href}>
      <div className="flex items-center gap-3 rounded-xl border px-4 py-3 hover:border-purple/50 transition-colors cursor-pointer"
        style={{ borderColor: `${color}44`, background: 'rgba(15,13,26,.35)' }}>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 font-mono text-xs" style={{ background: `${color}18`, color }}>
          CF
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white truncate">{topic.topic}</div>
          <div className="flex items-center gap-2 mt-0.5">
            {topic.category && <span className="font-mono text-[10px]" style={{ color: '#A78BFA' }}>{topic.category}</span>}
            <span className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.5)' }}>
              {new Date(topic.scheduledAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {topic.approvalToken && topic.status !== 'approved' && (
              <span className="font-mono text-[10px]" style={{ color: '#F59E0B' }}>approve {topic.approvalToken}</span>
            )}
          </div>
        </div>
        <span className="font-mono text-[10px] px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: `${color}18`, color }}>
          {topic.status === 'planned' ? 'planned' : topic.status === 'notified' ? 'รอ LINE approve' : topic.status}
        </span>
      </div>
    </Link>
  )
}

// ── Month View ─────────────────────────────────────────────────────────────
function MonthView({ articles, factoryTopics, cursor, onDayClick }: {
  articles: CalArticle[]
  factoryTopics: FactoryTopic[]
  cursor: Date
  onDayClick: (d: Date) => void
}) {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstDay = new Date(year, month, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center font-mono text-[10px] py-1" style={{ color: 'rgba(155,142,196,.5)' }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const cellDate = new Date(year, month, day)
          const dayArticles = articles.filter(a => { const d = articleDate(a); return d && isSameDay(d, cellDate) })
          const dayTopics = factoryTopics.filter(t => isSameDay(new Date(t.scheduledAt), cellDate))
          const isToday = isSameDay(cellDate, today)
          return (
            <button
              key={i}
              onClick={() => onDayClick(cellDate)}
              className="rounded-lg p-1.5 text-left transition-colors hover:bg-white/5 min-h-[64px]"
              style={{ background: isToday ? 'rgba(124,58,237,.15)' : 'rgba(255,255,255,.02)', border: isToday ? '1px solid rgba(124,58,237,.4)' : '1px solid rgba(255,255,255,.04)' }}
            >
              <div className="font-mono text-xs font-bold mb-1" style={{ color: isToday ? '#A78BFA' : 'rgba(255,255,255,.7)' }}>
                {day}
              </div>
              <div className="space-y-0.5">
                {dayTopics.slice(0, 1).map(t => (
                  <div key={t.id} className="w-full truncate font-mono text-[9px] px-1 py-0.5 rounded"
                    style={{ background: `${topicColor(t)}20`, color: topicColor(t) }}>
                    CF · {t.topic}
                  </div>
                ))}
                {dayArticles.slice(0, 2 - dayTopics.slice(0, 1).length).map(a => (
                  <div key={a.id} className="w-full truncate font-mono text-[9px] px-1 py-0.5 rounded"
                    style={{ background: `${statusColor(a)}20`, color: statusColor(a) }}>
                    {a.title}
                  </div>
                ))}
                {dayArticles.length + dayTopics.length > 2 && (
                  <div className="font-mono text-[9px] px-1" style={{ color: 'rgba(155,142,196,.5)' }}>+{dayArticles.length + dayTopics.length - 2} more</div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Week View ──────────────────────────────────────────────────────────────
function WeekView({ articles, factoryTopics, cursor, onDayClick }: {
  articles: CalArticle[]
  factoryTopics: FactoryTopic[]
  cursor: Date
  onDayClick: (d: Date) => void
}) {
  const today = new Date()
  const startOfWeek = new Date(cursor)
  startOfWeek.setDate(cursor.getDate() - cursor.getDay())

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return d
  })

  const DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day, i) => {
        const dayArticles = articles.filter(a => { const d = articleDate(a); return d && isSameDay(d, day) })
        const dayTopics = factoryTopics.filter(t => isSameDay(new Date(t.scheduledAt), day))
        const isToday = isSameDay(day, today)
        return (
          <button key={i} onClick={() => onDayClick(day)} className="rounded-xl p-2 text-left transition-colors hover:bg-white/5 min-h-[120px]"
            style={{ background: isToday ? 'rgba(124,58,237,.12)' : 'rgba(255,255,255,.02)', border: isToday ? '1px solid rgba(124,58,237,.4)' : '1px solid rgba(255,255,255,.06)' }}>
            <div className="font-mono text-[10px] mb-0.5" style={{ color: 'rgba(155,142,196,.5)' }}>{DAYS[i]}</div>
            <div className="font-mono text-sm font-bold mb-2" style={{ color: isToday ? '#A78BFA' : 'rgba(255,255,255,.8)' }}>
              {day.getDate()}
            </div>
            <div className="space-y-1">
              {dayTopics.map(t => (
                <div key={t.id} className="w-full truncate font-mono text-[9px] px-1.5 py-1 rounded"
                  style={{ background: `${topicColor(t)}20`, color: topicColor(t) }}>
                  CF · {t.topic}
                </div>
              ))}
              {dayArticles.map(a => (
                <div key={a.id} className="w-full truncate font-mono text-[9px] px-1.5 py-1 rounded"
                  style={{ background: `${statusColor(a)}20`, color: statusColor(a) }}>
                  {a.title}
                </div>
              ))}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ── Day View ───────────────────────────────────────────────────────────────
function DayView({ articles, factoryTopics, cursor }: { articles: CalArticle[]; factoryTopics: FactoryTopic[]; cursor: Date }) {
  const dayArticles = articles.filter(a => { const d = articleDate(a); return d && isSameDay(d, cursor) })
  const dayTopics = factoryTopics.filter(t => isSameDay(new Date(t.scheduledAt), cursor))
  return (
    <div>
      <div className="font-mono text-xs mb-4" style={{ color: 'rgba(155,142,196,.5)' }}>
        {cursor.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
      {dayArticles.length === 0 && dayTopics.length === 0
        ? <div className="text-center py-12 font-mono text-sm" style={{ color: 'rgba(155,142,196,.4)' }}>ไม่มีบทความในวันนี้</div>
        : <div className="space-y-2">
            {dayTopics.map(t => <TopicCard key={t.id} topic={t} />)}
            {dayArticles.map(a => <ArticleCard key={a.id} a={a} />)}
          </div>
      }
    </div>
  )
}

// ── List View ──────────────────────────────────────────────────────────────
const LIST_PAGE_SIZE = 20

function SectionList({ label, items, resetKey }: { label: string; items: CalArticle[]; resetKey: unknown }) {
  const [shown, setShown] = useState(LIST_PAGE_SIZE)
  useEffect(() => { setShown(LIST_PAGE_SIZE) }, [resetKey])
  if (items.length === 0) return null
  return (
    <div>
      <div className="font-mono text-xs font-bold text-white mb-3">{label} <span className="text-purple ml-1">({items.length})</span></div>
      <div className="space-y-2">
        {items.slice(0, shown).map(a => <ArticleCard key={a.id} a={a} />)}
      </div>
      {shown < items.length && (
        <button
          onClick={() => setShown(s => s + LIST_PAGE_SIZE)}
          className="mt-3 w-full py-2 rounded-lg font-mono text-xs border transition-colors hover:bg-white/5"
          style={{ borderColor: 'rgba(124,58,237,.2)', color: 'rgba(155,142,196,.6)' }}
        >
          แสดงเพิ่มอีก {Math.min(LIST_PAGE_SIZE, items.length - shown)} รายการ (เหลือ {items.length - shown})
        </button>
      )}
    </div>
  )
}

function ListView({ articles, factoryTopics, resetKey }: { articles: CalArticle[]; factoryTopics: FactoryTopic[]; resetKey: unknown }) {
  const scheduled = articles.filter(a => a.publishScheduledAt && a.status !== 'published')
  const published = articles.filter(a => a.status === 'published')
  const unscheduled = articles.filter(a => !a.publishScheduledAt && a.status !== 'published')

  return (
    <div className="space-y-6">
      {factoryTopics.length > 0 && (
        <div>
          <div className="font-mono text-xs font-bold text-white mb-3">🧠 Content Factory <span className="text-purple ml-1">({factoryTopics.length})</span></div>
          <div className="space-y-2">{factoryTopics.map(t => <TopicCard key={t.id} topic={t} />)}</div>
        </div>
      )}
      <SectionList label="📅 รอเผยแพร่ตามกำหนด" items={scheduled} resetKey={resetKey} />
      <SectionList label="📝 Draft — ยังไม่ได้กำหนดเวลา" items={unscheduled} resetKey={resetKey} />
      <SectionList label="✓ เผยแพร่แล้ว" items={published} resetKey={resetKey} />
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export function CalendarView({ articles, factoryTopics = [] }: { articles: CalArticle[]; factoryTopics?: FactoryTopic[] }) {
  const [view, setView] = useState<ViewMode>('month')
  const [cursor, setCursor] = useState(new Date())
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('ทั้งหมด')
  const [factoryLoading, setFactoryLoading] = useState(false)
  const [factoryMsg, setFactoryMsg] = useState('')

  const filtered = useMemo(() => {
    return articles.filter(a => {
      if (statusFilter !== 'ทั้งหมด' && a.status !== statusFilter) return false
      if (q.trim()) {
        const s = q.toLowerCase()
        return (a.title ?? '').toLowerCase().includes(s) || (a.category ?? '').toLowerCase().includes(s)
      }
      return true
    })
  }, [articles, q, statusFilter])

  const filteredTopics = useMemo(() => {
    return factoryTopics.filter(t => {
      if (q.trim()) {
        const s = q.toLowerCase()
        return t.topic.toLowerCase().includes(s) || (t.category ?? '').toLowerCase().includes(s)
      }
      return true
    })
  }, [factoryTopics, q])

  const runFactory = async () => {
    setFactoryLoading(true)
    setFactoryMsg('')
    try {
      const res = await fetch('/api/content-factory/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 2 }),
      })
      const data = await res.json()
      setFactoryMsg(data.skipped ? `Skipped: ${data.reason}` : `Generated ${data.generated ?? 0} item(s)`)
      if (res.ok) setTimeout(() => window.location.reload(), 900)
    } catch (error) {
      setFactoryMsg(String(error))
    } finally {
      setFactoryLoading(false)
    }
  }

  const navigate = (dir: -1 | 1) => {
    const next = new Date(cursor)
    if (view === 'month') next.setMonth(cursor.getMonth() + dir)
    else if (view === 'week') next.setDate(cursor.getDate() + dir * 7)
    else next.setDate(cursor.getDate() + dir)
    setCursor(next)
  }

  const handleDayClick = (d: Date) => {
    setCursor(d)
    setView('day')
  }

  const headerLabel = () => {
    if (view === 'month') return cursor.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
    if (view === 'week') {
      const start = new Date(cursor); start.setDate(cursor.getDate() - cursor.getDay())
      const end = new Date(start); end.setDate(start.getDate() + 6)
      return `${start.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}`
    }
    return cursor.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  const VIEWS: { key: ViewMode; label: string }[] = [
    { key: 'month', label: 'เดือน' },
    { key: 'week', label: 'สัปดาห์' },
    { key: 'day', label: 'วัน' },
    { key: 'list', label: 'รายการ' },
  ]

  return (
    <div>
      {/* Search + status filter */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'rgba(155,142,196,.5)' }}>🔍</span>
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="ค้นหาชื่อบทความ..."
            className="w-full pl-8 pr-3 py-2 rounded-lg border text-white text-sm outline-none"
            style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)', color: '#fff' }}
          />
          {q && <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs" style={{ color: 'rgba(155,142,196,.5)' }}>✕</button>}
        </div>
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'rgba(124,58,237,.25)' }}>
          {['ทั้งหมด', 'published', 'approved', 'review', 'draft'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="px-3 py-2 font-mono text-xs transition-colors"
              style={{ background: statusFilter === s ? 'rgba(124,58,237,.4)' : 'transparent', color: statusFilter === s ? '#fff' : 'rgba(155,142,196,.6)' }}>
              {s === 'published' ? 'เผยแพร่' : s === 'approved' ? 'Approved' : s === 'review' ? 'Review' : s === 'draft' ? 'Draft' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {/* View tabs */}
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'rgba(124,58,237,.25)' }}>
          {VIEWS.map(v => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className="px-3 py-1.5 font-mono text-xs transition-colors"
              style={{
                background: view === v.key ? 'rgba(124,58,237,.4)' : 'transparent',
                color: view === v.key ? '#fff' : 'rgba(155,142,196,.6)',
              }}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Nav arrows + label */}
        {view !== 'list' && (
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="w-7 h-7 rounded-lg flex items-center justify-center text-sm hover:bg-white/10 transition-colors" style={{ color: '#A78BFA' }}>‹</button>
            <span className="font-mono text-xs font-bold text-white min-w-[140px] text-center">{headerLabel()}</span>
            <button onClick={() => navigate(1)} className="w-7 h-7 rounded-lg flex items-center justify-center text-sm hover:bg-white/10 transition-colors" style={{ color: '#A78BFA' }}>›</button>
          </div>
        )}

        <button
          onClick={() => setCursor(new Date())}
          className="font-mono text-[10px] px-2 py-1 rounded border hover:bg-white/5 transition-colors ml-auto"
          style={{ borderColor: 'rgba(124,58,237,.25)', color: 'rgba(155,142,196,.6)' }}
        >
          วันนี้
        </button>
        <button
          onClick={runFactory}
          disabled={factoryLoading}
          className="font-mono text-[10px] px-3 py-1 rounded border hover:bg-purple/10 transition-colors disabled:opacity-50"
          style={{ borderColor: 'rgba(124,58,237,.35)', color: '#A78BFA' }}
        >
          {factoryLoading ? 'Generating...' : 'Run Content Factory'}
        </button>
      </div>
      {factoryMsg && <div className="mb-4 font-mono text-xs" style={{ color: factoryMsg.startsWith('Generated') ? '#10B981' : '#F59E0B' }}>{factoryMsg}</div>}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4">
        <span className="flex items-center gap-1 font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.5)' }}><span className="w-2 h-2 rounded-full inline-block bg-green-500" /> เผยแพร่แล้ว</span>
        <span className="flex items-center gap-1 font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.5)' }}><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#A78BFA' }} /> รอโพสต์</span>
        <span className="flex items-center gap-1 font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.5)' }}><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#F87171' }} /> เลยกำหนด</span>
        <span className="flex items-center gap-1 font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.5)' }}><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#F59E0B' }} /> รอ LINE approve</span>
      </div>

      {/* View content */}
      {view === 'month' && <MonthView articles={filtered} factoryTopics={filteredTopics} cursor={cursor} onDayClick={handleDayClick} />}
      {view === 'week' && <WeekView articles={filtered} factoryTopics={filteredTopics} cursor={cursor} onDayClick={handleDayClick} />}
      {view === 'day' && <DayView articles={filtered} factoryTopics={filteredTopics} cursor={cursor} />}
      {view === 'list' && <ListView articles={filtered} factoryTopics={filteredTopics} resetKey={`${q}|${statusFilter}`} />}
    </div>
  )
}
