import type { Article } from './schema'
import { calculateGEOScore } from './geo-score'

export type ContentQualityCheck = {
  key: string
  label: string
  ok: boolean
  detail: string
  severity: 'blocker' | 'warning' | 'info'
}

export type ContentQualityGate = {
  score: number
  passed: boolean
  checks: ContentQualityCheck[]
}

export function evaluateContentQuality(article: Partial<Article>): ContentQualityGate {
  const content = article.content ?? ''
  const plain = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const slugReady = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug ?? '')
  const faqCount = Array.isArray(article.faqJson) ? article.faqJson.length : 0
  const geoScore = article.geoScore ?? calculateGEOScore(article)
  const internalLinks = (content.match(/href=["']\/(?:articles|topics|tags)\//g)?.length ?? 0)
    + (content.match(/\]\(\/(?:articles|topics|tags)\//g)?.length ?? 0)

  const checks: ContentQualityCheck[] = [
    {
      key: 'title',
      label: 'Title 35-70 chars',
      ok: between(article.title?.length ?? 0, 35, 70),
      detail: `${article.title?.length ?? 0} chars`,
      severity: 'warning',
    },
    {
      key: 'excerpt',
      label: 'Excerpt 80-180 chars',
      ok: between(article.excerpt?.length ?? 0, 80, 180),
      detail: `${article.excerpt?.length ?? 0} chars`,
      severity: 'warning',
    },
    {
      key: 'slug',
      label: 'Slug ready',
      ok: slugReady,
      detail: article.slug ?? 'missing',
      severity: 'blocker',
    },
    {
      key: 'cover',
      label: 'Cover image',
      ok: Boolean(article.coverImage),
      detail: article.coverImage ? 'set' : 'missing',
      severity: 'warning',
    },
    {
      key: 'category_tags',
      label: 'Category + tags',
      ok: Boolean(article.category) && (article.tags?.length ?? 0) >= 3,
      detail: `${article.category ?? 'no category'} / ${article.tags?.length ?? 0} tags`,
      severity: 'warning',
    },
    {
      key: 'ai_summary',
      label: 'AI summary Q&A',
      ok: Boolean(article.aiSummaryQ && article.aiSummaryA),
      detail: article.aiSummaryQ && article.aiSummaryA ? 'ready' : 'missing',
      severity: 'warning',
    },
    {
      key: 'key_points',
      label: 'Key points',
      ok: (article.keyPoints?.length ?? 0) >= 3,
      detail: `${article.keyPoints?.length ?? 0} points`,
      severity: 'warning',
    },
    {
      key: 'faq',
      label: 'FAQ schema',
      ok: faqCount >= 2,
      detail: `${faqCount} FAQs`,
      severity: 'warning',
    },
    {
      key: 'depth',
      label: 'Content depth',
      ok: plain.length >= 1500,
      detail: `${plain.length} chars`,
      severity: 'warning',
    },
    {
      key: 'internal_link',
      label: 'Internal link',
      ok: internalLinks > 0,
      detail: internalLinks > 0 ? `${internalLinks} links` : 'link to related article',
      severity: 'info',
    },
    {
      key: 'geo_score',
      label: 'GEO score 80+',
      ok: geoScore >= 80,
      detail: `${geoScore}/100`,
      severity: 'warning',
    },
  ]

  const passed = checks.filter(check => check.severity === 'blocker').every(check => check.ok)
    && checks.filter(check => check.severity === 'warning').filter(check => !check.ok).length <= 2

  return {
    score: Math.round((checks.filter(check => check.ok).length / checks.length) * 100),
    passed,
    checks,
  }
}

function between(value: number, min: number, max: number) {
  return value >= min && value <= max
}
