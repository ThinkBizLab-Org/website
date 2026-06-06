import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { subscribers } from '@/lib/schema'
import { rateLimit } from '@/lib/rate-limit'
import { buildConfirmationEmail, sendEmail } from '@/lib/email'

// Send the double opt-in confirmation email (best-effort). Returns whether it
// was actually delivered so the response can fall back to exposing the confirm
// link only when email is not configured (dev).
async function sendConfirmation(email: string, confirmUrl: string, unsubscribeUrl: string): Promise<boolean> {
  const { subject, text } = buildConfirmationEmail(confirmUrl, unsubscribeUrl)
  return sendEmail({ to: email, subject, text })
}

const subscribeSchema = z.object({
  email: z.string().trim().email().max(254),
  source: z.string().trim().max(80).optional().default('newsletter'),
  segment: z.string().trim().max(80).optional().default('general'),
})

function token() {
  return randomBytes(24).toString('hex')
}

function siteUrl(req: Request) {
  return process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin
}

export async function POST(req: Request) {
  const limited = rateLimit(req, { key: 'newsletter-subscribe', limit: 10, windowMs: 60 * 60 * 1000 })
  if (limited) return limited

  const parsed = subscribeSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const { email, source, segment } = parsed.data

  try {
    const [existing] = await db.select().from(subscribers).where(eq(subscribers.email, email))
    const now = new Date()
    if (existing) {
      if (existing.status === 'active') {
        return NextResponse.json({ ok: true, status: 'active', existing: true })
      }

      const consentToken = existing.consentToken ?? token()
      const unsubscribeToken = existing.unsubscribeToken ?? token()
      const [updated] = await db.update(subscribers)
        .set({
          status: 'pending',
          source,
          segment,
          consentToken,
          unsubscribeToken,
          unsubscribedAt: null,
          updatedAt: now,
        })
        .where(eq(subscribers.id, existing.id))
        .returning()

      const confirmUrl = `${siteUrl(req)}/api/subscribers/confirm?token=${consentToken}`
      const unsubscribeUrl = `${siteUrl(req)}/api/subscribers/unsubscribe?token=${unsubscribeToken}`
      const emailed = await sendConfirmation(email, confirmUrl, unsubscribeUrl)

      return NextResponse.json({
        ok: true,
        status: updated.status,
        existing: true,
        emailed,
        ...(emailed ? {} : { confirmUrl, unsubscribeUrl }),
      })
    }

    const consentToken = token()
    const unsubscribeToken = token()
    const [created] = await db.insert(subscribers)
      .values({
        email,
        source,
        segment,
        status: 'pending',
        consentToken,
        unsubscribeToken,
        updatedAt: now,
      })
      .returning()

    const confirmUrl = `${siteUrl(req)}/api/subscribers/confirm?token=${consentToken}`
    const unsubscribeUrl = `${siteUrl(req)}/api/subscribers/unsubscribe?token=${unsubscribeToken}`
    const emailed = await sendConfirmation(email, confirmUrl, unsubscribeUrl)

    return NextResponse.json({
      ok: true,
      status: created.status,
      emailed,
      ...(emailed ? {} : { confirmUrl, unsubscribeUrl }),
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
