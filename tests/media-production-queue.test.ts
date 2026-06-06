import { describe, expect, it } from 'vitest'
import {
  MAX_MEDIA_PRODUCTION_ATTEMPTS,
  buildMediaProductionPayload,
  nextMediaProductionRetryAt,
  normalizeMediaAssetType,
  shouldRetryMediaProductionFailure,
} from '@/lib/media-production-queue'
import type { Article } from '@/lib/schema'

describe('media production queue', () => {
  it('retries media production failures with escalating delays', () => {
    const base = new Date('2026-06-06T00:00:00.000Z')
    expect(MAX_MEDIA_PRODUCTION_ATTEMPTS).toBe(5)
    expect(shouldRetryMediaProductionFailure(4)).toBe(true)
    expect(shouldRetryMediaProductionFailure(5)).toBe(false)
    expect(nextMediaProductionRetryAt(1, base).toISOString()).toBe('2026-06-06T00:10:00.000Z')
    expect(nextMediaProductionRetryAt(2, base).toISOString()).toBe('2026-06-06T00:30:00.000Z')
    expect(nextMediaProductionRetryAt(3, base).toISOString()).toBe('2026-06-06T01:30:00.000Z')
    expect(nextMediaProductionRetryAt(4, base).toISOString()).toBe('2026-06-06T04:00:00.000Z')
  })

  it('normalizes supported asset types only', () => {
    expect(normalizeMediaAssetType('cover_image')).toBe('cover_image')
    expect(normalizeMediaAssetType('instagram_image')).toBe('instagram_image')
    expect(normalizeMediaAssetType('short_video')).toBe('short_video')
    expect(normalizeMediaAssetType('facebook_post')).toBeNull()
  })

  it('builds article-aware payload with override support', async () => {
    const payload = await buildMediaProductionPayload('instagram_image', article(), { prompt: 'square hero image' })
    expect(payload).toMatchObject({
      title: 'AI Content Factory',
      category: 'AI & Tech',
      excerpt: 'Build automated content every day.',
      prompt: 'square hero image',
    })
    expect(payload.script).toContain('AI Content Factory')
  })
})

function article(): Article {
  return {
    id: 'article-id',
    title: 'AI Content Factory',
    slug: 'ai-content-factory',
    excerpt: 'Build automated content every day.',
    content: '',
    coverImage: null,
    category: 'AI & Tech',
    tags: ['AI'],
    status: 'draft',
    aiSummaryQ: null,
    aiSummaryA: null,
    keyPoints: ['Plan topics', 'Generate drafts'],
    faqJson: null,
    schemaJson: null,
    factCheck: null,
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
    ttVdoPrompt: 'Short video script',
    igCaption: null,
    igHashtags: null,
    igVideoUrl: null,
    igImagePrompt: 'Instagram prompt',
    igImage: null,
    publishedAt: null,
    createdAt: null,
    updatedAt: null,
  }
}
