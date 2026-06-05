import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { subscribers } from '@/lib/schema'
import { rateLimit } from '@/lib/rate-limit'

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

      return NextResponse.json({
        ok: true,
        status: updated.status,
        existing: true,
        confirmUrl: `${siteUrl(req)}/api/subscribers/confirm?token=${consentToken}`,
        unsubscribeUrl: `${siteUrl(req)}/api/subscribers/unsubscribe?token=${unsubscribeToken}`,
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

    return NextResponse.json({
      ok: true,
      status: created.status,
      confirmUrl: `${siteUrl(req)}/api/subscribers/confirm?token=${consentToken}`,
      unsubscribeUrl: `${siteUrl(req)}/api/subscribers/unsubscribe?token=${unsubscribeToken}`,
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
