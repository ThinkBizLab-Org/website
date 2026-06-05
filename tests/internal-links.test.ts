import { describe, expect, it } from 'vitest'

import { suggestInternalLinks } from '@/lib/internal-links'
import type { Article } from '@/lib/schema'

describe('internal link suggestions', () => {
  it('suggests related published articles first', () => {
    const suggestions = suggestInternalLinks(
      {
        title: 'SME cash flow strategy',
        content: '<p>วิธีจัดการ cash flow และ finance สำหรับ SME</p>',
        category: 'Finance',
        tags: 'SME, cash flow',
      },
      [
        article({
          id: 'a',
          title: 'Cash Flow สำหรับ SME',
          slug: 'sme-cash-flow',
          category: 'Finance',
          tags: ['SME', 'cash flow'],
        }),
        article({
          id: 'b',
          title: 'Marketing funnel',
          slug: 'marketing-funnel',
          category: 'Marketing',
          tags: ['Marketing'],
        }),
      ],
    )

    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]).toMatchObject({
      id: 'a',
      url: '/articles/sme-cash-flow',
      category: 'Finance',
    })
    expect(suggestions[0].score).toBeGreaterThan(0)
  })

  it('excludes the current article, drafts, and already-linked articles', () => {
    const suggestions = suggestInternalLinks(
      {
        articleId: 'current',
        title: 'AI strategy for SME',
        content: '<p>AI strategy</p><a href="/articles/already-linked">อ่านต่อ</a>',
        category: 'AI & Tech',
        tags: ['AI', 'SME'],
      },
      [
        article({ id: 'current', title: 'AI strategy for SME', slug: 'current', category: 'AI & Tech', tags: ['AI'] }),
        article({ id: 'linked', title: 'AI สำหรับ SME', slug: 'already-linked', category: 'AI & Tech', tags: ['AI'] }),
        article({ id: 'draft', title: 'AI content factory', slug: 'draft-ai', status: 'draft', category: 'AI & Tech', tags: ['AI'] }),
        article({ id: 'valid', title: 'AI adoption roadmap', slug: 'ai-adoption-roadmap', category: 'AI & Tech', tags: ['AI', 'SME'] }),
      ],
    )

    expect(suggestions.map(item => item.id)).toEqual(['valid'])
  })

  it('respects the suggestion limit', () => {
    const suggestions = suggestInternalLinks(
      {
        title: 'Finance checklist',
        content: 'finance cash flow',
        category: 'Finance',
        tags: ['Finance'],
      },
      [
        article({ id: '1', title: 'Finance one', slug: 'finance-one', category: 'Finance', tags: ['Finance'] }),
        article({ id: '2', title: 'Finance two', slug: 'finance-two', category: 'Finance', tags: ['Finance'] }),
        article({ id: '3', title: 'Finance three', slug: 'finance-three', category: 'Finance', tags: ['Finance'] }),
      ],
      2,
    )

    expect(suggestions).toHaveLength(2)
  })
})

function article(overrides: Partial<Article>): Article {
  return {
    id: overrides.id ?? 'article-id',
    title: overrides.title ?? 'Article title',
    slug: overrides.slug ?? 'article-title',
    excerpt: overrides.excerpt ?? '',
    content: overrides.content ?? '',
    coverImage: null,
    category: overrides.category ?? null,
    tags: overrides.tags ?? [],
    status: overrides.status ?? 'published',
    aiSummaryQ: null,
    aiSummaryA: null,
    keyPoints: null,
    faqJson: null,
    schemaJson: null,
    geoScore: null,
    readTime: null,
    featured: null,
    publishScheduledAt: null,
    lineBroadcastMsg: null,
    lineBroadcastSent: null,
    lineBroadcastAt: null,
    fbSent: null,
    fbSentAt: null,
    ttSent: null,
    ttSentAt: null,
    igSent: null,
    igSentAt: null,
    fbCaption: null,
    fbHashtags: null,
    ttCaption: null,
    ttHashtags: null,
    ttVideoUrl: null,
    ttVdoPrompt: null,
    igCaption: null,
    igHashtags: null,
    igVideoUrl: null,
    igImagePrompt: null,
    igImage: null,
    publishedAt: null,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  }
}
