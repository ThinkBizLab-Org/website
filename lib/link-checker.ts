import { eq } from 'drizzle-orm'
import { db } from './db'
import { articles, linkCheckResults } from './schema'

type LinkCandidate = {
  url: string
  normalizedUrl: string
  linkType: 'internal' | 'external'
  sourceField: string
}

type CheckedLink = LinkCandidate & {
  status: 'ok' | 'warning' | 'broken' | 'skipped'
  statusCode?: number
  error?: string
}

const SKIP_PROTOCOLS = ['mailto:', 'tel:', 'sms:', 'javascript:', 'data:']

function siteBase() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thinkbizlab.com'
}

function normalizeLink(rawUrl: string): LinkCandidate | null {
  const trimmed = rawUrl.trim()
  if (!trimmed || trimmed.startsWith('#')) return null
  if (SKIP_PROTOCOLS.some(protocol => trimmed.toLowerCase().startsWith(protocol))) return null

  try {
    const base = new URL(siteBase())
    const url = new URL(trimmed, base)
    url.hash = ''
    const isInternal = url.hostname === base.hostname || url.hostname === `www.${base.hostname}` || `www.${url.hostname}` === base.hostname
    return {
      url: trimmed,
      normalizedUrl: isInternal ? `${url.pathname}${url.search}` : url.toString(),
      linkType: isInternal ? 'internal' : 'external',
      sourceField: 'content',
    }
  } catch {
    return {
      url: trimmed,
      normalizedUrl: trimmed,
      linkType: 'external',
      sourceField: 'content',
    }
  }
}

export function extractLinks(content: string | null | undefined): LinkCandidate[] {
  if (!content) return []

  const rawLinks = new Set<string>()
  const patterns = [
    /href=["']([^"']+)["']/gi,
    /src=["']([^"']+)["']/gi,
    /!\[[^\]]*]\(([^)]+)\)/g,
    /\[[^\]]+]\(([^)]+)\)/g,
  ]

  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(content))) {
      const value = match[1]?.split(/\s+/)[0]?.replace(/^<|>$/g, '')
      if (value) rawLinks.add(value)
    }
  }

  return Array.from(rawLinks).map(normalizeLink).filter((link): link is LinkCandidate => Boolean(link))
}

async function checkInternalLink(link: LinkCandidate, slugs: Set<string>): Promise<CheckedLink> {
  const path = link.normalizedUrl.split('?')[0] ?? '/'
  if (path === '/' || path === '/articles' || path === '/categories' || path === '/services' || path === '/about' || path === '/contact' || path === '/privacy' || path === '/terms') {
    return { ...link, status: 'ok', statusCode: 200 }
  }
  const articleMatch = path.match(/^\/articles\/([^/]+)\/?$/)
  if (articleMatch) {
    const slug = decodeURIComponent(articleMatch[1])
    return slugs.has(slug)
      ? { ...link, status: 'ok', statusCode: 200 }
      : { ...link, status: 'broken', statusCode: 404, error: 'Article slug not found' }
  }
  if (/^\/(tags|topics|authors)\//.test(path)) return { ...link, status: 'ok', statusCode: 200 }
  return { ...link, status: 'warning', error: 'Internal route not verified by checker' }
}

async function fetchWithTimeout(url: string, method: 'HEAD' | 'GET') {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    return await fetch(url, {
      method,
      redirect: 'manual',
      signal: controller.signal,
      headers: { 'user-agent': 'ThinkBizLab-LinkChecker/1.0' },
    })
  } finally {
    clearTimeout(timer)
  }
}

async function checkExternalLink(link: LinkCandidate): Promise<CheckedLink> {
  try {
    let res = await fetchWithTimeout(link.normalizedUrl, 'HEAD')
    if (res.status === 405 || res.status === 403) res = await fetchWithTimeout(link.normalizedUrl, 'GET')
    if (res.status >= 200 && res.status < 400) return { ...link, status: 'ok', statusCode: res.status }
    if (res.status >= 400) return { ...link, status: 'broken', statusCode: res.status, error: res.statusText || 'HTTP error' }
    return { ...link, status: 'warning', statusCode: res.status, error: res.statusText || 'Unexpected response' }
  } catch (e) {
    return { ...link, status: 'warning', error: e instanceof Error ? e.message : String(e) }
  }
}

export async function runLinkCheck() {
  const rows = await db.select().from(articles)
  const publishedSlugs = new Set(rows.filter(row => row.status === 'published' && row.slug).map(row => row.slug))
  const checkedAt = new Date()
  const results: (typeof linkCheckResults.$inferInsert)[] = []

  for (const article of rows) {
    const links = extractLinks(article.content)
    for (const link of links.slice(0, 80)) {
      const checked = link.linkType === 'internal'
        ? await checkInternalLink(link, publishedSlugs)
        : await checkExternalLink(link)
      results.push({
        articleId: article.id,
        articleTitle: article.title,
        articleSlug: article.slug,
        url: checked.url,
        normalizedUrl: checked.normalizedUrl,
        linkType: checked.linkType,
        sourceField: checked.sourceField,
        status: checked.status,
        statusCode: checked.statusCode,
        error: checked.error,
        checkedAt,
      })
    }
  }

  await db.delete(linkCheckResults)
  if (results.length > 0) await db.insert(linkCheckResults).values(results)

  return {
    checkedAt,
    total: results.length,
    broken: results.filter(result => result.status === 'broken').length,
    warnings: results.filter(result => result.status === 'warning').length,
    ok: results.filter(result => result.status === 'ok').length,
  }
}

export async function latestLinkCheckResults() {
  return db.select().from(linkCheckResults).where(eq(linkCheckResults.status, 'broken'))
}
