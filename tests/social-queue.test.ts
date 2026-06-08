import { describe, expect, it } from 'vitest'
import { MAX_SOCIAL_QUEUE_ATTEMPTS, nextSocialRetryAt, shouldRetrySocialQueueFailure, videoPostsToEnqueue, type VideoPostArticle } from '@/lib/social-queue'

describe('social queue retry policy', () => {
  it('retries below max attempts only', () => {
    expect(MAX_SOCIAL_QUEUE_ATTEMPTS).toBe(3)
    expect(shouldRetrySocialQueueFailure(1)).toBe(true)
    expect(shouldRetrySocialQueueFailure(2)).toBe(true)
    expect(shouldRetrySocialQueueFailure(3)).toBe(false)
  })

  it('uses escalating retry delays', () => {
    const base = new Date('2026-06-06T00:00:00.000Z')
    expect(nextSocialRetryAt(1, base).toISOString()).toBe('2026-06-06T00:15:00.000Z')
    expect(nextSocialRetryAt(2, base).toISOString()).toBe('2026-06-06T01:00:00.000Z')
    expect(nextSocialRetryAt(3, base).toISOString()).toBe('2026-06-06T04:00:00.000Z')
  })
})

function videoArticle(overrides: Partial<VideoPostArticle> = {}): VideoPostArticle {
  return {
    status: 'published',
    publishedAt: null,
    ttCaption: 'TikTok caption',
    ttHashtags: '#ai',
    ttVideoUrl: 'https://cdn/video.mp4',
    ttSent: false,
    igCaption: 'IG caption',
    igHashtags: '#reels',
    igVideoUrl: 'https://cdn/video.mp4',
    igImage: 'https://cdn/img.png',
    coverImage: null,
    igSent: false,
    ...overrides,
  }
}

describe('videoPostsToEnqueue', () => {
  it('enqueues tiktok + instagram for a published article with a video', () => {
    const jobs = videoPostsToEnqueue(videoArticle())
    expect(jobs.map(j => j.platform)).toEqual(['tiktok', 'instagram'])
    expect(jobs[0].payload).toMatchObject({ caption: 'TikTok caption', hashtags: '#ai', videoUrl: 'https://cdn/video.mp4' })
    expect(jobs[1].payload).toMatchObject({ caption: 'IG caption', hashtags: '#reels', imageUrl: 'https://cdn/img.png', videoUrl: 'https://cdn/video.mp4' })
  })

  it('does nothing until the article is published (the publish cron owns that)', () => {
    expect(videoPostsToEnqueue(videoArticle({ status: 'approved', publishedAt: null }))).toEqual([])
    expect(videoPostsToEnqueue(videoArticle({ status: 'draft', publishedAt: null }))).toEqual([])
  })

  it('treats a set publishedAt as published even if status differs', () => {
    const jobs = videoPostsToEnqueue(videoArticle({ status: 'archived', publishedAt: new Date('2026-01-01') }))
    expect(jobs.map(j => j.platform)).toEqual(['tiktok', 'instagram'])
  })

  it('needs a video url: skips tiktok without one; image-only IG stays the publish cron job', () => {
    expect(videoPostsToEnqueue(videoArticle({ ttVideoUrl: null })).map(j => j.platform)).toEqual(['instagram'])
    expect(videoPostsToEnqueue(videoArticle({ igVideoUrl: null })).map(j => j.platform)).toEqual(['tiktok'])
  })

  it('skips platforms already marked sent', () => {
    expect(videoPostsToEnqueue(videoArticle({ ttSent: true })).map(j => j.platform)).toEqual(['instagram'])
    expect(videoPostsToEnqueue(videoArticle({ igSent: true })).map(j => j.platform)).toEqual(['tiktok'])
  })

  it('falls back to coverImage when igImage is empty', () => {
    const jobs = videoPostsToEnqueue(videoArticle({ igImage: null, coverImage: 'https://cdn/cover.png' }))
    expect(jobs.find(j => j.platform === 'instagram')?.payload).toMatchObject({ imageUrl: 'https://cdn/cover.png' })
  })

  it('requires a caption to enqueue', () => {
    expect(videoPostsToEnqueue(videoArticle({ ttCaption: null, igCaption: '' })).map(j => j.platform)).toEqual([])
  })
})
