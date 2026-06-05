import type { Article } from './schema'

export type InternalLinkContext = {
  articleId?: string | null
  title: string
  content: string
  category?: string | null
  tags?: string[] | string | null
}

export type InternalLinkSuggestion = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  category: string | null
  score: number
  matchedTerms: string[]
  url: string
}

const STOP_WORDS = new Set([
  'และ', 'หรือ', 'คือ', 'เป็น', 'ใน', 'ที่', 'จาก', 'ของ', 'ให้', 'ได้', 'ไม่', 'กับ', 'แล้ว', 'การ', 'ควร',
  'the', 'and', 'for', 'with', 'from', 'into', 'that', 'this', 'what', 'when', 'why', 'how',
])

export function suggestInternalLinks(context: InternalLinkContext, candidates: Article[], limit = 8): InternalLinkSuggestion[] {
  const existingHrefs = new Set(extractExistingArticleSlugs(context.content))
  const contextTerms = weightedTerms(context)

  return candidates
    .filter(candidate => candidate.id !== context.articleId)
    .filter(candidate => candidate.status === 'published')
    .filter(candidate => Boolean(candidate.slug && candidate.title))
    .filter(candidate => !existingHrefs.has(candidate.slug))
    .map(candidate => scoreCandidate(candidate, context, contextTerms))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit)
}

function scoreCandidate(candidate: Article, context: InternalLinkContext, contextTerms: Map<string, number>): InternalLinkSuggestion {
  const matched = new Map<string, number>()
  for (const term of articleTerms(candidate)) {
    const weight = contextTerms.get(term)
    if (weight) matched.set(term, Math.max(matched.get(term) ?? 0, weight))
  }

  let score = Array.from(matched.values()).reduce((sum, weight) => sum + weight, 0)
  if (context.category && candidate.category && normalize(context.category) === normalize(candidate.category)) score += 8

  const contextTags = normalizeTags(context.tags)
  const candidateTags = new Set((candidate.tags ?? []).map(normalize))
  const tagMatches = contextTags.filter(tag => candidateTags.has(normalize(tag)))
  score += tagMatches.length * 6
  for (const tag of tagMatches) matched.set(tag, Math.max(matched.get(tag) ?? 0, 5))

  return {
    id: candidate.id,
    title: candidate.title,
    slug: candidate.slug,
    excerpt: candidate.excerpt,
    category: candidate.category,
    score,
    matchedTerms: Array.from(matched.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([term]) => term)
      .slice(0, 6),
    url: `/articles/${candidate.slug}`,
  }
}

function weightedTerms(context: InternalLinkContext) {
  const terms = new Map<string, number>()
  addTerms(terms, tokenize(context.title), 5)
  addTerms(terms, tokenize(stripHtml(context.content)).slice(0, 80), 1)
  addTerms(terms, normalizeTags(context.tags), 8)
  if (context.category) addTerms(terms, [context.category], 7)
  return terms
}

function articleTerms(article: Article) {
  return [
    ...tokenize(article.title),
    ...tokenize(article.excerpt ?? ''),
    ...(article.tags ?? []),
    article.category ?? '',
  ].map(normalize).filter(Boolean)
}

function addTerms(target: Map<string, number>, terms: string[], weight: number) {
  for (const term of terms.map(normalize).filter(Boolean)) {
    target.set(term, Math.max(target.get(term) ?? 0, weight))
  }
}

function tokenize(value: string) {
  return value
    .split(/[^A-Za-z0-9\u0E00-\u0E7F]+/)
    .map(normalize)
    .filter(term => term.length >= 2 && !STOP_WORDS.has(term))
}

function normalizeTags(tags: string[] | string | null | undefined) {
  if (Array.isArray(tags)) return tags.map(normalize).filter(Boolean)
  if (typeof tags === 'string') return tags.split(',').map(normalize).filter(Boolean)
  return []
}

function normalize(value: string) {
  return value.toLowerCase().trim()
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, ' ')
}

function extractExistingArticleSlugs(content: string) {
  const slugs = new Set<string>()
  const patterns = [
    /href=["']\/articles\/([^"'/#?]+)/gi,
    /href=["']https?:\/\/(?:www\.)?thinkbizlab\.com\/articles\/([^"'/#?]+)/gi,
  ]
  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(content)) !== null) slugs.add(match[1])
  }
  return slugs
}
