import { describe, expect, it } from 'vitest'
import { clickUrl, isSafeRedirect, pixelUrl, renderTrackedHtml } from '@/lib/email-tracking'
import { dueReengagement } from '@/lib/newsletter-lifecycle'

const base = 'https://www.thinkbizlab.com'

describe('tracking urls', () => {
  it('builds pixel and click urls with the token', () => {
    expect(pixelUrl(base, 'tok')).toBe(`${base}/api/email/open?s=tok`)
    expect(clickUrl(base, 'tok', `${base}/articles/x`)).toBe(`${base}/api/email/click?s=tok&u=${encodeURIComponent(base + '/articles/x')}`)
  })
})

describe('renderTrackedHtml', () => {
  it('wraps the CTA through the click tracker and embeds the pixel', () => {
    const html = renderTrackedHtml({ paragraphs: ['hello'], cta: { label: 'Read', url: `${base}/articles` }, base, token: 'tok' })
    expect(html).toContain('/api/email/click?s=tok')
    expect(html).toContain('/api/email/open?s=tok')
    expect(html).toContain('hello')
  })
  it('uses the raw url and omits the pixel when there is no token', () => {
    const html = renderTrackedHtml({ paragraphs: ['hi'], cta: { label: 'Go', url: `${base}/articles` }, base, token: null })
    expect(html).not.toContain('/api/email/click')
    expect(html).not.toContain('/api/email/open')
    expect(html).toContain(`${base}/articles`)
  })
})

describe('isSafeRedirect', () => {
  it('allows same-origin and rejects everything else', () => {
    expect(isSafeRedirect(`${base}/articles/x`, base)).toBe(true)
    expect(isSafeRedirect('https://evil.com/x', base)).toBe(false)
    expect(isSafeRedirect('javascript:alert(1)', base)).toBe(false)
    expect(isSafeRedirect('not a url', base)).toBe(false)
  })
})

describe('dueReengagement', () => {
  const now = new Date('2026-06-06T00:00:00Z')
  it('targets long-confirmed, inactive subscribers', () => {
    expect(dueReengagement({ confirmedAt: '2026-01-01T00:00:00Z', lastEngagedAt: null, reengagedAt: null }, now)).toBe(true)
  })
  it('skips recently engaged subscribers', () => {
    expect(dueReengagement({ confirmedAt: '2026-01-01T00:00:00Z', lastEngagedAt: '2026-06-01T00:00:00Z', reengagedAt: null }, now)).toBe(false)
  })
  it('skips newly confirmed subscribers', () => {
    expect(dueReengagement({ confirmedAt: '2026-06-01T00:00:00Z', lastEngagedAt: null, reengagedAt: null }, now)).toBe(false)
  })
  it('respects the cooldown between attempts', () => {
    expect(dueReengagement({ confirmedAt: '2026-01-01T00:00:00Z', lastEngagedAt: null, reengagedAt: '2026-05-20T00:00:00Z' }, now)).toBe(false)
  })
})
