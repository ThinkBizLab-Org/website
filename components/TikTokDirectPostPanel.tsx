'use client'
import { useEffect, useState } from 'react'

type CreatorInfo = {
  ok: boolean
  audited?: boolean
  creatorNickname?: string
  creatorUsername?: string
  privacyLevelOptions?: string[]
  commentDisabled?: boolean
  duetDisabled?: boolean
  stitchDisabled?: boolean
  error?: string
}

export type TikTokPostOptions = {
  privacyLevel: string
  disableComment: boolean
  disableDuet: boolean
  disableStitch: boolean
}

const PRIVACY_LABELS: Record<string, string> = {
  PUBLIC_TO_EVERYONE: 'สาธารณะ (ทุกคน)',
  MUTUAL_FOLLOW_FRIENDS: 'เพื่อน (ติดตามกันและกัน)',
  FOLLOWER_OF_CREATOR: 'ผู้ติดตาม',
  SELF_ONLY: 'เฉพาะฉัน (ส่วนตัว)',
}

// TikTok Direct Post UX compliance: shows who we post as, lets the user pick a
// privacy level (never auto-public) and interaction settings the creator allows,
// and surfaces the required Music Usage Confirmation before posting.
export function TikTokDirectPostPanel({ loading, onConfirm, onCancel }: {
  loading: boolean
  onConfirm: (opts: TikTokPostOptions) => void
  onCancel: () => void
}) {
  const [info, setInfo] = useState<CreatorInfo | null>(null)
  const [fetching, setFetching] = useState(true)
  const [privacy, setPrivacy] = useState('SELF_ONLY')
  const [disableComment, setDisableComment] = useState(false)
  const [disableDuet, setDisableDuet] = useState(false)
  const [disableStitch, setDisableStitch] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/tiktok/creator-info')
      .then(r => r.json())
      .then((d: CreatorInfo) => {
        if (!active) return
        setInfo(d)
        if (d.ok) {
          const opts = d.privacyLevelOptions ?? ['SELF_ONLY']
          // Default to the most private option allowed — never auto-select public.
          setPrivacy(opts.includes('SELF_ONLY') ? 'SELF_ONLY' : opts[0])
        }
      })
      .catch(() => { if (active) setInfo({ ok: false, error: 'ดึงข้อมูล creator ไม่ได้' }) })
      .finally(() => { if (active) setFetching(false) })
    return () => { active = false }
  }, [])

  if (fetching) return <span className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>กำลังโหลดข้อมูล creator…</span>

  if (!info?.ok) return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px]" style={{ color: '#F87171' }}>✗ {info?.error ?? 'ดึงข้อมูล creator ไม่ได้'}</span>
      <button type="button" onClick={onCancel} className="font-mono text-[10px] text-purple hover:underline">ปิด</button>
    </div>
  )

  const audited = Boolean(info.audited)
  const options = audited ? (info.privacyLevelOptions ?? ['SELF_ONLY']) : ['SELF_ONLY']

  return (
    <div className="w-full rounded-lg border p-3 space-y-2.5" style={{ borderColor: 'rgba(124,58,237,.25)', background: 'rgba(0,0,0,.25)' }}>
      <div className="font-mono text-[11px] text-white">
        โพสต์ในนาม <span className="text-accent">{info.creatorNickname || info.creatorUsername || 'TikTok creator'}</span>
      </div>

      {!audited && (
        <div className="font-mono text-[10px] rounded px-2 py-1" style={{ background: 'rgba(249,115,22,.12)', color: '#FB923C', border: '1px solid rgba(249,115,22,.25)' }}>
          แอปยังไม่ผ่าน TikTok review — โพสต์ได้เฉพาะ &ldquo;ส่วนตัว (SELF_ONLY)&rdquo; เท่านั้น
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] w-20 flex-shrink-0" style={{ color: 'rgba(155,142,196,.6)' }}>ความเป็นส่วนตัว</span>
        <select value={privacy} onChange={e => setPrivacy(e.target.value)} disabled={!audited}
          className="font-mono text-[10px] rounded px-2 py-1 border disabled:opacity-60"
          style={{ background: 'rgba(0,0,0,.4)', borderColor: 'rgba(155,142,196,.3)', color: '#E2D9F3' }}>
          {options.map(o => <option key={o} value={o}>{PRIVACY_LABELS[o] ?? o}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap gap-3">
        {!info.commentDisabled && <Toggle label="ปิดคอมเมนต์" checked={disableComment} onChange={setDisableComment} />}
        {!info.duetDisabled && <Toggle label="ปิด Duet" checked={disableDuet} onChange={setDisableDuet} />}
        {!info.stitchDisabled && <Toggle label="ปิด Stitch" checked={disableStitch} onChange={setDisableStitch} />}
      </div>

      <p className="font-mono text-[9px] leading-relaxed" style={{ color: 'rgba(155,142,196,.55)' }}>
        เมื่อกดยืนยัน ถือว่ายอมรับ{' '}
        <a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer" className="text-accent hover:underline">Music Usage Confirmation</a>
        {' '}ของ TikTok และเนื้อหาเป็นไปตาม Community Guidelines
      </p>

      <div className="flex items-center gap-2">
        <button type="button" disabled={loading}
          onClick={() => onConfirm({ privacyLevel: audited ? privacy : 'SELF_ONLY', disableComment, disableDuet, disableStitch })}
          className="px-3 py-1 rounded font-mono text-[10px] disabled:opacity-50"
          style={{ background: 'rgba(124,58,237,.25)', color: '#C4B5FD', border: '1px solid rgba(124,58,237,.4)' }}>
          {loading ? 'กำลังโพสต์…' : '🎵 ยืนยันโพสต์'}
        </button>
        <button type="button" onClick={onCancel} className="font-mono text-[10px] text-purple hover:underline">ยกเลิก</button>
      </div>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-1 font-mono text-[10px] cursor-pointer" style={{ color: 'rgba(155,142,196,.7)' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="accent-purple" />
      {label}
    </label>
  )
}
