import crypto from 'crypto'

const DEFAULT_TTL_MS = 60 * 60 * 1000

function getSecret(): string {
  return process.env.PREVIEW_TOKEN_SECRET || process.env.NEXTAUTH_SECRET || process.env.ENCRYPTION_KEY || ''
}

function sign(payload: string): string {
  const secret = getSecret()
  if (!secret) throw new Error('PREVIEW_TOKEN_SECRET or NEXTAUTH_SECRET is required')
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url')
}

export function createArticlePreviewToken(articleId: string, ttlMs = DEFAULT_TTL_MS): string {
  const exp = Date.now() + ttlMs
  const payload = `${articleId}.${exp}`
  return `${payload}.${sign(payload)}`
}

export function verifyArticlePreviewToken(articleId: string, token: string | null | undefined): boolean {
  if (!token) return false
  const [id, expRaw, sig] = token.split('.')
  if (!id || !expRaw || !sig || id !== articleId) return false

  const exp = Number(expRaw)
  if (!Number.isFinite(exp) || exp < Date.now()) return false

  const expected = sign(`${id}.${expRaw}`)
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  } catch {
    return false
  }
}
