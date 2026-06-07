import { getSettings } from './settings-store'

// TikTok OAuth app credentials, preferring encrypted DB settings (Admin UI) over
// env vars. client_secret is stored encrypted; client_key + redirect are public.
export async function getTiktokCreds(): Promise<{ clientKey: string; clientSecret: string; redirectUri: string }> {
  let map: Record<string, string> = {}
  try {
    map = await getSettings(['tiktok_client_key', 'tiktok_client_secret', 'tiktok_redirect_uri'])
  } catch {
    // ignore — fall back to env
  }
  return {
    clientKey: map.tiktok_client_key || process.env.TIKTOK_CLIENT_KEY || '',
    clientSecret: map.tiktok_client_secret || process.env.TIKTOK_CLIENT_SECRET || '',
    redirectUri: map.tiktok_redirect_uri || process.env.TIKTOK_REDIRECT_URI || 'https://www.thinkbizlab.com/api/auth/tiktok/callback',
  }
}
