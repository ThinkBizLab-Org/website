import { getSetting } from './settings-store'
import { getLineAccessToken } from './line-token'

export async function getLineAdminUserIds(): Promise<string[]> {
  const raw = await getSetting('line_admin_user_ids') || (process.env.LINE_ADMIN_USER_IDS ?? '')
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

export async function pushLineToAdmins(text: string): Promise<{ ok: boolean; sent: number; error?: string }> {
  const token = await getLineAccessToken()
  if (!token) return { ok: false, sent: 0, error: 'LINE_CHANNEL_ACCESS_TOKEN not set' }

  const userIds = await getLineAdminUserIds()
  if (userIds.length === 0) return { ok: false, sent: 0, error: 'line_admin_user_ids not set' }

  let sent = 0
  let lastError = ''

  for (const to of userIds) {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ to, messages: [{ type: 'text', text }] }),
    })

    if (res.ok) {
      sent += 1
    } else {
      lastError = await res.text().catch(() => `LINE push failed: ${res.status}`)
    }
  }

  return { ok: sent > 0, sent, error: lastError || undefined }
}
