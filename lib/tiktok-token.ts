import { eq } from 'drizzle-orm'
import { db } from './db'
import { settings } from './schema'
import { getSetting, setSetting } from './settings-store'
import { getTiktokCreds } from './tiktok-creds'

// Refresh the access token once it has under this much life left, so an
// in-flight post never races a mid-request expiry.
const REFRESH_SKEW_MS = 2 * 60 * 60 * 1000
const ACCESS_TOKEN_TTL_S = 24 * 60 * 60
const REFRESH_TOKEN_TTL_S = 365 * 24 * 60 * 60

// Returns a valid TikTok access token, transparently refreshing when the stored
// one is close to expiry. Returns null if TikTok is not connected or the
// refresh fails.
export async function getTiktokAccessToken(): Promise<string | null> {
  const [row] = await db
    .select({ expiresAt: settings.expiresAt })
    .from(settings)
    .where(eq(settings.key, 'tiktok_access_token'))
  const token = await getSetting('tiktok_access_token')
  if (!token) return null

  const refreshThreshold = new Date(Date.now() + REFRESH_SKEW_MS)
  if (!row?.expiresAt || row.expiresAt >= refreshThreshold) return token

  return refreshTiktokAccessToken()
}

// Exchanges the stored refresh token for a fresh access token. TikTok rotates
// the refresh token on every call, so we persist BOTH the new access token and
// the new refresh token (each with its own expiry) — otherwise the next refresh
// would present a stale token and the connection would silently break.
export async function refreshTiktokAccessToken(): Promise<string | null> {
  const refreshToken = await getSetting('tiktok_refresh_token')
  if (!refreshToken) return null

  const creds = await getTiktokCreds()
  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: creds.clientKey,
      client_secret: creds.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  const data = await res.json().catch(() => ({} as Record<string, unknown>))
  if (!res.ok || data.error) return null

  // The token endpoint replies flat; older shapes nested under `data`.
  const payload = (data.data ?? data) as {
    access_token?: string
    expires_in?: number
    refresh_token?: string
    refresh_expires_in?: number
  }
  const newToken = payload.access_token
  if (!newToken) return null

  const expiresIn = Number(payload.expires_in ?? ACCESS_TOKEN_TTL_S)
  await setSetting('tiktok_access_token', newToken, new Date(Date.now() + expiresIn * 1000))

  if (payload.refresh_token) {
    const refreshExpiresIn = Number(payload.refresh_expires_in ?? REFRESH_TOKEN_TTL_S)
    await setSetting('tiktok_refresh_token', payload.refresh_token, new Date(Date.now() + refreshExpiresIn * 1000))
  }

  return newToken
}
