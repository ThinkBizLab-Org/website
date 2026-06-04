'use client'
import { useRef, useState } from 'react'

interface Props {
  value: string
  onChange: (url: string) => void
}

const REQUIRED_RATIO = 16 / 9
const RATIO_TOLERANCE = 0.08

function checkRatio(w: number, h: number) {
  const ratio = w / h
  return Math.abs(ratio - REQUIRED_RATIO) <= RATIO_TOLERANCE
}

export function CoverImageUpload({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = (file: File) => {
    setError('')
    if (!file.type.startsWith('image/')) {
      setError('กรุณาเลือกไฟล์รูปภาพเท่านั้น')
      return
    }

    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = async () => {
      URL.revokeObjectURL(url)
      const { naturalWidth: w, naturalHeight: h } = img

      if (!checkRatio(w, h)) {
        const actual = (w / h).toFixed(2)
        setError(`อัตราส่วนต้องเป็น 16:9 — รูปปัจจุบัน ${w}×${h} (${actual}:1) ไม่สามารถอัปโหลดได้`)
        return
      }

      setUploading(true)
      try {
        const params = new URLSearchParams({ filename: file.name, kind: 'article-cover' })
        const res = await fetch(`/api/upload?${params}`, {
          method: 'POST',
          body: file,
          headers: { 'content-type': file.type },
        })
        if (!res.ok) throw new Error('Upload failed')
        const { url: blobUrl } = await res.json()
        onChange(blobUrl)
      } catch {
        setError('อัปโหลดไม่สำเร็จ กรุณาลองใหม่')
      } finally {
        setUploading(false)
      }
    }
    img.src = url
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

      {/* Size hint */}
      <div className="flex items-center gap-2 font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.55)' }}>
        <span>📐</span>
        <span>แนะนำ <strong className="text-white">1200 × 630 px</strong> (16:9) — JPG หรือ PNG ขนาดไม่เกิน 5MB</span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="relative cursor-pointer rounded-xl border-2 border-dashed transition-colors hover:border-purple/60"
        style={{ borderColor: 'rgba(124,58,237,.3)', background: 'rgba(15,13,26,.5)', minHeight: '140px' }}
      >
        {value ? (
          <>
            <img src={value} alt="cover" className="w-full rounded-xl object-cover" style={{ maxHeight: '220px' }} />
            <div className="absolute inset-0 flex items-center justify-center rounded-xl opacity-0 hover:opacity-100 transition-opacity"
              style={{ background: 'rgba(0,0,0,.5)' }}>
              <span className="text-white font-mono text-xs">คลิกหรือลากไฟล์เพื่อเปลี่ยน</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-10">
            {uploading ? (
              <>
                <div className="w-6 h-6 border-2 border-purple border-t-transparent rounded-full animate-spin" />
                <span className="font-mono text-xs" style={{ color: '#9B8EC4' }}>กำลังอัปโหลด...</span>
              </>
            ) : (
              <>
                <div className="text-3xl">🖼️</div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-white mb-1">คลิกหรือลากไฟล์มาวาง</div>
                  <div className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.5)' }}>1200 × 630 px · 16:9 · JPG / PNG</div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg font-mono text-xs"
          style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', color: '#F87171' }}>
          <span className="shrink-0">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Clear button */}
      {value && !uploading && (
        <button onClick={() => onChange('')}
          className="font-mono text-[10px] text-red-400 hover:text-red-300 transition-colors">
          ✕ ลบรูปภาพ
        </button>
      )}
    </div>
  )
}
