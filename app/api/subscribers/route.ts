import { NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'
import { subscribeEmail } from '@/lib/subscribers'

const subscribeSchema = z.object({
  email: z.string().trim().email().max(254),
  source: z.string().trim().max(80).optional().default('newsletter'),
  segment: z.string().trim().max(80).optional().default('general'),
})

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
    const result = await subscribeEmail({ email, source, segment, baseUrl: siteUrl(req) })
    const httpStatus = result.existing ? 200 : 201
    return NextResponse.json({
      ok: true,
      status: result.status,
      existing: result.existing,
      emailed: result.emailed,
      ...(result.confirmUrl ? { confirmUrl: result.confirmUrl, unsubscribeUrl: result.unsubscribeUrl } : {}),
    }, { status: httpStatus })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
