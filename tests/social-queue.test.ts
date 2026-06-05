import { describe, expect, it } from 'vitest'
import { MAX_SOCIAL_QUEUE_ATTEMPTS, nextSocialRetryAt, shouldRetrySocialQueueFailure } from '@/lib/social-queue'

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
