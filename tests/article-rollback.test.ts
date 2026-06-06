import { describe, expect, it } from 'vitest'
import { articleSnapshotToUpdate, canUnpublish } from '@/lib/article-revisions'

describe('article rollback / unpublish', () => {
  it('only allows unpublishing a published article', () => {
    expect(canUnpublish('published')).toBe(true)
    expect(canUnpublish('draft')).toBe(false)
    expect(canUnpublish('review')).toBe(false)
    expect(canUnpublish('approved')).toBe(false)
    expect(canUnpublish(null)).toBe(false)
    expect(canUnpublish(undefined)).toBe(false)
  })

  it('maps a revision snapshot back to a restorable update payload', () => {
    const update = articleSnapshotToUpdate({
      title: 'Restored title',
      status: 'published',
      publishedAt: '2026-06-01T00:00:00.000Z',
      ignored: 'nope',
    })
    expect(update.title).toBe('Restored title')
    expect(update.status).toBe('published')
    expect(update.publishedAt).toBeInstanceOf(Date)
    expect('ignored' in update).toBe(false)
    expect(update.updatedAt).toBeInstanceOf(Date)
  })
})
