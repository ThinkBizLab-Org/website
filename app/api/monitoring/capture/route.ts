import { NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'
import { reportOperationalEvent } from '@/lib/monitoring'

const captureSchema = z.object({
  name: z.string().trim().max(160).optional().default('browser.error'),
  message: z.string().trim().max(2000),
  severity: z.enum(['info', 'warning', 'error']).optional().default('error'),
  context: z.record(z.string(), z.unknown()).optional().default({}),
})

export async function POST(req: Request) {
  const limited = rateLimit(req, { key: 'monitoring-capture', limit: 60, windowMs: 60 * 60 * 1000 })
  if (limited) return limited

  const parsed = captureSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid monitoring payload' }, { status: 400 })

  await reportOperationalEvent({
    name: parsed.data.name,
    message: parsed.data.message,
    severity: parsed.data.severity,
    context: {
      ...parsed.data.context,
      userAgent: req.headers.get('user-agent'),
    },
  })

  return NextResponse.json({ ok: true })
}
