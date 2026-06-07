import { getSetting } from './settings-store'

export type TiktokCreatorInfo = {
  creatorNickname: string
  creatorUsername: string
  creatorAvatarUrl: string
  privacyLevelOptions: string[]
  commentDisabled: boolean
  duetDisabled: boolean
  stitchDisabled: boolean
  maxVideoDurationSec: number
}

export type TiktokPostOptions = {
  privacyLevel?: string
  disableComment?: boolean
  disableDuet?: boolean
  disableStitch?: boolean
}

export type TiktokPublishResult = { ok: boolean; publishId?: string; error?: string }

const VALID_PRIVACY = new Set(['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY'])

// Until the TikTok app passes audit, the Content Posting API only permits
// SELF_ONLY (private) posts — sending PUBLIC_TO_EVERYONE is rejected. This gate
// is flipped on via the `tiktok_audited` setting once app review is approved.
export async function isTiktokAudited(): Promise<boolean> {
  return (await getSetting('tiktok_audited')) === 'true'
}

// The privacy level we're actually allowed to use: honour the caller's choice
// once audited, otherwise force SELF_ONLY.
export async function resolveTiktokPrivacy(requested?: string): Promise<string> {
  if (!(await isTiktokAudited())) return 'SELF_ONLY'
  const choice = (requested ?? '').toUpperCase()
  return VALID_PRIVACY.has(choice) ? choice : 'SELF_ONLY'
}

// Direct Post requires querying the creator's posting options first so the UI
// can show who we're posting as and which privacy / interaction settings are
// permitted (TikTok UX compliance).
export async function queryTiktokCreatorInfo(token: string): Promise<TiktokCreatorInfo | null> {
  const res = await fetch('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8', Authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  })
  const data = await res.json().catch(() => ({} as Record<string, unknown>))
  const info = (data as { data?: Record<string, unknown> }).data
  const err = (data as { error?: { code?: string } }).error
  if (!res.ok || !info || (err && err.code && err.code !== 'ok')) return null
  return {
    creatorNickname: String(info.creator_nickname ?? ''),
    creatorUsername: String(info.creator_username ?? ''),
    creatorAvatarUrl: String(info.creator_avatar_url ?? ''),
    privacyLevelOptions: Array.isArray(info.privacy_level_options) && info.privacy_level_options.length
      ? (info.privacy_level_options as string[])
      : ['SELF_ONLY'],
    commentDisabled: Boolean(info.comment_disabled),
    duetDisabled: Boolean(info.duet_disabled),
    stitchDisabled: Boolean(info.stitch_disabled),
    maxVideoDurationSec: Number(info.max_video_post_duration_sec ?? 0),
  }
}

// Direct Post a video from a public URL. The privacy level is clamped by audit
// state, so an unaudited app can never accidentally post publicly.
export async function publishTiktokVideo(
  token: string,
  videoUrl: string,
  title: string,
  opts: TiktokPostOptions = {},
): Promise<TiktokPublishResult> {
  const privacyLevel = await resolveTiktokPrivacy(opts.privacyLevel)
  const res = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      post_info: {
        title: title.slice(0, 2200),
        privacy_level: privacyLevel,
        disable_comment: Boolean(opts.disableComment),
        disable_duet: Boolean(opts.disableDuet),
        disable_stitch: Boolean(opts.disableStitch),
      },
      source_info: { source: 'PULL_FROM_URL', video_url: videoUrl },
    }),
  })
  const data = await res.json().catch(() => ({} as Record<string, unknown>))
  const err = (data as { error?: { code?: string; message?: string } }).error
  if (!res.ok || (err && err.code && err.code !== 'ok')) {
    return { ok: false, error: err?.message ?? JSON.stringify(data) }
  }
  return { ok: true, publishId: (data as { data?: { publish_id?: string } }).data?.publish_id }
}
