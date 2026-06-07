'use client'
import { useRef, useState } from 'react'

// Uploads a video file straight to R2 and returns its public URL (on
// R2_PUBLIC_BASE_URL). TikTok's PULL_FROM_URL requires the video to live on a
// verified domain, so Google Drive links don't work — this gives a direct
// CDN URL that does.
export function R2VideoUpload({ onUploaded }: { onUploaded: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  const handleFile = async (file: File) => {
    setUploading(true); setError(''); setDone('')
    const contentType = file.type || 'video/mp4'
    try {
      // 1. Get a presigned PUT URL (small JSON request — no body-size limit).
      const presignRes = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'social-video', filename: file.name, contentType }),
      })
      const presign = await presignRes.json()
      if (!presignRes.ok || !presign.uploadUrl) { setError(presign.error ?? 'ขอ upload URL ไม่ได้'); return }

      // 2. Upload the file straight to R2 — bypasses the serverless body limit.
      const put = await fetch(presign.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: file,
      })
      if (!put.ok) { setError(`อัปโหลดไป R2 ไม่สำเร็จ (HTTP ${put.status})`); return }

      onUploaded(presign.publicUrl)
      setDone('✓ อัปโหลดขึ้น R2 แล้ว')
    } catch (e) {
      setError(String(e))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <input ref={inputRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-mono text-sm border transition-all hover:bg-purple/10 disabled:opacity-40"
        style={{ borderColor: 'rgba(124,58,237,.35)', color: '#A78BFA', background: 'rgba(124,58,237,.08)' }}>
        {uploading
          ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-purple/30 border-t-purple animate-spin" /> กำลังอัปโหลด…</>
          : <>⬆️ อัปโหลดวิดีโอไป R2 (แนะนำสำหรับ TikTok)</>}
      </button>
      {done && !error && <p className="font-mono text-[10px]" style={{ color: '#10B981' }}>{done}</p>}
      {error && <p className="font-mono text-[10px]" style={{ color: '#F87171' }}>⚠ {error}</p>}
      <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.5)' }}>
        TikTok ต้องการไฟล์วิดีโอตรงจาก domain ที่ verify (R2/CDN) — Google Drive ใช้ไม่ได้
      </p>
    </div>
  )
}
