import { describe, expect, it } from 'vitest'
import { buildConfirmationEmail } from '@/lib/email'

describe('confirmation email', () => {
  it('includes the confirm link and a Thai subject', () => {
    const { subject, text } = buildConfirmationEmail('https://x.com/confirm?token=abc', 'https://x.com/unsub?token=def')
    expect(subject).toContain('ยืนยัน')
    expect(text).toContain('https://x.com/confirm?token=abc')
    expect(text).toContain('https://x.com/unsub?token=def')
  })

  it('omits the unsubscribe line when not provided', () => {
    const { text } = buildConfirmationEmail('https://x.com/confirm?token=abc')
    expect(text).toContain('https://x.com/confirm?token=abc')
    expect(text).not.toContain('ยกเลิกการติดตาม')
  })
})
