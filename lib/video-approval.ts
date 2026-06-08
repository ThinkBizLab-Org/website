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
import { pushLineToAdmins, type LineMessage } from './line-admin'
import { loadVideoPipelineConfig } from './video-pipeline-config'

const APPROVAL_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function makeApprovalToken(): string {
  return crypto.randomBytes(3).toString('hex').toUpperCase()
}

// First https image among the candidates — LINE flex hero requires an https
// JPEG/PNG; skip anything else so a bad URL never breaks the whole message.
function firstHttpsImage(...urls: (string | null | undefined)[]): string | null {
  for (const u of urls) if (u && /^https:\/\//i.test(u)) return u
  return null
}

// Build a LINE Flex bubble: thumbnail (article image) + tappable Approve /
// Reject buttons so an admin acts with one tap instead of typing the code.
// The buttons are `message` actions that send `approve-video CODE` /
// `reject-video CODE`, so the existing webhook handlers process them unchanged.
function buildVideoApprovalMessages({ token, title, format, videoUrl, imageUrl }: {
  token: string; title: string; format?: string | null; videoUrl?: string | null; imageUrl?: string | null
}): LineMessage[] {
  const hero = imageUrl
    ? {
        type: 'image', url: imageUrl, size: 'full', aspectRatio: '20:13', aspectMode: 'cover',
        ...(videoUrl ? { action: { type: 'uri', label: 'ดูวิดีโอ', uri: videoUrl } } : {}),
      }
    : null

  const bodyContents: unknown[] = [
    { type: 'text', text: '🎬 วิดีโอรออนุมัติก่อนโพสต์', weight: 'bold', size: 'sm', color: '#7C3AED' },
    { type: 'text', text: title, weight: 'bold', size: 'md', wrap: true, maxLines: 3 },
  ]
  if (format) bodyContents.push({ type: 'text', text: `รูปแบบ: ${format}`, size: 'xs', color: '#999999' })
  bodyContents.push({ type: 'text', text: `รหัส: ${token}`, size: 'xxs', color: '#BBBBBB' })

  const footerContents: unknown[] = [
    { type: 'button', style: 'primary', color: '#10B981', height: 'sm', action: { type: 'message', label: '✅ อนุมัติ', text: `approve-video ${token}` } },
    { type: 'button', style: 'secondary', height: 'sm', action: { type: 'message', label: '↩️ ไม่อนุมัติ', text: `reject-video ${token}` } },
  ]
  if (videoUrl) footerContents.push({ type: 'button', style: 'link', height: 'sm', action: { type: 'uri', label: '▶ ดูวิดีโอ', uri: videoUrl } })

  const bubble: Record<string, unknown> = {
    type: 'bubble',
    ...(hero ? { hero } : {}),
    body: { type: 'box', layout: 'vertical', spacing: 'sm', contents: bodyContents },
    footer: { type: 'box', layout: 'vertical', spacing: 'sm', contents: footerContents },
  }

  // altText is shown in chat list / notifications and as a fallback on clients
  // that can't render flex — keep the code so it stays actionable by typing too.
  return [{
    type: 'flex',
    altText: `🎬 วิดีโอรออนุมัติ: ${title.slice(0, 100)} — ตอบ approve-video ${token}`,
    contents: bubble,
  }]
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
        coverImage: articles.coverImage,
        igImage: articles.igImage,
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
      buildVideoApprovalMessages({
        token,
        title: a.title,
        format,
        videoUrl: a.ttVideoUrl ?? a.igVideoUrl,
        imageUrl: firstHttpsImage(a.coverImage, a.igImage),
      }),
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
