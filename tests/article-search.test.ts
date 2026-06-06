import { describe, expect, it } from 'vitest'
import { normalizeQuery, rankSearchResults, scoreArticleMatch } from '@/lib/article-search'

const article = (over: Record<string, unknown> = {}) => ({
  title: 'Marketing สำหรับ SME', excerpt: 'กลยุทธ์การตลาด', content: 'เนื้อหายาว', category: 'Marketing', tags: ['SME', 'growth'], ...over,
})

describe('normalizeQuery', () => {
  it('lowercases, splits, and drops short tokens', () => {
    expect(normalizeQuery('  SME a Growth ')).toEqual(['sme', 'growth'])
  })
})

describe('scoreArticleMatch', () => {
  it('weights title above body and sums across terms', () => {
    const titleHit = scoreArticleMatch(article(), ['marketing']) // title weight 10
    const contentHit = scoreArticleMatch(article({ title: '', category: '', excerpt: '', tags: [] }), ['เนื้อหายาว']) // content weight 1
    expect(titleHit).toBe(10)
    expect(contentHit).toBe(1)
    expect(scoreArticleMatch(article(), ['sme'])).toBeGreaterThan(0) // tag/title hit
  })

  it('returns 0 for no terms or no match', () => {
    expect(scoreArticleMatch(article(), [])).toBe(0)
    expect(scoreArticleMatch(article(), ['nonexistent'])).toBe(0)
  })
})

describe('rankSearchResults', () => {
  it('drops non-matches and sorts by score desc', () => {
    const rows = [
      article({ title: 'no match here', excerpt: '', content: '', category: '', tags: [] }),
      article({ title: 'Growth tips', excerpt: '', content: '', category: '', tags: [] }),
      article({ title: '', excerpt: 'about growth', content: '', category: '', tags: [] }),
    ]
    const ranked = rankSearchResults(rows, 'growth')
    expect(ranked).toHaveLength(2)
    expect(ranked[0].title).toBe('Growth tips')
  })
})
