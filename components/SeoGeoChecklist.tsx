'use client'

type FAQ = { q: string; a: string }

type ChecklistInput = {
  title: string
  slug: string
  excerpt: string
  content: string
  coverImage: string
  category: string
  tags: string
  aiSummaryQ: string
  aiSummaryA: string
  keyPoints: string
  faq: FAQ[]
  geoScore: number
}

export function SeoGeoChecklist({ data }: { data: ChecklistInput }) {
  const tags = data.tags.split(',').map(tag => tag.trim()).filter(Boolean)
  const keyPoints = data.keyPoints.split('\n').map(item => item.trim()).filter(Boolean)
  const plainContent = data.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const wordCount = plainContent.split(/\s+/).filter(Boolean).length

  const checks = [
    {
      label: 'Title 35-70 chars',
      ok: data.title.trim().length >= 35 && data.title.trim().length <= 70,
      hint: `${data.title.trim().length} chars`,
    },
    {
      label: 'Slug ready',
      ok: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug.trim()),
      hint: data.slug || 'missing',
    },
    {
      label: 'Excerpt 80-180 chars',
      ok: data.excerpt.trim().length >= 80 && data.excerpt.trim().length <= 180,
      hint: `${data.excerpt.trim().length} chars`,
    },
    {
      label: 'Cover image',
      ok: Boolean(data.coverImage.trim()),
      hint: data.coverImage ? 'set' : 'missing',
    },
    {
      label: 'Category + tags',
      ok: Boolean(data.category.trim()) && tags.length >= 3,
      hint: `${data.category || 'no category'} / ${tags.length} tags`,
    },
    {
      label: 'AI summary Q&A',
      ok: Boolean(data.aiSummaryQ.trim()) && Boolean(data.aiSummaryA.trim()),
      hint: data.aiSummaryQ && data.aiSummaryA ? 'ready' : 'missing',
    },
    {
      label: 'Key points',
      ok: keyPoints.length >= 3,
      hint: `${keyPoints.length} points`,
    },
    {
      label: 'FAQ schema',
      ok: data.faq.filter(item => item.q.trim() && item.a.trim()).length >= 2,
      hint: `${data.faq.length} FAQs`,
    },
    {
      label: 'Content depth',
      ok: wordCount >= 700 || plainContent.length >= 3500,
      hint: `${wordCount} words`,
    },
    {
      label: 'Question heading',
      ok: /<h[23][^>]*>[^<]*(\?|ทำไม|อย่างไร|คืออะไร|เท่าไร|เมื่อไร)/i.test(data.content),
      hint: 'AI-answer friendly',
    },
    {
      label: 'Internal link',
      ok: /href=["']\/articles\//.test(data.content) || /href=["']https?:\/\/(www\.)?thinkbizlab\.com\/articles\//.test(data.content),
      hint: 'link to related article',
    },
    {
      label: 'GEO score 80+',
      ok: data.geoScore >= 80,
      hint: `${data.geoScore}/100`,
    },
  ]

  const passed = checks.filter(item => item.ok).length
  const pct = Math.round((passed / checks.length) * 100)
  const color = pct >= 80 ? '#10B981' : pct >= 60 ? '#F59E0B' : '#F87171'

  return (
    <section className="rounded-xl border p-4" style={{ borderColor: 'rgba(124,58,237,.22)', background: 'rgba(15,13,26,.5)' }}>
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="font-heading text-lg font-bold text-white">SEO / GEO Checklist</h2>
          <p className="font-mono text-xs" style={{ color: '#9B8EC4' }}>ตรวจ readiness ก่อน approve หรือ publish</p>
        </div>
        <div className="text-right">
          <div className="font-heading text-2xl font-bold" style={{ color }}>{pct}%</div>
          <div className="font-mono text-[10px]" style={{ color: '#9B8EC4' }}>{passed}/{checks.length}</div>
        </div>
      </div>

      <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-4">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        {checks.map(item => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border"
            style={{
              borderColor: item.ok ? 'rgba(16,185,129,.22)' : 'rgba(245,158,11,.2)',
              background: item.ok ? 'rgba(16,185,129,.06)' : 'rgba(245,158,11,.06)',
            }}
          >
            <span className="text-sm text-white">{item.ok ? '✓' : '○'} {item.label}</span>
            <span className="font-mono text-[10px] text-right" style={{ color: item.ok ? '#10B981' : '#F59E0B' }}>{item.hint}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
