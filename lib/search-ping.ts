import { getSetting } from './settings-store'

// Pings IndexNow (Bing, Yandex, Seznam, …) when content is published so new/updated
// URLs get crawled quickly. Best-effort: missing key or network errors never block
// publishing. Google is intentionally omitted (it deprecated sitemap/URL ping).

export const INDEXNOW_KEY_SETTING = 'indexnow_key'
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'

function siteBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.thinkbizlab.com').replace(/\/+$/, '')
}

export function hostOf(baseUrl: string): string {
  try {
    return new URL(baseUrl).host
  } catch {
    return baseUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  }
}

// Turn article slugs into absolute, de-duplicated article URLs.
export function articleUrls(base: string, slugs: string[]): string[] {
  const root = base.replace(/\/+$/, '')
  const urls = slugs
    .map(slug => String(slug).trim())
    .filter(Boolean)
    .map(slug => `${root}/articles/${slug}`)
  return Array.from(new Set(urls))
}

export type IndexNowPayload = {
  host: string
  key: string
  keyLocation: string
  urlList: string[]
}

export function buildIndexNowPayload({ base, key, urls }: { base: string; key: string; urls: string[] }): IndexNowPayload {
  const root = base.replace(/\/+$/, '')
  return {
    host: hostOf(root),
    key,
    keyLocation: `${root}/api/indexnow`,
    urlList: urls,
  }
}

export async function getIndexNowKey(): Promise<string | null> {
  const fromSetting = await getSetting(INDEXNOW_KEY_SETTING).catch(() => null)
  return (fromSetting || process.env.INDEXNOW_KEY || '').trim() || null
}

export type PingResult = { ok: boolean; skipped?: boolean; count?: number; reason?: string }

// Submits the given article slugs to IndexNow. Returns a result rather than
// throwing so callers can fire-and-forget.
export async function pingIndexNow(slugs: string[]): Promise<PingResult> {
  const base = siteBase()
  const urls = articleUrls(base, slugs)
  if (urls.length === 0) return { ok: false, skipped: true, reason: 'no urls' }

  const key = await getIndexNowKey()
  if (!key) return { ok: false, skipped: true, reason: 'no indexnow key' }

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(buildIndexNowPayload({ base, key, urls })),
    })
    return { ok: res.ok, count: urls.length, reason: res.ok ? undefined : `http ${res.status}` }
  } catch (error) {
    console.error('[search-ping] indexnow failed:', error)
    return { ok: false, reason: 'request failed' }
  }
}
