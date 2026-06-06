import { eq } from 'drizzle-orm'
import { randomBytes } from 'crypto'
import { db } from './db'
import { subscribers } from './schema'
import { buildConfirmationEmail, sendEmail } from './email'

// Shared double opt-in subscribe used by both the newsletter form and the lead
// magnet flow. Sends the confirmation email (best-effort); the confirm link is
// only returned when email delivery is not configured (dev).

function token() {
  return randomBytes(24).toString('hex')
}

export type SubscribeResult = {
  status: string
  existing: boolean
  emailed: boolean
  confirmUrl?: string
  unsubscribeUrl?: string
}

export async function subscribeEmail({
  email,
  source = 'newsletter',
  segment = 'general',
  baseUrl,
}: {
  email: string
  source?: string
  segment?: string
  baseUrl: string
}): Promise<SubscribeResult> {
  const now = new Date()
  const [existing] = await db.select().from(subscribers).where(eq(subscribers.email, email))

  // Already confirmed — nothing to do, no email.
  if (existing?.status === 'active') {
    return { status: 'active', existing: true, emailed: false }
  }

  const consentToken = existing?.consentToken ?? token()
  const unsubscribeToken = existing?.unsubscribeToken ?? token()

  let status: string
  if (existing) {
    const [updated] = await db.update(subscribers)
      .set({ status: 'pending', source, segment, consentToken, unsubscribeToken, unsubscribedAt: null, updatedAt: now })
      .where(eq(subscribers.id, existing.id))
      .returning()
    status = updated.status ?? 'pending'
  } else {
    const [created] = await db.insert(subscribers)
      .values({ email, source, segment, status: 'pending', consentToken, unsubscribeToken, updatedAt: now })
      .returning()
    status = created.status ?? 'pending'
  }

  const base = baseUrl.replace(/\/+$/, '')
  const confirmUrl = `${base}/api/subscribers/confirm?token=${consentToken}`
  const unsubscribeUrl = `${base}/api/subscribers/unsubscribe?token=${unsubscribeToken}`
  const { subject, text } = buildConfirmationEmail(confirmUrl, unsubscribeUrl)
  const emailed = await sendEmail({ to: email, subject, text })

  return { status, existing: Boolean(existing), emailed, ...(emailed ? {} : { confirmUrl, unsubscribeUrl }) }
}
