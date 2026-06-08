// Approve a rendered short-video from LINE, mirroring the content-factory
// article approval flow. When the pipeline requires human sign-off, the
// processor sends a one-time LINE message with a short code; an admin replies
// `approve-video CODE` (or `reject-video CODE reason`) and the webhook calls
// back into here. Approval sets articles.videoApprovedAt, which is exactly what
// the social queue's shouldHoldForVideoApproval() gate releases on.

import crypto from 'crypto'
import { eq } from 'drizzle-orm'
import { db } from './db'
import { articles } from './schema'
import { logAudit } from './audit'
import { pushLineToAdmins } from './line-admin'
import { loadVideoPipelineConfig } from './video-pipeline-config'

const APPROVAL_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function makeApprovalToken(): string {
  return crypto.randomBytes(3).toString('hex').toUpperCase()
}

function formatVideoApprovalMessage({ token, title, format, videoUrl }: {
  token: string; title: string; format?: string | null; videoUrl?: string | null
}): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.thinkbizlab.com'
  return [
    '🎬 วิดีโอเรนเดอร์เสร็จแล้ว รออนุมัติก่อนโพสต์',
    '',
    title,
    ...(format ? [`รูปแบบ: ${format}`] : []),
    ...(videoUrl ? ['', `ดูวิดีโอ: ${videoUrl}`] : []),
    `ตรวจในเว็บ: ${base}/admin/videos`,
    '',
    `ถ้าผ่าน ตอบ: approve-video ${token}`,
    `ถ้าไม่ผ่าน ตอบ: reject-video ${token} เหตุผล`,
  ].join('\n')
}

// Called from the media-production processor once a rendered video has been
// attached to its article. Sends a one-time LINE approval request to admins
// when the pipeline is configured to require human sign-off. Best-effort:
// it must never throw into (and fail) the render path.
export async function maybeNotifyVideoApproval(articleId: string | null, format?: string | null): Promise<void> {
  try {
    if (!articleId) return
    const config = await loadVideoPipelineConfig()
    if (!config.requireApproval) return // auto-post enabled — no sign-off needed

    const [a] = await db
      .select({
        title: articles.title,
        ttVideoUrl: articles.ttVideoUrl,
        igVideoUrl: articles.igVideoUrl,
        approvedAt: articles.videoApprovedAt,
        notifiedAt: articles.videoApprovalNotifiedAt,
      })
      .from(articles)
      .where(eq(articles.id, articleId))
      .limit(1)
    if (!a) return
    if (a.approvedAt || a.notifiedAt) return // already approved, or already asked

    const token = makeApprovalToken()
    const now = new Date()
    await db
      .update(articles)
      .set({
        videoApprovalToken: token,
        videoApprovalTokenExpiresAt: new Date(now.getTime() + APPROVAL_TTL_MS),
        videoApprovalNotifiedAt: now,
        updatedAt: now,
      })
      .where(eq(articles.id, articleId))

    await pushLineToAdmins(
      formatVideoApprovalMessage({ token, title: a.title, format, videoUrl: a.ttVideoUrl ?? a.igVideoUrl }),
    )
  } catch (error) {
    console.error('[video-approval] notify failed:', error)
  }
}

// Webhook handler for `approve-video CODE`. Sets the human sign-off that the
// social queue waits on, then burns the token so the code can't be reused.
export async function approveVideoByToken(token: string, actor = 'line'): Promise<{ ok: boolean; message: string }> {
  const normalized = token.trim().toUpperCase()
  if (!normalized) return { ok: false, message: 'กรุณาระบุรหัสอนุมัติวิดีโอ' }

  const [a] = await db
    .select({ id: articles.id, title: articles.title, expiresAt: articles.videoApprovalTokenExpiresAt, approvedAt: articles.videoApprovedAt })
    .from(articles)
    .where(eq(articles.videoApprovalToken, normalized))
    .limit(1)
  if (!a) return { ok: false, message: 'ไม่พบรหัสอนุมัติวิดีโอนี้' }
  if (a.approvedAt) return { ok: false, message: 'วิดีโอนี้อนุมัติไปแล้ว' }
  if (a.expiresAt && a.expiresAt < new Date()) return { ok: false, message: 'รหัสอนุมัติวิดีโอหมดอายุแล้ว — อนุมัติในเว็บที่ /admin/videos แทน' }

  const now = new Date()
  await db
    .update(articles)
    .set({ videoApprovedAt: now, videoApprovedBy: actor, videoApprovalToken: null, updatedAt: now })
    .where(eq(articles.id, a.id))
  await logAudit({ actorEmail: actor, action: 'video.approve.line', entityType: 'article', entityId: a.id })

  return { ok: true, message: `✅ อนุมัติวิดีโอแล้ว\nระบบจะโพสต์ลง TikTok/Reels ตามคิว\n\n${a.title}` }
}

// Webhook handler for `reject-video CODE reason`. Burns the token and records
// the rejection; the video stays unapproved so the social queue never posts it.
export async function rejectVideoByToken(token: string, reason: string, actor = 'line'): Promise<{ ok: boolean; message: string }> {
  const normalized = token.trim().toUpperCase()
  if (!normalized) return { ok: false, message: 'กรุณาระบุรหัสวิดีโอ' }

  const [a] = await db
    .select({ id: articles.id, title: articles.title, approvedAt: articles.videoApprovedAt })
    .from(articles)
    .where(eq(articles.videoApprovalToken, normalized))
    .limit(1)
  if (!a) return { ok: false, message: 'ไม่พบรหัสวิดีโอนี้' }
  if (a.approvedAt) return { ok: false, message: 'วิดีโอนี้อนุมัติไปแล้ว reject ผ่าน LINE ไม่ได้' }

  const rejectionReason = reason.trim() || 'Rejected by LINE admin'
  const now = new Date()
  await db
    .update(articles)
    .set({ videoApprovalToken: null, updatedAt: now })
    .where(eq(articles.id, a.id))
  await logAudit({ actorEmail: actor, action: 'video.reject.line', entityType: 'article', entityId: a.id, metadata: { reason: rejectionReason } })

  return { ok: true, message: `↩️ ไม่อนุมัติวิดีโอ — จะไม่ถูกโพสต์\n\n${a.title}\nเหตุผล: ${rejectionReason}` }
}
