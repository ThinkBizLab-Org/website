import { getSetting } from './settings-store'

// LINE channel access token, preferring the encrypted DB setting (Admin UI) and
// falling back to the env var. Shared by every LINE send path.
export async function getLineAccessToken(): Promise<string> {
  try {
    const fromSetting = await getSetting('line_channel_access_token')
    if (fromSetting) return fromSetting
  } catch {
    // ignore — fall back to env
  }
  return process.env.LINE_CHANNEL_ACCESS_TOKEN ?? ''
}
