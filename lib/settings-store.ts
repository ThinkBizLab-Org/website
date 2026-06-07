import { eq } from 'drizzle-orm'
import { db } from './db'
import { settings } from './schema'
import { decryptSecret, encryptSecret } from './secrets'

export const SECRET_SETTING_KEYS = new Set([
  'anthropic_api_key',
  'fal_api_key',
  'heygen_api_key',
  'elevenlabs_api_key',
  'resend_api_key',
  'line_channel_secret',
  'fb_page_access_token',
  'tiktok_access_token',
  'tiktok_refresh_token',
])

export async function getSetting(key: string): Promise<string> {
  const rows = await db.select().from(settings).where(eq(settings.key, key))
  const value = rows[0]?.value ?? ''
  return SECRET_SETTING_KEYS.has(key) ? decryptSecret(value) : value
}

export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const entries = await Promise.all(keys.map(async key => [key, await getSetting(key)] as const))
  return Object.fromEntries(entries)
}

export async function setSetting(key: string, value: string, expiresAt?: Date | null): Promise<void> {
  const stored = SECRET_SETTING_KEYS.has(key) ? encryptSecret(value) : value
  await db.insert(settings)
    .values({ key, value: stored, expiresAt: expiresAt ?? null, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: stored, expiresAt: expiresAt ?? null, updatedAt: new Date() },
    })
}
