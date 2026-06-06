import { describe, expect, it } from 'vitest'
import { DEFAULT_DLQ_AUTO_RETRY, parseDlqAutoRetry, shouldAutoRetry } from '@/lib/dead-letter-queue'

const now = new Date('2026-06-06T12:00:00.000Z')
const minsAgo = (m: number) => new Date(now.getTime() - m * 60 * 1000)

const entry = (over: Partial<Parameters<typeof shouldAutoRetry>[0]> = {}) => ({
  status: 'pending',
  sourceId: 'job-1',
  autoRetries: 0,
  failedAt: minsAgo(60),
  ...over,
})

const config = { enabled: true, maxAutoRetries: 3, backoffMinutes: 30 }

describe('dlq auto-retry config', () => {
  it('parses config with clamping and defaults', () => {
    expect(parseDlqAutoRetry('{"enabled":false,"maxAutoRetries":99,"backoffMinutes":-5}')).toEqual({
      enabled: false, maxAutoRetries: 10, backoffMinutes: 0,
    })
    expect(parseDlqAutoRetry('nope')).toEqual(DEFAULT_DLQ_AUTO_RETRY)
  })
})

describe('shouldAutoRetry', () => {
  it('retries an eligible pending entry past the backoff window', () => {
    expect(shouldAutoRetry(entry(), config, now)).toBe(true)
  })

  it('does not retry when disabled', () => {
    expect(shouldAutoRetry(entry(), { ...config, enabled: false }, now)).toBe(false)
  })

  it('does not retry non-pending, source-less, or capped entries', () => {
    expect(shouldAutoRetry(entry({ status: 'requeued' }), config, now)).toBe(false)
    expect(shouldAutoRetry(entry({ sourceId: null }), config, now)).toBe(false)
    expect(shouldAutoRetry(entry({ autoRetries: 3 }), config, now)).toBe(false)
  })

  it('waits for the backoff window before retrying', () => {
    expect(shouldAutoRetry(entry({ failedAt: minsAgo(10) }), config, now)).toBe(false)
    expect(shouldAutoRetry(entry({ failedAt: minsAgo(31) }), config, now)).toBe(true)
  })
})
