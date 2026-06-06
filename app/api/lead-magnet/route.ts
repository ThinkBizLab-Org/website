import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { leadMagnetDownloads } from '@/lib/schema'
import { rateLimit } from '@/lib/rate-limit'
import { subscribeEmail } from '@/lib/subscribers'

// Email-gated content upgrade: subscribes the email (double opt-in) and records
// which asset they requested, so we can audit who downloaded what.

const schema = z.object({
  email: z.string().trim().email().max(254),
  magnet: z.string().trim().min(1).max(200),
  source: z.string().trim().max(80).optional().default('lead-magnet'),
  segment: z.string().trim().max(80).optional().default('general'),
  articleId: z.string().trim().uuid().optional(),
})

function siteUrl(req: Request) {
  return process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin
}

export async function POST(req: Request) {
  const limited = rateLimit(req, { key: 'lead-magnet', limit: 15, windowMs: 60 * 60 * 1000 })
  if (limited) return limited

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { email, magnet, source, segment, articleId } = parsed.data
  try {
    const result = await subscribeEmail({ email, source, segment, baseUrl: siteUrl(req) })

    // Record the download grant (best-effort — never block the download on it).
    try {
      await db.insert(leadMagnetDownloads).values({ email, magnet, source, articleId: articleId ?? null })
    } catch {
      // ignore logging failure
    }

    return NextResponse.json({ ok: true, status: result.status, emailed: result.emailed })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
