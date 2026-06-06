import { describe, expect, it } from 'vitest'
import { DRIP_STEPS, buildWelcomeEmail, dueDripStep } from '@/lib/newsletter-lifecycle'

const base = 'https://www.thinkbizlab.com'

describe('buildWelcomeEmail', () => {
  it('includes the articles link and an unsubscribe line when token is present', () => {
    const { subject, text } = buildWelcomeEmail(base, 'tok')
    expect(subject).toContain('ยินดีต้อนรับ')
    expect(text).toContain(`${base}/articles`)
    expect(text).toContain('unsubscribe?token=tok')
  })
  it('omits unsubscribe line without a token', () => {
    expect(buildWelcomeEmail(base).text).not.toContain('unsubscribe?token=')
  })
})

describe('dueDripStep', () => {
  const now = new Date('2026-06-20T00:00:00Z')

  it('returns null before the first step is due', () => {
    const confirmedAt = new Date('2026-06-19T00:00:00Z') // 1 day ago < 2
    expect(dueDripStep({ confirmedAt, dripStep: 0, dripLastSentAt: null }, now)).toBeNull()
  })

  it('returns the current step once enough days have passed', () => {
    const confirmedAt = new Date('2026-06-17T00:00:00Z') // 3 days ago >= 2
    expect(dueDripStep({ confirmedAt, dripStep: 0, dripLastSentAt: null }, now)).toBe(0)
  })

  it('respects the minimum gap since the last send', () => {
    const confirmedAt = new Date('2026-06-01T00:00:00Z')
    const dripLastSentAt = new Date('2026-06-19T18:00:00Z') // 6h ago < 24h
    expect(dueDripStep({ confirmedAt, dripStep: 1, dripLastSentAt }, now)).toBeNull()
  })

  it('returns null once all steps are sent', () => {
    const confirmedAt = new Date('2026-01-01T00:00:00Z')
    expect(dueDripStep({ confirmedAt, dripStep: DRIP_STEPS.length, dripLastSentAt: null }, now)).toBeNull()
  })

  it('returns null when never confirmed', () => {
    expect(dueDripStep({ confirmedAt: null, dripStep: 0, dripLastSentAt: null }, now)).toBeNull()
  })
})
