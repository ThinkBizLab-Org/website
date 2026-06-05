'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

const SCOPE = 'video.publish,video.upload'

function TikTokAuthContent() {
  const params = useSearchParams()
  const success = params.get('success')
  const error = params.get('error')

  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; displayName?: string; expiresAt?: string | null; error?: string } | null>(null)
  const [clientKey, setClientKey] = useState('')
  const [redirectUri, setRedirectUri] = useState('')

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(d => {
      setClientKey(d.tiktokClientKey ?? '')
      setRedirectUri(d.tiktokRedirectUri ?? '')
    }).catch(() => {})
  }, [])

  async function testConnection() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/tiktok/test')
      const data = await res.json()
      setTestResult(data)
    } catch {
      setTestResult({ ok: false, error: 'ไม่สามารถเชื่อมต่อได้' })
    } finally {
      setTesting(false)
    }
  }

  const authUrl = clientKey && redirectUri
    ? `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=${SCOPE}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=thinkbiz`
    : ''

  if (success) {
    return (
      <div className="max-w-lg">
        <div className="rounded-xl border p-8 text-center" style={{ borderColor: 'rgba(16,185,129,.3)', background: 'rgba(16,185,129,.07)' }}>
          <div className="text-4xl mb-4">🎵</div>
          <h1 className="font-heading text-2xl font-bold text-white mb-2">TikTok Connected!</h1>
          <p className="font-mono text-sm" style={{ color: '#10B981' }}>✓ บันทึก Token ลงฐานข้อมูลแล้ว — ระบบจะ refresh อัตโนมัติ</p>
        </div>
        <div className="mt-6 flex flex-col items-center gap-3">
          <button onClick={testConnection} disabled={testing}
            className="font-mono text-sm px-5 py-2 rounded-lg border transition-colors disabled:opacity-50"
            style={{ borderColor: 'rgba(124,58,237,.4)', color: '#A78BFA', background: 'rgba(124,58,237,.08)' }}>
            {testing ? 'กำลังทดสอบ...' : '🔍 ทดสอบการเชื่อมต่อ'}
          </button>
          {testResult && (
            <div className="font-mono text-xs px-4 py-2 rounded-lg w-full text-center"
              style={testResult.ok
                ? { background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.25)', color: '#10B981' }
                : { background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', color: '#F87171' }}>
              {testResult.ok
                ? `✓ Token ใช้งานได้ — @${testResult.displayName}${testResult.expiresAt ? ` · หมดอายุ ${new Date(testResult.expiresAt).toLocaleDateString('th-TH')}` : ''}`
                : `✗ ${testResult.error}`}
            </div>
          )}
          <p className="font-mono text-xs" style={{ color: 'rgba(155,142,196,.5)' }}>
            หากต้องการ re-authorize กด login อีกครั้งด้านล่าง
          </p>
          {authUrl && <a href={authUrl} className="font-mono text-xs text-accent hover:underline">เชื่อมต่อใหม่</a>}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-heading text-2xl font-bold text-white mb-2">เชื่อมต่อ TikTok</h1>
      <p className="font-mono text-sm mb-8" style={{ color: '#9B8EC4' }}>
        กดปุ่มด้านล่างเพื่ออนุญาตให้ ThinkBiz Lab โพสต์วิดีโอบน TikTok ของคุณ
      </p>

      {error && (
        <div className="mb-6 rounded-lg px-4 py-3 font-mono text-sm" style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', color: '#F87171' }}>
          เกิดข้อผิดพลาด: {error}
        </div>
      )}

      {authUrl ? <a href={authUrl}
        className="inline-flex items-center gap-3 bg-black text-white px-6 py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity border border-white/10">
        <span className="text-xl">🎵</span>
        เข้าสู่ระบบด้วย TikTok
      </a> : (
        <div className="rounded-lg px-4 py-3 font-mono text-sm" style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', color: '#F87171' }}>
          ยังไม่ได้ตั้งค่า TIKTOK_CLIENT_KEY หรือ TIKTOK_REDIRECT_URI
        </div>
      )}

      <p className="mt-4 font-mono text-xs" style={{ color: 'rgba(155,142,196,.4)' }}>
        จะขอสิทธิ์: video.publish, video.upload
      </p>

      <div className="mt-8 pt-8 border-t" style={{ borderColor: 'rgba(124,58,237,.15)' }}>
        <p className="font-mono text-xs mb-3" style={{ color: 'rgba(155,142,196,.6)' }}>
          มี Token อยู่แล้ว? ทดสอบว่ายังใช้งานได้:
        </p>
        <button onClick={testConnection} disabled={testing}
          className="font-mono text-sm px-5 py-2 rounded-lg border transition-colors disabled:opacity-50"
          style={{ borderColor: 'rgba(124,58,237,.4)', color: '#A78BFA', background: 'rgba(124,58,237,.08)' }}>
          {testing ? 'กำลังทดสอบ...' : '🔍 ทดสอบการเชื่อมต่อ'}
        </button>
        {testResult && (
          <div className="mt-3 font-mono text-xs px-4 py-2 rounded-lg"
            style={testResult.ok
              ? { background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.25)', color: '#10B981' }
              : { background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', color: '#F87171' }}>
            {testResult.ok
              ? `✓ Token ใช้งานได้ — @${testResult.displayName}${testResult.expiresAt ? ` · หมดอายุ ${new Date(testResult.expiresAt).toLocaleDateString('th-TH')}` : ''}`
              : `✗ ${testResult.error}`}
          </div>
        )}
      </div>
    </div>
  )
}

export default function TikTokPage() {
  return (
    <Suspense fallback={<div className="text-white font-mono text-sm">กำลังโหลด...</div>}>
      <TikTokAuthContent />
    </Suspense>
  )
}
