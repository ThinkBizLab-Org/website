import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { subscribers } from '@/lib/schema'
import { rateLimit } from '@/lib/rate-limit'

const subscribeSchema = z.object({
  email: z.string().trim().email().max(254),
  source: z.string().trim().max(80).optional().default('newsletter'),
})

export async function POST(req: Request) {
  const limited = rateLimit(req, { key: 'newsletter-subscribe', limit: 10, windowMs: 60 * 60 * 1000 })
  if (limited) return limited

  const parsed = subscribeSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const { email, source } = parsed.data

  try {
    const [existing] = await db.select().from(subscribers).where(eq(subscribers.email, email))
    if (existing) {
      return NextResponse.json({ ok: true, status: existing.status ?? 'subscribed', existing: true })
    }

    const [created] = await db.insert(subscribers)
      .values({ email, source, status: 'subscribed' })
      .returning()

    return NextResponse.json({ ok: true, status: created.status }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
