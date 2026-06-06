import { getSettings } from './settings-store'

// Transactional email via Resend (same provider the newsletter uses). Used for
// the double opt-in confirmation so new subscribers actually receive their
// confirm link instead of sitting in `pending` forever.

export async function getResendCreds() {
  const map = await getSettings(['resend_api_key', 'notify_email_from'])
  return {
    apiKey: map.resend_api_key || process.env.RESEND_API_KEY || '',
    from: map.notify_email_from || process.env.NOTIFY_EMAIL_FROM || '',
  }
}

export async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text: string; html?: string }): Promise<boolean> {
  const { apiKey, from } = await getResendCreds()
  if (!apiKey || !from) return false
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from, to: [to], subject, text, ...(html ? { html } : {}) }),
    })
    return res.ok
  } catch {
    return false
  }
}

// Pure: builds the double opt-in confirmation email body (Thai).
export function buildConfirmationEmail(confirmUrl: string, unsubscribeUrl?: string): { subject: string; text: string } {
  const subject = 'ยืนยันการติดตาม ThinkBiz Lab'
  const text = [
    'ขอบคุณที่สมัครรับบทความจาก ThinkBiz Lab 🎉',
    '',
    'กดลิงก์ด้านล่างเพื่อยืนยันอีเมลของคุณ (ลิงก์นี้สำหรับคุณเท่านั้น):',
    confirmUrl,
    '',
    'ถ้าคุณไม่ได้เป็นผู้สมัคร สามารถเพิกเฉยอีเมลนี้ได้',
    unsubscribeUrl ? `\nยกเลิกการติดตาม: ${unsubscribeUrl}` : '',
  ].filter(Boolean).join('\n')
  return { subject, text }
}
