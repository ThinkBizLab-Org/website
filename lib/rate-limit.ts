import { NextResponse } from 'next/server'

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || req.headers.get('x-real-ip') || 'unknown'
}

export function rateLimit(req: Request, options: {
  key: string
  limit: number
  windowMs: number
}) {
  const now = Date.now()
  const id = `${options.key}:${getClientIp(req)}`
  const bucket = buckets.get(id)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(id, { count: 1, resetAt: now + options.windowMs })
    return null
  }

  bucket.count += 1
  if (bucket.count <= options.limit) return null

  const retryAfter = Math.ceil((bucket.resetAt - now) / 1000)
  return NextResponse.json(
    { error: 'Too many requests', retryAfter },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  )
}
