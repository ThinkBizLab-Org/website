export type ContentSeriesPlan = {
  title: string
  category: string
  tags: string[]
  episodes: string[]
  objective: string | null
  priority: number
}

export type ContentSeriesTopicSeed = {
  topic: string
  category: string
  tags: string[]
}

const DEFAULT_CATEGORY = 'Strategy'
const DEFAULT_PRIORITY = 3

export function parseContentSeriesPlans(raw: string): ContentSeriesPlan[] {
  return raw
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(parseSeriesLine)
    .filter((item): item is ContentSeriesPlan => Boolean(item))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 30)
}

export function contentSeriesToTopicSeeds(raw: string): ContentSeriesTopicSeed[] {
  return parseContentSeriesPlans(raw)
    .flatMap(series => series.episodes.map((episode, index) => ({
      topic: `${series.title} EP.${index + 1}: ${episode}`,
      category: series.category,
      tags: uniqueTags([...series.tags, 'Series', series.title]).slice(0, 8),
    })))
    .slice(0, 120)
}

function parseSeriesLine(line: string): ContentSeriesPlan | null {
  const parts = line.split('|').map(part => part.trim())
  const title = stripPriorityMarker(parts[0] ?? '')
  const episodes = parseEpisodes(parts[3] ?? '')
  if (!title || episodes.length === 0) return null

  return {
    title,
    category: parts[1] || DEFAULT_CATEGORY,
    tags: parseTags(parts[2] ?? ''),
    episodes,
    objective: parts[4] || null,
    priority: parsePriority(parts[5] ?? '', parts[0] ?? ''),
  }
}

function parseEpisodes(value: string) {
  return value
    .split(';')
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 12)
}

function parseTags(value: string) {
  return uniqueTags(value.split(',').map(tag => tag.trim()).filter(Boolean))
}

function uniqueTags(tags: string[]) {
  return Array.from(new Set(tags.map(tag => tag.trim()).filter(Boolean)))
}

function parsePriority(value: string, title: string) {
  const normalized = value.trim()
  if (normalized) {
    const parsed = Number(normalized)
    if (Number.isFinite(parsed)) return Math.max(1, Math.min(5, Math.round(parsed)))
  }
  if (title.startsWith('!')) return 5
  return DEFAULT_PRIORITY
}

function stripPriorityMarker(value: string) {
  return value.replace(/^!+\s*/, '').trim()
}
