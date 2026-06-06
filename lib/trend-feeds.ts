import { getSetting } from './settings-store'
import type { TrendNewsTopicSeed } from './trend-news-input'

// Real-trend sourcing for the Content Factory: pulls headlines from configured
// RSS/Atom feeds (e.g. Google News queries, business sections) and turns them
// into question-style topic seeds. Free (no API key), best-effort (a feed that
// fails is skipped), and deduped — so the factory always has fresh raw material
// without blocking on the network.

export const TREND_FEEDS_SETTING = 'content_factory_trend_feeds'

// Pure: strip tags/CDATA/entities and collapse whitespace.
export function cleanXmlText(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/\s+/g, ' ')
    .trim()
}

// Pure: drop a trailing " - Source" / " | Source" suffix common in news feeds.
export function cleanHeadline(value: string): string {
  return cleanXmlText(value).replace(/\s+[|–—-]\s+[^|–—-]{2,40}$/, '').trim()
}

// Pure: extract item/entry titles from an RSS or Atom document (skips the
// channel/feed title by only looking inside <item>/<entry> blocks).
export function parseFeedTitles(xml: string, limit = 25): string[] {
  const titles: string[] = []
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) ?? []
  for (const block of blocks) {
    const match = block.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)
    if (match) {
      const title = cleanXmlText(match[1])
      if (title) titles.push(title)
    }
    if (titles.length >= limit) break
  }
  return titles
}

// Pure: config is one feed per line — `url` or `url|Category`.
export function parseFeedConfig(raw: string): { url: string; category: string }[] {
  return (raw || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const [url, category = 'Strategy'] = line.split('|').map(part => part.trim())
      return { url, category }
    })
    .filter(feed => /^https?:\/\//i.test(feed.url))
    .slice(0, 20)
}

// Pure: headlines → deduped question-style topic seeds.
export function feedTitlesToSeeds(titles: string[], category = 'Strategy'): TrendNewsTopicSeed[] {
  const seen = new Set<string>()
  const seeds: TrendNewsTopicSeed[] = []
  for (const raw of titles) {
    const headline = cleanHeadline(raw)
    if (headline.length < 12) continue
    const key = headline.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const topic = /[?？]$/.test(headline) ? headline : `${headline}: ธุรกิจ SME ควรปรับตัวอย่างไร?`
    seeds.push({ topic, category, tags: ['Trend', 'News'] })
  }
  return seeds
}

async function fetchFeed(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'ThinkBizLab/1.0 (+content-factory)' } })
    clearTimeout(timer)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

// IO: read configured feeds, fetch + parse, return capped, deduped seeds.
export async function fetchTrendFeedSeeds(rawConfig?: string, perFeed = 8, total = 12): Promise<TrendNewsTopicSeed[]> {
  let raw = rawConfig
  if (raw === undefined) {
    raw = await getSetting(TREND_FEEDS_SETTING).catch(() => '') ?? ''
  }
  const feeds = parseFeedConfig(raw)
  if (feeds.length === 0) return []

  const collected: TrendNewsTopicSeed[] = []
  for (const feed of feeds) {
    const xml = await fetchFeed(feed.url)
    if (!xml) continue
    collected.push(...feedTitlesToSeeds(parseFeedTitles(xml, perFeed), feed.category))
  }

  const seen = new Set<string>()
  const out: TrendNewsTopicSeed[] = []
  for (const seed of collected) {
    const key = seed.topic.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(seed)
    if (out.length >= total) break
  }
  return out
}
