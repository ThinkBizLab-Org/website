'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

/* ── Minimal types for Google APIs ────────────────────────────────── */
declare global {
  interface Window {
    gapi: { load: (lib: string, cb: () => void) => void }
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (cfg: {
            client_id: string
            scope: string
            callback: (resp: { access_token?: string; error?: string }) => void
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void }
        }
      }
      picker: {
        PickerBuilder: new () => PickerBuilder
        DocsView: new (viewId?: string) => DocsView
        ViewId: { DOCS_VIDEOS: string }
        Action: { PICKED: string }
      }
    }
  }
}

interface PickerBuilder {
  addView(v: DocsView): this
  setOAuthToken(t: string): this
  setDeveloperKey(k: string): this
  setCallback(fn: (d: PickerData) => void): this
  setTitle(t: string): this
  build(): { setVisible(v: boolean): void }
}
interface DocsView {
  setIncludeFolders(v: boolean): this
  setSelectFolderEnabled(v: boolean): this
  setMimeTypes(t: string): this
}
interface PickerData {
  action: string
  docs?: Array<{ id: string; name: string; mimeType: string }>
}

interface Props {
  value: string
  onChange: (url: string, fileName?: string) => void
}

function extractFileId(url: string): string | null {
  if (!url) return null
  return (url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ?? url.match(/[?&]id=([a-zA-Z0-9_-]+)/))?.[1] ?? null
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = Object.assign(document.createElement('script'), { src, async: true })
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(s)
  })
}

export function GoogleDrivePicker({ value, onChange }: Props) {
  const [ready, setReady] = useState(false)      // scripts + gapi loaded
  const [loading, setLoading] = useState(false)  // waiting for auth/picker
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [clientId, setClientId] = useState('')

  const tokenClientRef = useRef<ReturnType<typeof window.google.accounts.oauth2.initTokenClient> | null>(null)
  const accessTokenRef = useRef('')

  const fileId = extractFileId(value)

  /* ── 1. Fetch client ID from server ─────────────────────────────── */
  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(d => { if (d.googleClientId) setClientId(d.googleClientId) })
      .catch(() => {})
  }, [])

  /* ── 3. Build + show picker ──────────────────────────────────────── */
  const openPickerWithToken = useCallback((token: string) => {
    const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS_VIDEOS)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(false)
      .setMimeTypes(
        'video/mp4,video/quicktime,video/x-msvideo,video/webm,video/avi,video/mov,application/vnd.google-apps.video',
      )

    let builder = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setTitle('เลือกไฟล์วิดีโอจาก Google Drive')
      .setCallback((data: PickerData) => {
        setLoading(false)
        if (data.action === window.google.picker.Action.PICKED && data.docs?.[0]) {
          const f = data.docs[0]
          const url = `https://drive.google.com/file/d/${f.id}/view?usp=sharing`
          setFileName(f.name)
          setError('')
          onChange(url, f.name)
        }
      })

    if (process.env.NEXT_PUBLIC_GOOGLE_API_KEY) {
      builder = builder.setDeveloperKey(process.env.NEXT_PUBLIC_GOOGLE_API_KEY)
    }

    builder.build().setVisible(true)
  }, [onChange])

  /* ── 2. Pre-load Google scripts so button stays synchronous ──────── */
  useEffect(() => {
    if (!clientId) return
    Promise.all([
      loadScript('https://apis.google.com/js/api.js'),
      loadScript('https://accounts.google.com/gsi/client'),
    ])
      .then(() => new Promise<void>(res => window.gapi.load('picker', res)))
      .then(() => {
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive.readonly',
          callback: (resp) => {
            if (resp.access_token) {
              accessTokenRef.current = resp.access_token
              openPickerWithToken(resp.access_token)
            } else {
              setError(`ยืนยันตัวตนไม่สำเร็จ: ${resp.error ?? 'unknown'}`)
              setLoading(false)
            }
          },
        })
        setReady(true)
      })
      .catch(e => setError(String(e)))
  }, [clientId, openPickerWithToken])

  /* ── 4. Button click — must stay synchronous for popup to open ───── */
  const handleClick = () => {
    if (!ready || !tokenClientRef.current) return
    setLoading(true)
    setError('')

    if (accessTokenRef.current) {
      // Token already obtained this session — skip consent screen
      openPickerWithToken(accessTokenRef.current)
    } else {
      // Will trigger OAuth popup immediately (synchronous call — no await before this)
      tokenClientRef.current.requestAccessToken({ prompt: 'consent' })
    }
  }

  const clear = () => { setFileName(''); setError(''); onChange('', '') }

  return (
    <div className="space-y-2">
      {/* Button row */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleClick}
          disabled={!ready || loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-mono text-sm border transition-all hover:bg-purple/10 disabled:opacity-40"
          style={{ borderColor: 'rgba(124,58,237,.35)', color: '#A78BFA', background: 'rgba(124,58,237,.08)' }}
        >
          {loading ? (
            <>
              <span className="w-3.5 h-3.5 rounded-full border-2 border-purple/30 border-t-purple animate-spin" />
              กำลังเปิด Google Drive...
            </>
          ) : !clientId ? (
            <>⏳ กำลังโหลด...</>
          ) : !ready ? (
            <>⏳ เตรียมพร้อม...</>
          ) : fileId ? (
            <>📁 เปลี่ยนไฟล์วิดีโอ</>
          ) : (
            <>📁 เลือกวิดีโอจาก Google Drive</>
          )}
        </button>

        {fileId && (
          <button
            type="button"
            onClick={clear}
            className="px-3 py-2 rounded-lg font-mono text-xs border transition-all hover:bg-red-500/10"
            style={{ borderColor: 'rgba(239,68,68,.3)', color: '#F87171' }}
            title="ล้างไฟล์"
          >
            ✕
          </button>
        )}
      </div>

      {/* Selected file */}
      {fileId && !error && (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
          style={{ background: 'rgba(16,185,129,.07)', border: '1px solid rgba(16,185,129,.2)' }}>
          <span className="text-lg shrink-0">🎬</span>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[11px] font-bold" style={{ color: '#10B981' }}>✓ ไฟล์วิดีโอที่เลือก</div>
            <div className="font-mono text-[10px] truncate" style={{ color: 'rgba(155,142,196,.7)' }}>
              {fileName || `ID: ${fileId}`}
            </div>
          </div>
          <a
            href={`https://drive.google.com/file/d/${fileId}/preview`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] hover:underline shrink-0"
            style={{ color: '#A78BFA' }}
          >
            ดูตัวอย่าง ↗
          </a>
        </div>
      )}

      {error && (
        <p className="font-mono text-[10px] flex items-center gap-1" style={{ color: '#F87171' }}>
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  )
}
