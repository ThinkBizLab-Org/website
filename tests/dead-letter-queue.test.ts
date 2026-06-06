import { describe, expect, it } from 'vitest'
import {
  DEAD_LETTER_SOURCES,
  DEAD_LETTER_STATUSES,
  isDeadLetterPending,
  normalizeDeadLetterAction,
  normalizeDeadLetterSource,
} from '@/lib/dead-letter-queue'

describe('dead letter queue', () => {
  it('exposes the supported sources and statuses', () => {
    expect(DEAD_LETTER_SOURCES).toEqual(['social_post_queue', 'media_production_queue'])
    expect(DEAD_LETTER_STATUSES).toEqual(['pending', 'requeued', 'discarded'])
  })

  it('normalizes known sources only', () => {
    expect(normalizeDeadLetterSource('social_post_queue')).toBe('social_post_queue')
    expect(normalizeDeadLetterSource('media_production_queue')).toBe('media_production_queue')
    expect(normalizeDeadLetterSource('publish_attempts')).toBeNull()
    expect(normalizeDeadLetterSource(null)).toBeNull()
    expect(normalizeDeadLetterSource(123)).toBeNull()
  })

  it('normalizes resolve actions only', () => {
    expect(normalizeDeadLetterAction('requeue')).toBe('requeue')
    expect(normalizeDeadLetterAction('discard')).toBe('discard')
    expect(normalizeDeadLetterAction('retry')).toBeNull()
    expect(normalizeDeadLetterAction('')).toBeNull()
  })

  it('treats only pending entries as actionable', () => {
    expect(isDeadLetterPending('pending')).toBe(true)
    expect(isDeadLetterPending('requeued')).toBe(false)
    expect(isDeadLetterPending('discarded')).toBe(false)
    expect(isDeadLetterPending(undefined)).toBe(false)
  })
})
