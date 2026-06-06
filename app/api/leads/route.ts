import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { leads } from '@/lib/schema'
import { rateLimit } from '@/lib/rate-limit'
import { subscribeEmail } from '@/lib/subscribers'
import { dispatchNotification } from '@/lib/notifications'

// Conversion layer: a consult / contact request. Records the lead, opts the
// email into the newsletter (segmented by interest), and pings the admin.

const schema = z.object({
  name: z.string().trim().max(200).optional(),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional(),
  company: z.string().trim().max(200).optional(),
  message: z.string().trim().max(4000).optional(),
  interest: z.string().trim().max(80).optional(),
  source: z.string().trim().max(80).optional().default('consult'),
  articleId: z.string().trim().uuid().optional(),
})

function siteUrl(req: Request) {
  return process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin
}

export async function POST(req: Request) {
  const limited = rateLimit(req, { key: 'leads', limit: 8, windowMs: 60 * 60 * 1000 })
  if (limited) return limited

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { name, email, phone, company, message, interest, source, articleId } = parsed.data
  try {
    await db.insert(leads).values({
      name: name ?? null,
      email,
      phone: phone ?? null,
      company: company ?? null,
      message: message ?? null,
      interest: interest ?? null,
      source,
      articleId: articleId ?? null,
    })

    // Opt the lead into the newsletter (best-effort; never block the lead on it).
    try {
      await subscribeEmail({ email, source, segment: interest || 'lead', baseUrl: siteUrl(req) })
    } catch { /* ignore */ }

    await dispatchNotification({
      event: 'lead',
      message: `📥 ลูกค้าใหม่: ${name || email}${company ? ` (${company})` : ''}${interest ? ` · สนใจ ${interest}` : ''}`,
      context: { email, name, company, interest, source },
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
