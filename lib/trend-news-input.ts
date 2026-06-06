export type TrendNewsInput = {
  headline: string
  category: string
  tags: string[]
  source: string | null
  angle: string | null
  priority: number
}

export type TrendNewsTopicSeed = {
  topic: string
  category: string
  tags: string[]
}

const DEFAULT_CATEGORY = 'Strategy'
const DEFAULT_PRIORITY = 3

export function parseTrendNewsInputs(raw: string): TrendNewsInput[] {
  return raw
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(parseTrendNewsLine)
    .filter((item): item is TrendNewsInput => Boolean(item))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 50)
}

export function trendNewsToTopicSeeds(raw: string): TrendNewsTopicSeed[] {
  return parseTrendNewsInputs(raw).map(item => ({
    topic: topicFromTrend(item),
    category: item.category,
    tags: uniqueTags([...item.tags, 'Trend', 'News']).slice(0, 8),
  }))
}

function parseTrendNewsLine(line: string): TrendNewsInput | null {
  const parts = line.split('|').map(part => part.trim())
  const headline = stripPriorityMarker(parts[0] ?? '')
  if (!headline) return null

  return {
    headline,
    category: parts[1] || DEFAULT_CATEGORY,
    tags: parseTags(parts[2] ?? ''),
    source: parts[3] || null,
    angle: parts[4] || null,
    priority: parsePriority(parts[5] ?? '', parts[0] ?? ''),
  }
}

function topicFromTrend(item: TrendNewsInput) {
  if (/[?？]$/.test(item.headline)) return item.headline
  if (item.angle) return `${item.headline}: ${item.angle}`
  return `${item.headline}: SME ควรปรับตัวอย่างไร?`
}

function parseTags(value: string) {
  return uniqueTags(value.split(',').map(tag => tag.trim()).filter(Boolean))
}

function uniqueTags(tags: string[]) {
  return Array.from(new Set(tags.map(tag => tag.trim()).filter(Boolean)))
}

function parsePriority(value: string, headline: string) {
  const normalized = value.trim()
  if (normalized) {
    const parsed = Number(normalized)
    if (Number.isFinite(parsed)) return Math.max(1, Math.min(5, Math.round(parsed)))
  }
  if (headline.startsWith('!')) return 5
  return DEFAULT_PRIORITY
}

function stripPriorityMarker(value: string) {
  return value.replace(/^!+\s*/, '').trim()
}
