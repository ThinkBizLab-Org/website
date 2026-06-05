'use client'
import { useEffect, useState } from 'react'

export default function SettingsPage() {
  const [cronEnabled, setCronEnabled] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Anthropic key
  const [anthropicKey, setAnthropicKey] = useState('')
  const [anthropicMasked, setAnthropicMasked] = useState('')
  const [anthropicSet, setAnthropicSet] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [savingKey, setSavingKey] = useState(false)
  const [keyMsg, setKeyMsg] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  // fal.ai key
  const [falKey, setFalKey] = useState('')
  const [falMasked, setFalMasked] = useState('')
  const [falSet, setFalSet] = useState(false)
  const [showFalKey, setShowFalKey] = useState(false)
  const [savingFalKey, setSavingFalKey] = useState(false)
  const [falKeyMsg, setFalKeyMsg] = useState('')
  const [testingFal, setTestingFal] = useState(false)
  const [falTestResult, setFalTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  // LINE webhook test
  const [testingWebhook, setTestingWebhook] = useState(false)
  const [webhookTestResult, setWebhookTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  // Analytics
  const [gaId, setGaId] = useState('')
  const [fbPixelId, setFbPixelId] = useState('')
  const [ttPixelId, setTtPixelId] = useState('')
  const [analyticsMsg, setAnalyticsMsg] = useState('')
  const [savingAnalytics, setSavingAnalytics] = useState<string | null>(null)

  // LINE Admin User IDs
  const [lineAdminIds, setLineAdminIds] = useState<string[]>([])
  const [newAdminId, setNewAdminId] = useState('')
  const [savingLineAdmins, setSavingLineAdmins] = useState(false)
  const [lineAdminsMsg, setLineAdminsMsg] = useState('')

  // LINE Channel Secret
  const [lineSecret, setLineSecret] = useState('')
  const [lineSecretMasked, setLineSecretMasked] = useState('')
  const [lineSecretSet, setLineSecretSet] = useState(false)
  const [showLineSecret, setShowLineSecret] = useState(false)
  const [savingLineSecret, setSavingLineSecret] = useState(false)
  const [lineSecretMsg, setLineSecretMsg] = useState('')

  // LINE register keyword
  const [lineKeyword, setLineKeyword] = useState('admin register')
  const [savingKeyword, setSavingKeyword] = useState(false)
  const [keywordMsg, setKeywordMsg] = useState('')

  // Facebook Page
  const [fbPageToken, setFbPageToken] = useState('')
  const [fbPageTokenMasked, setFbPageTokenMasked] = useState('')
  const [fbPageTokenSet, setFbPageTokenSet] = useState(false)
  const [showFbToken, setShowFbToken] = useState(false)
  const [savingFbToken, setSavingFbToken] = useState(false)
  const [fbTokenMsg, setFbTokenMsg] = useState('')
  const [fbPageId, setFbPageId] = useState('')
  const [savingFbPageId, setSavingFbPageId] = useState(false)
  const [fbPageIdMsg, setFbPageIdMsg] = useState('')

  // Instagram
  const [igUserId, setIgUserId] = useState('')
  const [savingIgUserId, setSavingIgUserId] = useState(false)
  const [igUserIdMsg, setIgUserIdMsg] = useState('')
  const [fetchingIgId, setFetchingIgId] = useState(false)

  // HeyGen
  const [heygenKey, setHeygenKey] = useState('')
  const [heygenKeyMasked, setHeygenKeyMasked] = useState('')
  const [heygenKeySet, setHeygenKeySet] = useState(false)
  const [showHeygenKey, setShowHeygenKey] = useState(false)
  const [savingHeygenKey, setSavingHeygenKey] = useState(false)
  const [heygenKeyMsg, setHeygenKeyMsg] = useState('')
  const [heygenAvatarId, setHeygenAvatarId] = useState('')
  const [savingHeygenAvatar, setSavingHeygenAvatar] = useState(false)
  const [heygenAvatarMsg, setHeygenAvatarMsg] = useState('')
  const [heygenAvatarLookId, setHeygenAvatarLookId] = useState('')
  const [savingHeygenAvatarLook, setSavingHeygenAvatarLook] = useState(false)
  const [heygenAvatarLookMsg, setHeygenAvatarLookMsg] = useState('')
  const [heygenVoiceId, setHeygenVoiceId] = useState('')
  const [savingHeygenVoice, setSavingHeygenVoice] = useState(false)
  const [heygenVoiceMsg, setHeygenVoiceMsg] = useState('')
  type HeyAvatar = { avatar_id: string; avatar_name: string; preview_image_url?: string }
  type HeyVoice  = { voice_id: string; name: string; language: string; gender: string }
  const [heygenAssets, setHeygenAssets] = useState<{ avatars: HeyAvatar[]; voices: HeyVoice[] } | null>(null)
  const [heygenAssetsLoading, setHeygenAssetsLoading] = useState(false)
  const [heygenAssetsMsg, setHeygenAssetsMsg] = useState('')
  const [voiceSearch, setVoiceSearch] = useState('')

  // Timezone
  const [timezone, setTimezone] = useState('Asia/Bangkok')
  const [savingTz, setSavingTz] = useState(false)
  const [tzMsg, setTzMsg] = useState('')

  // Content Factory
  const [factoryEnabled, setFactoryEnabled] = useState(false)
  const [factoryDailyCount, setFactoryDailyCount] = useState(1)
  const [factoryDaysAhead, setFactoryDaysAhead] = useState(7)
  const [factoryPublishHour, setFactoryPublishHour] = useState(9)
  const [factoryTopicBank, setFactoryTopicBank] = useState('')
  const [savingFactory, setSavingFactory] = useState<string | null>(null)
  const [factoryMsg, setFactoryMsg] = useState('')

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      setCronEnabled(d.cron_enabled)
      setAnthropicSet(d.anthropic_key_set)
      setAnthropicMasked(d.anthropic_key_masked ?? '')
      setFalSet(d.fal_key_set)
      setFalMasked(d.fal_key_masked ?? '')
      setTimezone(d.timezone ?? 'Asia/Bangkok')
      setGaId(d.ga_measurement_id ?? '')
      setFbPixelId(d.fb_pixel_id ?? '')
      setTtPixelId(d.tiktok_pixel_id ?? '')
      setLineAdminIds((d.line_admin_user_ids ?? '').split(',').map((s: string) => s.trim()).filter(Boolean))
      setLineKeyword(d.line_register_keyword ?? 'admin register')
      setLineSecretSet(d.line_channel_secret_set ?? false)
      setLineSecretMasked(d.line_channel_secret_masked ?? '')
      setFbPageTokenSet(d.fb_page_token_set ?? false)
      setFbPageTokenMasked(d.fb_page_token_masked ?? '')
      setFbPageId(d.fb_page_id ?? '')
      setIgUserId(d.ig_user_id ?? '')
      setHeygenKeySet(d.heygen_key_set ?? false)
      setHeygenKeyMasked(d.heygen_key_masked ?? '')
      setHeygenAvatarId(d.heygen_avatar_id ?? '')
      setHeygenAvatarLookId(d.heygen_avatar_look_id ?? '')
      setHeygenVoiceId(d.heygen_voice_id ?? '')
      setFactoryEnabled(Boolean(d.content_factory_enabled))
      setFactoryDailyCount(Number(d.content_factory_daily_count ?? 1))
      setFactoryDaysAhead(Number(d.content_factory_days_ahead ?? 7))
      setFactoryPublishHour(Number(d.content_factory_publish_hour ?? 9))
      setFactoryTopicBank(d.content_factory_topic_bank ?? '')
    })
  }, [])

  const saveLineSecret = async () => {
    if (!lineSecret.trim()) return
    setSavingLineSecret(true)
    setLineSecretMsg('')
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ line_channel_secret: lineSecret.trim() }),
    })
    const data = await res.json()
    if (data.ok) {
      setLineSecretMsg('✓ บันทึก Channel Secret แล้ว')
      setLineSecretSet(true)
      setLineSecret('')
      setShowLineSecret(false)
      fetch('/api/settings').then(r => r.json()).then(d => setLineSecretMasked(d.line_channel_secret_masked ?? ''))
    } else {
      setLineSecretMsg(`เกิดข้อผิดพลาด: ${data.error}`)
    }
    setSavingLineSecret(false)
  }

  const testFalKey = async () => {
    setTestingFal(true)
    setFalTestResult(null)
    const res = await fetch('/api/fal/test', { method: 'POST' })
    const data = await res.json()
    setFalTestResult({ ok: data.ok, msg: data.ok ? data.msg : `${data.error}` })
    setTestingFal(false)
  }

  const testWebhook = async () => {
    setTestingWebhook(true)
    setWebhookTestResult(null)
    const res = await fetch('/api/line/webhook-test', { method: 'POST' })
    const data = await res.json()
    setWebhookTestResult({ ok: data.ok, msg: data.ok ? data.msg : data.error })
    setTestingWebhook(false)
  }

  const saveFbPageToken = async () => {
    if (!fbPageToken.trim()) return
    setSavingFbToken(true)
    setFbTokenMsg('')
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fb_page_access_token: fbPageToken.trim() }),
    })
    const data = await res.json()
    if (data.ok) {
      setFbTokenMsg('✓ บันทึก Page Access Token แล้ว')
      setFbPageTokenSet(true)
      setFbPageToken('')
      setShowFbToken(false)
      fetch('/api/settings').then(r => r.json()).then(d => setFbPageTokenMasked(d.fb_page_token_masked ?? ''))
    } else {
      setFbTokenMsg(`เกิดข้อผิดพลาด: ${data.error}`)
    }
    setSavingFbToken(false)
  }

  const saveFbPageId = async () => {
    setSavingFbPageId(true)
    setFbPageIdMsg('')
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fb_page_id: fbPageId }),
    })
    const data = await res.json()
    setFbPageIdMsg(data.ok ? '✓ บันทึกแล้ว' : `Error: ${data.error}`)
    setSavingFbPageId(false)
  }

  const saveIgUserId = async () => {
    setSavingIgUserId(true)
    setIgUserIdMsg('')
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ig_user_id: igUserId }),
    })
    const data = await res.json()
    setIgUserIdMsg(data.ok ? '✓ บันทึกแล้ว' : `Error: ${data.error}`)
    setSavingIgUserId(false)
  }

  const fetchIgUserIdFromFbPage = async () => {
    setFetchingIgId(true)
    setIgUserIdMsg('')
    const r = await fetch('/api/instagram/fetch-id')
    const d = await r.json()
    if (d.igUserId) {
      setIgUserId(d.igUserId)
      setIgUserIdMsg(`✓ พบ IG Account: @${d.username ?? d.igUserId} — กด "บันทึก" เพื่อบันทึก`)
    } else {
      setIgUserIdMsg(`เกิดข้อผิดพลาด: ${d.error ?? 'ไม่พบ IG account ที่เชื่อมกับ Page'}`)
    }
    setFetchingIgId(false)
  }

  const saveHeygenKey = async () => {
    if (!heygenKey.trim()) return
    setSavingHeygenKey(true); setHeygenKeyMsg('')
    const res = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ heygen_api_key: heygenKey.trim() }) })
    const data = await res.json()
    if (data.ok) { setHeygenKeyMsg('✓ บันทึก HeyGen API Key แล้ว'); setHeygenKeySet(true); setHeygenKey(''); setShowHeygenKey(false); fetch('/api/settings').then(r => r.json()).then(d => setHeygenKeyMasked(d.heygen_key_masked ?? '')) }
    else { setHeygenKeyMsg(`เกิดข้อผิดพลาด: ${data.error}`) }
    setSavingHeygenKey(false)
  }

  const browseHeygenAssets = async () => {
    setHeygenAssetsLoading(true)
    setHeygenAssetsMsg('')
    const res = await fetch('/api/heygen/assets')
    const data = await res.json()
    if (data.error) { setHeygenAssetsMsg(`เกิดข้อผิดพลาด: ${data.error}`); setHeygenAssetsLoading(false); return }
    setHeygenAssets(data)
    setHeygenAssetsLoading(false)
  }

  const saveHeygenAvatar = async () => {
    setSavingHeygenAvatar(true); setHeygenAvatarMsg('')
    const res = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ heygen_avatar_id: heygenAvatarId }) })
    const data = await res.json()
    setHeygenAvatarMsg(data.ok ? '✓ บันทึกแล้ว' : `Error: ${data.error}`)
    setSavingHeygenAvatar(false)
  }

  const saveHeygenAvatarLook = async () => {
    setSavingHeygenAvatarLook(true); setHeygenAvatarLookMsg('')
    const res = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ heygen_avatar_look_id: heygenAvatarLookId }) })
    const data = await res.json()
    setHeygenAvatarLookMsg(data.ok ? '✓ บันทึกแล้ว' : `Error: ${data.error}`)
    setSavingHeygenAvatarLook(false)
  }

  const saveHeygenVoice = async () => {
    setSavingHeygenVoice(true); setHeygenVoiceMsg('')
    const res = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ heygen_voice_id: heygenVoiceId }) })
    const data = await res.json()
    setHeygenVoiceMsg(data.ok ? '✓ บันทึกแล้ว' : `Error: ${data.error}`)
    setSavingHeygenVoice(false)
  }

  const saveLineKeyword = async () => {
    if (!lineKeyword.trim()) return
    setSavingKeyword(true)
    setKeywordMsg('')
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ line_register_keyword: lineKeyword.trim() }),
    })
    const data = await res.json()
    setKeywordMsg(data.ok ? '✓ บันทึกแล้ว' : `Error: ${data.error}`)
    setSavingKeyword(false)
  }

  const saveAnalytic = async (key: string, value: string) => {
    setSavingAnalytics(key)
    setAnalyticsMsg('')
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    })
    const data = await res.json()
    setAnalyticsMsg(data.ok ? '✓ บันทึกแล้ว' : `Error: ${data.error}`)
    setSavingAnalytics(null)
  }

  const saveLineAdminIds = async (ids: string[]) => {
    setSavingLineAdmins(true)
    setLineAdminsMsg('')
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ line_admin_user_ids: ids.join(',') }),
    })
    const data = await res.json()
    setLineAdminsMsg(data.ok ? '✓ บันทึกแล้ว' : `Error: ${data.error}`)
    setSavingLineAdmins(false)
  }

  const addAdminId = async () => {
    const id = newAdminId.trim()
    if (!id || lineAdminIds.includes(id)) { setNewAdminId(''); return }
    const next = [...lineAdminIds, id]
    setLineAdminIds(next)
    setNewAdminId('')
    await saveLineAdminIds(next)
  }

  const removeAdminId = async (id: string) => {
    const next = lineAdminIds.filter(x => x !== id)
    setLineAdminIds(next)
    await saveLineAdminIds(next)
  }

  const saveTimezone = async () => {
    setSavingTz(true)
    setTzMsg('')
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone }),
    })
    const data = await res.json()
    setTzMsg(data.ok ? '✓ บันทึก Timezone แล้ว' : `Error: ${data.error}`)
    setSavingTz(false)
  }

  const toggle = async () => {
    setSaving(true)
    setMsg('')
    const next = !cronEnabled
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cron_enabled: next }),
    })
    const data = await res.json()
    setCronEnabled(data.cron_enabled)
    setMsg(data.cron_enabled ? '✓ เปิดใช้งาน Cron แล้ว' : '✓ ปิด Cron แล้ว')
    setSaving(false)
  }

  const saveFactorySetting = async (key: string, value: string | number | boolean) => {
    setSavingFactory(key)
    setFactoryMsg('')
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    })
    const data = await res.json()
    if (data.ok || key in data) {
      setFactoryMsg('✓ บันทึก Content Factory แล้ว')
    } else {
      setFactoryMsg(`เกิดข้อผิดพลาด: ${data.error}`)
    }
    setSavingFactory(null)
  }

  const testAnthropicKey = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/ai/test', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setTestResult({ ok: true, msg: `✓ เชื่อมต่อสำเร็จ — ${data.model}` })
      } else {
        setTestResult({ ok: false, msg: data.error ?? 'ไม่สามารถเชื่อมต่อได้' })
      }
    } catch (e) {
      setTestResult({ ok: false, msg: String(e) })
    }
    setTesting(false)
  }

  const saveFalKey = async () => {
    if (!falKey.trim()) return
    setSavingFalKey(true)
    setFalKeyMsg('')
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fal_api_key: falKey.trim() }),
    })
    const data = await res.json()
    if (data.ok) {
      setFalKeyMsg('✓ บันทึก fal.ai Key แล้ว')
      setFalSet(true)
      setFalKey('')
      setShowFalKey(false)
      fetch('/api/settings').then(r => r.json()).then(d => setFalMasked(d.fal_key_masked ?? ''))
    } else {
      setFalKeyMsg(`เกิดข้อผิดพลาด: ${data.error}`)
    }
    setSavingFalKey(false)
  }

  const saveAnthropicKey = async () => {
    if (!anthropicKey.trim()) return
    setSavingKey(true)
    setKeyMsg('')
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anthropic_api_key: anthropicKey.trim() }),
    })
    const data = await res.json()
    if (data.ok) {
      setKeyMsg('✓ บันทึก API Key แล้ว')
      setAnthropicSet(true)
      setAnthropicKey('')
      setShowKey(false)
      // Refresh masked key
      fetch('/api/settings').then(r => r.json()).then(d => setAnthropicMasked(d.anthropic_key_masked ?? ''))
    } else {
      setKeyMsg(`เกิดข้อผิดพลาด: ${data.error}`)
    }
    setSavingKey(false)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-heading text-2xl font-bold text-white mb-1">Settings</h1>
      <p className="font-mono text-xs mb-8" style={{ color: 'rgba(155,142,196,.5)' }}>ตั้งค่าระบบ Automation</p>

      {/* Anthropic API Key */}
      <div className="rounded-xl border p-6 space-y-4 mb-6" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.4)' }}>
        <div className="flex items-center gap-2">
          <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest">✨ Claude AI (Anthropic)</div>
          {anthropicSet && (
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,.12)', color: '#10B981' }}>
              ✓ ตั้งค่าแล้ว
            </span>
          )}
        </div>

        {anthropicSet && anthropicMasked && !showKey && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.2)' }}>
              <span className="font-mono text-sm" style={{ color: '#A78BFA' }}>{anthropicMasked}</span>
              <button onClick={() => setShowKey(true)} className="font-mono text-[10px] text-accent hover:underline ml-4">
                เปลี่ยน Key
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={testAnthropicKey}
                disabled={testing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs border transition-all hover:bg-white/5 disabled:opacity-50"
                style={{ borderColor: 'rgba(124,58,237,.3)', color: '#A78BFA' }}
              >
                {testing ? (
                  <><span className="w-3 h-3 rounded-full border border-purple/30 border-t-purple animate-spin" />ทดสอบ...</>
                ) : (
                  <>⚡ ทดสอบ API Key</>
                )}
              </button>
              {testResult && (
                <span className="font-mono text-xs" style={{ color: testResult.ok ? '#10B981' : '#F87171' }}>
                  {testResult.msg}
                </span>
              )}
            </div>
          </div>
        )}

        {(!anthropicSet || showKey) && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-white">Anthropic API Key</label>
              <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>
                ขึ้นต้นด้วย sk-ant-... — ดูได้ที่ console.anthropic.com
              </p>
              <input
                type="password"
                value={anthropicKey}
                onChange={e => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="w-full px-3 py-2.5 rounded-lg border text-white text-sm outline-none font-mono"
                style={{
                  background: 'rgba(15,13,26,.7)',
                  borderColor: 'rgba(124,58,237,.25)',
                  color: '#fff',
                }}
                onKeyDown={e => e.key === 'Enter' && saveAnthropicKey()}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={saveAnthropicKey}
                disabled={savingKey || !anthropicKey.trim()}
                className="px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)', color: '#fff' }}
              >
                {savingKey ? 'กำลังบันทึก...' : 'บันทึก API Key'}
              </button>
              {showKey && (
                <button
                  onClick={() => { setShowKey(false); setAnthropicKey('') }}
                  className="font-mono text-xs text-purple hover:underline"
                >
                  ยกเลิก
                </button>
              )}
            </div>
            {keyMsg && (
              <div className="font-mono text-xs" style={{ color: keyMsg.startsWith('✓') ? '#10B981' : '#F87171' }}>
                {keyMsg}
              </div>
            )}
          </div>
        )}

        {keyMsg && !showKey && (
          <div className="font-mono text-xs" style={{ color: '#10B981' }}>{keyMsg}</div>
        )}

        <div className="font-mono text-[10px] pt-1" style={{ color: 'rgba(155,142,196,.45)' }}>
          Key ที่บันทึกใน DB จะมีความสำคัญกว่า Environment Variable
        </div>
      </div>

      {/* fal.ai API Key */}
      <div className="rounded-xl border p-6 space-y-4 mb-6" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.4)' }}>
        <div className="flex items-center gap-2">
          <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest">🖼️ fal.ai (Cover Image AI)</div>
          {falSet && (
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,.12)', color: '#10B981' }}>
              ✓ ตั้งค่าแล้ว
            </span>
          )}
        </div>

        {falSet && falMasked && !showFalKey && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.2)' }}>
              <span className="font-mono text-sm" style={{ color: '#A78BFA' }}>{falMasked}</span>
              <button onClick={() => setShowFalKey(true)} className="font-mono text-[10px] text-accent hover:underline ml-4">
                เปลี่ยน Key
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={testFalKey}
                disabled={testingFal}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs border transition-all hover:bg-white/5 disabled:opacity-50"
                style={{ borderColor: 'rgba(124,58,237,.3)', color: '#A78BFA' }}
              >
                {testingFal ? <><span className="w-3 h-3 rounded-full border border-purple/30 border-t-purple animate-spin" />ทดสอบ...</> : <>⚡ ทดสอบ API Key</>}
              </button>
              {falTestResult && (
                <span className="font-mono text-xs" style={{ color: falTestResult.ok ? '#10B981' : '#F87171' }}>
                  {falTestResult.msg}
                </span>
              )}
            </div>
          </div>
        )}

        {(!falSet || showFalKey) && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-white">fal.ai API Key</label>
              <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>
                ดูได้ที่ fal.ai/dashboard — ใช้สำหรับสร้างภาพปกบทความด้วย Flux AI
              </p>
              <input
                type="password"
                value={falKey}
                onChange={e => setFalKey(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2.5 rounded-lg border text-white text-sm outline-none font-mono"
                style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)', color: '#fff' }}
                onKeyDown={e => e.key === 'Enter' && saveFalKey()}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={saveFalKey}
                disabled={savingFalKey || !falKey.trim()}
                className="px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)', color: '#fff' }}
              >
                {savingFalKey ? 'กำลังบันทึก...' : 'บันทึก API Key'}
              </button>
              {showFalKey && (
                <button
                  onClick={() => { setShowFalKey(false); setFalKey('') }}
                  className="font-mono text-xs text-purple hover:underline"
                >
                  ยกเลิก
                </button>
              )}
            </div>
            {falKeyMsg && (
              <div className="font-mono text-xs" style={{ color: falKeyMsg.startsWith('✓') ? '#10B981' : '#F87171' }}>
                {falKeyMsg}
              </div>
            )}
          </div>
        )}

        {falKeyMsg && !showFalKey && (
          <div className="font-mono text-xs" style={{ color: '#10B981' }}>{falKeyMsg}</div>
        )}

        <div className="font-mono text-[10px] pt-1" style={{ color: 'rgba(155,142,196,.45)' }}>
          Key ที่บันทึกใน DB จะมีความสำคัญกว่า Environment Variable
        </div>
      </div>

      {/* Analytics */}
      <div className="rounded-xl border p-6 space-y-5 mb-6" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.4)' }}>
        <div className="flex items-center justify-between">
          <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest">📊 Analytics Pixels</div>
          {analyticsMsg && (
            <span className="font-mono text-xs" style={{ color: analyticsMsg.startsWith('✓') ? '#10B981' : '#F87171' }}>
              {analyticsMsg}
            </span>
          )}
        </div>

        {[
          { key: 'ga_measurement_id', label: 'Google Analytics 4', placeholder: 'G-XXXXXXXXXX', icon: '📈', value: gaId, set: setGaId, hint: 'ดูได้ที่ Google Analytics → Admin → Data Streams → Measurement ID' },
          { key: 'fb_pixel_id', label: 'Facebook Pixel', placeholder: '123456789012345', icon: '🔵', value: fbPixelId, set: setFbPixelId, hint: 'ดูได้ที่ Meta Events Manager → Pixels → Pixel ID' },
          { key: 'tiktok_pixel_id', label: 'TikTok Pixel', placeholder: 'CXXXXXXXXXXXXXXXXX', icon: '🎵', value: ttPixelId, set: setTtPixelId, hint: 'ดูได้ที่ TikTok Ads Manager → Assets → Events → Pixel ID' },
        ].map(({ key, label, placeholder, icon, value, set, hint }) => (
          <div key={key} className="space-y-1.5">
            <label className="block text-sm font-semibold text-white">{icon} {label}</label>
            <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>{hint}</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={value}
                onChange={e => set(e.target.value)}
                placeholder={placeholder}
                className="flex-1 px-3 py-2.5 rounded-lg border text-white text-sm outline-none font-mono"
                style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)', color: '#fff' }}
                onKeyDown={e => e.key === 'Enter' && saveAnalytic(key, value)}
              />
              <button
                onClick={() => saveAnalytic(key, value)}
                disabled={savingAnalytics === key}
                className="px-4 py-2.5 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50 flex-shrink-0"
                style={{ background: 'rgba(124,58,237,.3)', color: '#C4B5FD', border: '1px solid rgba(124,58,237,.4)' }}
              >
                {savingAnalytics === key ? 'บันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        ))}

        <div className="font-mono text-[10px] pt-1" style={{ color: 'rgba(155,142,196,.4)' }}>
          Pixel จะถูกโหลดใน &lt;head&gt; ทุกหน้าของเว็บไซต์ — ทิ้งว่างเพื่อปิดใช้งาน
        </div>
      </div>

      {/* Facebook Page */}
      <div className="rounded-xl border p-6 space-y-5 mb-6" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.4)' }}>
        <div className="flex items-center gap-2">
          <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest">🔵 Facebook Page</div>
          {fbPageTokenSet && (
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,.12)', color: '#10B981' }}>
              ✓ ตั้งค่าแล้ว
            </span>
          )}
        </div>

        {/* Page Access Token */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-white">Page Access Token</label>
          <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>
            ดูได้ที่ Meta for Developers → Graph API Explorer → Page Access Token<br />
            หรือ Meta Business Suite → Settings → Advanced → Page Access Token (Never Expire)
          </p>
          {fbPageTokenSet && fbPageTokenMasked && !showFbToken ? (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.2)' }}>
              <span className="font-mono text-sm" style={{ color: '#A78BFA' }}>{fbPageTokenMasked}</span>
              <button onClick={() => setShowFbToken(true)} className="font-mono text-[10px] text-accent hover:underline ml-4">เปลี่ยน</button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="password"
                value={fbPageToken}
                onChange={e => setFbPageToken(e.target.value)}
                placeholder="EAAxxxxxxxxxxxxxxxxx..."
                className="w-full px-3 py-2.5 rounded-lg border text-white text-sm outline-none font-mono"
                style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)', color: '#fff' }}
                onKeyDown={e => e.key === 'Enter' && saveFbPageToken()}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={saveFbPageToken}
                  disabled={savingFbToken || !fbPageToken.trim()}
                  className="px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)', color: '#fff' }}
                >
                  {savingFbToken ? 'กำลังบันทึก...' : 'บันทึก Token'}
                </button>
                {showFbToken && (
                  <button onClick={() => { setShowFbToken(false); setFbPageToken('') }} className="font-mono text-xs text-purple hover:underline">ยกเลิก</button>
                )}
              </div>
            </div>
          )}
          {fbTokenMsg && (
            <div className="font-mono text-xs" style={{ color: fbTokenMsg.startsWith('✓') ? '#10B981' : '#F87171' }}>{fbTokenMsg}</div>
          )}
        </div>

        {/* Page ID */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-white">Page ID</label>
          <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>
            ดูได้ที่ Facebook Page → About → Page ID (ตัวเลข เช่น 123456789012345)
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={fbPageId}
              onChange={e => setFbPageId(e.target.value)}
              placeholder="123456789012345"
              className="flex-1 px-3 py-2.5 rounded-lg border text-white text-sm outline-none font-mono"
              style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)', color: '#fff' }}
              onKeyDown={e => e.key === 'Enter' && saveFbPageId()}
            />
            <button
              onClick={saveFbPageId}
              disabled={savingFbPageId}
              className="px-4 py-2.5 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50 flex-shrink-0"
              style={{ background: 'rgba(124,58,237,.3)', color: '#C4B5FD', border: '1px solid rgba(124,58,237,.4)' }}
            >
              {savingFbPageId ? 'บันทึก...' : 'บันทึก'}
            </button>
          </div>
          {fbPageIdMsg && (
            <div className="font-mono text-xs" style={{ color: fbPageIdMsg.startsWith('✓') ? '#10B981' : '#F87171' }}>{fbPageIdMsg}</div>
          )}
        </div>

        <div className="font-mono text-[10px] pt-1" style={{ color: 'rgba(155,142,196,.45)' }}>
          Token ที่บันทึกใน DB จะมีความสำคัญกว่า FB_PAGE_ACCESS_TOKEN env var — ใช้ Long-lived Page Access Token เพื่อไม่ให้หมดอายุ
        </div>
      </div>

      {/* Instagram */}
      <div className="rounded-xl border p-6 space-y-5 mb-6" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.4)' }}>
        <div className="flex items-center gap-2">
          <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest">📸 Instagram</div>
          {igUserId && (
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,.12)', color: '#10B981' }}>✓ ตั้งค่าแล้ว</span>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-white">Instagram Business Account ID</label>
          <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>
            ดึงอัตโนมัติจาก Facebook Page ที่เชื่อมกับ Instagram — ต้องตั้งค่า FB Page Access Token และ Page ID ก่อน
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={igUserId}
              onChange={e => setIgUserId(e.target.value)}
              placeholder="123456789012345"
              className="flex-1 px-3 py-2.5 rounded-lg border text-white text-sm outline-none font-mono"
              style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)', color: '#fff' }}
            />
            <button
              onClick={fetchIgUserIdFromFbPage}
              disabled={fetchingIgId}
              className="px-3 py-2.5 rounded-lg font-mono text-xs transition-all hover:opacity-90 disabled:opacity-50 flex-shrink-0"
              style={{ background: 'rgba(245,158,11,.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,.3)' }}
            >
              {fetchingIgId ? 'กำลังดึง...' : '🔍 Auto-fetch'}
            </button>
            <button
              onClick={saveIgUserId}
              disabled={savingIgUserId || !igUserId.trim()}
              className="px-4 py-2.5 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50 flex-shrink-0"
              style={{ background: 'rgba(124,58,237,.3)', color: '#C4B5FD', border: '1px solid rgba(124,58,237,.4)' }}
            >
              {savingIgUserId ? 'บันทึก...' : 'บันทึก'}
            </button>
          </div>
          {igUserIdMsg && (
            <div className="font-mono text-xs" style={{ color: igUserIdMsg.startsWith('✓') ? '#10B981' : '#F87171' }}>{igUserIdMsg}</div>
          )}
        </div>
        <div className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.45)' }}>
          ใช้ FB Page Access Token เดียวกับ Facebook — ต้องเป็น Instagram Business หรือ Creator Account เท่านั้น
        </div>
      </div>

      {/* HeyGen */}
      <div className="rounded-xl border p-6 space-y-5 mb-6" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.4)' }}>
        <div className="flex items-center gap-2">
          <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest">🎬 HeyGen (AI Avatar Video)</div>
          {heygenKeySet && <span className="font-mono text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,.12)', color: '#10B981' }}>✓ ตั้งค่าแล้ว</span>}
        </div>

        {/* API Key */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-white">API Key</label>
          <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>
            ดูได้ที่ app.heygen.com → API → API Credentials
          </p>
          {heygenKeySet && heygenKeyMasked && !showHeygenKey ? (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.2)' }}>
              <span className="font-mono text-sm" style={{ color: '#A78BFA' }}>{heygenKeyMasked}</span>
              <button onClick={() => setShowHeygenKey(true)} className="font-mono text-[10px] text-accent hover:underline ml-4">เปลี่ยน</button>
            </div>
          ) : (
            <div className="space-y-2">
              <input type="password" value={heygenKey} onChange={e => setHeygenKey(e.target.value)} placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" onKeyDown={e => e.key === 'Enter' && saveHeygenKey()}
                className="w-full px-3 py-2.5 rounded-lg border text-white text-sm outline-none font-mono"
                style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)' }} />
              <div className="flex items-center gap-2">
                <button onClick={saveHeygenKey} disabled={savingHeygenKey || !heygenKey.trim()}
                  className="px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)', color: '#fff' }}>
                  {savingHeygenKey ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
                {showHeygenKey && <button onClick={() => { setShowHeygenKey(false); setHeygenKey('') }} className="font-mono text-xs text-purple hover:underline">ยกเลิก</button>}
              </div>
            </div>
          )}
          {heygenKeyMsg && <div className="font-mono text-xs" style={{ color: heygenKeyMsg.startsWith('✓') ? '#10B981' : '#F87171' }}>{heygenKeyMsg}</div>}
        </div>

        {/* Browse button */}
        <div className="flex items-center gap-3">
          <button onClick={browseHeygenAssets} disabled={heygenAssetsLoading || !heygenKeySet}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: 'rgba(124,58,237,.2)', color: '#C4B5FD', border: '1px solid rgba(124,58,237,.35)' }}>
            {heygenAssetsLoading ? <><span className="w-3 h-3 rounded-full border border-purple/30 border-t-purple animate-spin" /> กำลังโหลด...</> : '🔍 ดู Avatars & Voices'}
          </button>
          {!heygenKeySet && <span className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.5)' }}>ใส่ API Key ก่อน</span>}
          {heygenAssetsMsg && <span className="font-mono text-xs" style={{ color: '#F87171' }}>{heygenAssetsMsg}</span>}
        </div>

        {/* Avatar ID — always visible manual input */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-white">Avatar ID</label>
          <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>
            วางค่า Avatar ID จาก HeyGen โดยตรง หรือกด Browse แล้วเลือกจากรายการ
          </p>
          <div className="flex items-center gap-2">
            <input type="text" value={heygenAvatarId} onChange={e => setHeygenAvatarId(e.target.value)}
              placeholder="b324decb0e3441cb8586c4fa88fe059f"
              className="flex-1 px-3 py-2.5 rounded-lg border text-white text-sm outline-none font-mono"
              style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)', color: '#fff' }}
              onKeyDown={e => e.key === 'Enter' && saveHeygenAvatar()} />
            <button onClick={saveHeygenAvatar} disabled={savingHeygenAvatar || !heygenAvatarId.trim()}
              className="px-4 py-2.5 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-40 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#A855F7)', color: '#fff' }}>
              {savingHeygenAvatar ? 'บันทึก...' : 'บันทึก'}
            </button>
          </div>
          {heygenAvatarMsg && <div className="font-mono text-xs" style={{ color: heygenAvatarMsg.startsWith('✓') ? '#10B981' : '#F87171' }}>{heygenAvatarMsg}</div>}
        </div>

        {/* Avatar Look ID */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-white">Avatar Look ID <span className="font-normal text-xs" style={{ color: 'rgba(155,142,196,.5)' }}>(optional)</span></label>
          <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>
            ดูได้ที่ HeyGen → Avatar → เลือก Avatar → Look ID (ชุดหรือ outfit ที่ต้องการ)
          </p>
          <div className="flex items-center gap-2">
            <input type="text" value={heygenAvatarLookId} onChange={e => setHeygenAvatarLookId(e.target.value)}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="flex-1 px-3 py-2.5 rounded-lg border text-white text-sm outline-none font-mono"
              style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)', color: '#fff' }}
              onKeyDown={e => e.key === 'Enter' && saveHeygenAvatarLook()} />
            <button onClick={saveHeygenAvatarLook} disabled={savingHeygenAvatarLook}
              className="px-4 py-2.5 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-40 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#A855F7)', color: '#fff' }}>
              {savingHeygenAvatarLook ? 'บันทึก...' : 'บันทึก'}
            </button>
          </div>
          {heygenAvatarLookMsg && <div className="font-mono text-xs" style={{ color: heygenAvatarLookMsg.startsWith('✓') ? '#10B981' : '#F87171' }}>{heygenAvatarLookMsg}</div>}
        </div>

        {/* Voice ID — always visible manual input */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-white">Voice ID</label>
          <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>
            วางค่า Voice ID จาก HeyGen โดยตรง หรือกด Browse แล้วเลือกจากรายการ
          </p>
          <div className="flex items-center gap-2">
            <input type="text" value={heygenVoiceId} onChange={e => setHeygenVoiceId(e.target.value)}
              placeholder="00c8fd447d7c42b2b254c98c3bd1c78b"
              className="flex-1 px-3 py-2.5 rounded-lg border text-white text-sm outline-none font-mono"
              style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)', color: '#fff' }}
              onKeyDown={e => e.key === 'Enter' && saveHeygenVoice()} />
            <button onClick={saveHeygenVoice} disabled={savingHeygenVoice || !heygenVoiceId.trim()}
              className="px-4 py-2.5 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-40 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#A855F7)', color: '#fff' }}>
              {savingHeygenVoice ? 'บันทึก...' : 'บันทึก'}
            </button>
          </div>
          {heygenVoiceMsg && <div className="font-mono text-xs" style={{ color: heygenVoiceMsg.startsWith('✓') ? '#10B981' : '#F87171' }}>{heygenVoiceMsg}</div>}
        </div>

        {/* Avatar/Voice picker (from Browse) */}
        {heygenAssets && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-white" style={{ color: 'rgba(155,142,196,.7)' }}>เลือก Avatar จากรายการ</label>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                {heygenAssets.avatars.map(a => (
                  <button key={a.avatar_id} type="button"
                    onClick={() => setHeygenAvatarId(a.avatar_id)}
                    className="rounded-lg overflow-hidden border text-left transition-all hover:opacity-90"
                    style={{ borderColor: heygenAvatarId === a.avatar_id ? '#10B981' : 'rgba(124,58,237,.2)', background: heygenAvatarId === a.avatar_id ? 'rgba(16,185,129,.08)' : 'rgba(45,27,94,.2)' }}>
                    {a.preview_image_url && <img src={a.preview_image_url} alt={a.avatar_name} className="w-full aspect-square object-cover object-top" />}
                    <div className="px-1.5 py-1 font-mono text-[9px] truncate" style={{ color: '#C4B5FD' }}>{a.avatar_name}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-white" style={{ color: 'rgba(155,142,196,.7)' }}>เลือก Voice จากรายการ</label>
              <input type="text" value={voiceSearch} onChange={e => setVoiceSearch(e.target.value)}
                placeholder="ค้นหา เช่น Thai, female, male..."
                className="w-full px-3 py-2 rounded-lg font-mono text-xs"
                style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(124,58,237,.25)', color: '#E2D9F3' }} />
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {heygenAssets.voices
                  .filter(v => !voiceSearch || `${v.name} ${v.language} ${v.gender}`.toLowerCase().includes(voiceSearch.toLowerCase()))
                  .map(v => (
                    <button key={v.voice_id} type="button"
                      onClick={() => setHeygenVoiceId(v.voice_id)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all hover:opacity-90"
                      style={{ border: `1px solid ${heygenVoiceId === v.voice_id ? '#10B981' : 'rgba(124,58,237,.15)'}`, background: heygenVoiceId === v.voice_id ? 'rgba(16,185,129,.08)' : 'rgba(45,27,94,.15)' }}>
                      <span className="font-mono text-xs" style={{ color: '#E2D9F3' }}>{v.name}</span>
                      <span className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>{v.language} · {v.gender}</span>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* LINE Webhook */}
      <div className="rounded-xl border p-6 space-y-4 mb-6" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.4)' }}>
        <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest">💬 LINE Webhook — Admin Self-Register</div>

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-white">Webhook URL</label>
          <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>
            ตั้งค่า URL นี้ใน LINE OA Manager → Messaging API → Webhook URL
          </p>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.2)' }}>
            <span className="font-mono text-xs flex-1 break-all" style={{ color: '#A78BFA' }}>
              https://thinkbizlab.com/api/line/webhook
            </span>
            <button
              onClick={() => navigator.clipboard.writeText('https://thinkbizlab.com/api/line/webhook')}
              className="font-mono text-[10px] px-2 py-1 rounded border flex-shrink-0 hover:bg-white/5 transition-colors"
              style={{ borderColor: 'rgba(124,58,237,.3)', color: '#C4B5FD' }}
            >
              Copy
            </button>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={testWebhook}
              disabled={testingWebhook}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs border transition-all hover:bg-white/5 disabled:opacity-50"
              style={{ borderColor: 'rgba(124,58,237,.3)', color: '#A78BFA' }}
            >
              {testingWebhook ? <><span className="w-3 h-3 rounded-full border border-purple/30 border-t-purple animate-spin" />ทดสอบ...</> : <>⚡ ทดสอบ Webhook</>}
            </button>
            {webhookTestResult && (
              <span className="font-mono text-xs" style={{ color: webhookTestResult.ok ? '#10B981' : '#F87171' }}>
                {webhookTestResult.msg}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-white">Channel Secret</label>
          <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>
            ดูได้ที่ LINE OA Manager → Messaging API → Channel secret
          </p>
          {lineSecretSet && lineSecretMasked && !showLineSecret ? (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.2)' }}>
              <span className="font-mono text-sm" style={{ color: '#A78BFA' }}>{lineSecretMasked}</span>
              <button onClick={() => setShowLineSecret(true)} className="font-mono text-[10px] text-accent hover:underline ml-4">
                เปลี่ยน
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={lineSecret}
                onChange={e => setLineSecret(e.target.value)}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="flex-1 px-3 py-2.5 rounded-lg border text-white text-sm outline-none font-mono"
                style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)', color: '#fff' }}
                onKeyDown={e => e.key === 'Enter' && saveLineSecret()}
              />
              <button
                onClick={saveLineSecret}
                disabled={savingLineSecret || !lineSecret.trim()}
                className="px-4 py-2.5 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)', color: '#fff' }}
              >
                {savingLineSecret ? 'บันทึก...' : 'บันทึก'}
              </button>
              {showLineSecret && (
                <button onClick={() => { setShowLineSecret(false); setLineSecret('') }} className="font-mono text-xs text-purple hover:underline">
                  ยกเลิก
                </button>
              )}
            </div>
          )}
          {lineSecretMsg && (
            <span className="font-mono text-xs" style={{ color: lineSecretMsg.startsWith('✓') ? '#10B981' : '#F87171' }}>
              {lineSecretMsg}
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-white">คีย์เวิร์ดลงทะเบียน Admin</label>
          <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>
            Admin ส่งข้อความนี้ให้บอท → บันทึก LINE User ID อัตโนมัติ<br />
            แนะนำให้ใช้ข้อความที่เดาได้ยาก เช่น รหัสลับ + ชื่อบริษัท
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={lineKeyword}
              onChange={e => setLineKeyword(e.target.value)}
              placeholder="admin register"
              className="flex-1 px-3 py-2.5 rounded-lg border text-white text-sm outline-none font-mono"
              style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)', color: '#fff' }}
              onKeyDown={e => e.key === 'Enter' && saveLineKeyword()}
            />
            <button
              onClick={saveLineKeyword}
              disabled={savingKeyword || !lineKeyword.trim()}
              className="px-4 py-2.5 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50 flex-shrink-0"
              style={{ background: 'rgba(124,58,237,.3)', color: '#C4B5FD', border: '1px solid rgba(124,58,237,.4)' }}
            >
              {savingKeyword ? 'บันทึก...' : 'บันทึก'}
            </button>
          </div>
          {keywordMsg && (
            <span className="font-mono text-xs" style={{ color: keywordMsg.startsWith('✓') ? '#10B981' : '#F87171' }}>
              {keywordMsg}
            </span>
          )}
        </div>

        <div className="rounded-lg p-3 space-y-1" style={{ background: 'rgba(16,185,129,.06)', border: '1px solid rgba(16,185,129,.15)' }}>
          <div className="font-mono text-[10px] font-bold" style={{ color: '#10B981' }}>วิธีใช้งาน</div>
          <div className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.7)' }}>
            1. ตั้งค่า Webhook URL ใน LINE OA Manager แล้วเปิด Use webhook<br />
            2. เพิ่ม LINE_CHANNEL_SECRET ใน Vercel Environment Variables<br />
            3. Admin แต่ละคนเปิด LINE แล้วส่งข้อความคีย์เวิร์ดให้บอท<br />
            4. บอทจะตอบกลับพร้อม User ID และบันทึกลง DB อัตโนมัติ<br />
            5. ส่ง &quot;admin remove&quot; เพื่อลบตัวเองออกจากรายชื่อ
          </div>
        </div>
      </div>

      {/* LINE Admin User IDs */}
      <div className="rounded-xl border p-6 space-y-4 mb-6" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.4)' }}>
        <div className="flex items-center justify-between">
          <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest">💬 LINE Admin User IDs</div>
          {lineAdminsMsg && (
            <span className="font-mono text-xs" style={{ color: lineAdminsMsg.startsWith('✓') ? '#10B981' : '#F87171' }}>
              {lineAdminsMsg}
            </span>
          )}
        </div>

        <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>
          Admin เหล่านี้จะได้รับข้อความเมื่อกด Test Broadcast — ส่งคีย์เวิร์ดให้บอทเพื่อลงทะเบียนอัตโนมัติ
        </p>

        {/* Admin list */}
        <div className="space-y-2">
          {lineAdminIds.length === 0 ? (
            <div className="font-mono text-xs py-2" style={{ color: 'rgba(155,142,196,.4)' }}>ยังไม่มี Admin — เพิ่มด้านล่าง</div>
          ) : (
            lineAdminIds.map(id => (
              <div key={id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.15)' }}>
                <span className="font-mono text-xs" style={{ color: '#A78BFA' }}>{id}</span>
                <button
                  onClick={() => removeAdminId(id)}
                  disabled={savingLineAdmins}
                  className="font-mono text-[10px] px-2 py-0.5 rounded hover:bg-red-500/20 transition-colors disabled:opacity-40"
                  style={{ color: '#F87171' }}
                >
                  ลบ
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add new ID */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={newAdminId}
            onChange={e => setNewAdminId(e.target.value)}
            placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            className="flex-1 px-3 py-2.5 rounded-lg border text-white text-sm outline-none font-mono"
            style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)', color: '#fff' }}
            onKeyDown={e => e.key === 'Enter' && addAdminId()}
          />
          <button
            onClick={addAdminId}
            disabled={savingLineAdmins || !newAdminId.trim()}
            className="px-4 py-2.5 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)', color: '#fff' }}
          >
            {savingLineAdmins ? '...' : '+ เพิ่ม'}
          </button>
        </div>
      </div>

      {/* Timezone */}
      <div className="rounded-xl border p-6 space-y-4 mb-6" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.4)' }}>
        <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest">🌏 Timezone</div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-white">Timezone ของเว็บไซต์</label>
            <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>
              ใช้สำหรับแสดงวันที่เวลาในบทความและ Cron job schedule
            </p>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border text-white text-sm outline-none"
              style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)', colorScheme: 'dark' }}
            >
              <optgroup label="เอเชีย">
                <option value="Asia/Bangkok">Asia/Bangkok (UTC+7) — ไทย</option>
                <option value="Asia/Singapore">Asia/Singapore (UTC+8) — สิงคโปร์</option>
                <option value="Asia/Tokyo">Asia/Tokyo (UTC+9) — ญี่ปุ่น</option>
                <option value="Asia/Shanghai">Asia/Shanghai (UTC+8) — จีน</option>
                <option value="Asia/Kolkata">Asia/Kolkata (UTC+5:30) — อินเดีย</option>
                <option value="Asia/Dubai">Asia/Dubai (UTC+4) — UAE</option>
              </optgroup>
              <optgroup label="ยุโรป">
                <option value="Europe/London">Europe/London (UTC+0/+1)</option>
                <option value="Europe/Paris">Europe/Paris (UTC+1/+2)</option>
              </optgroup>
              <optgroup label="อเมริกา">
                <option value="America/New_York">America/New_York (UTC-5/-4)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (UTC-8/-7)</option>
              </optgroup>
              <optgroup label="อื่นๆ">
                <option value="UTC">UTC (UTC+0)</option>
              </optgroup>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={saveTimezone}
              disabled={savingTz}
              className="px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'rgba(124,58,237,.3)', color: '#C4B5FD', border: '1px solid rgba(124,58,237,.4)' }}
            >
              {savingTz ? 'กำลังบันทึก...' : 'บันทึก Timezone'}
            </button>
            {tzMsg && (
              <span className="font-mono text-xs" style={{ color: tzMsg.startsWith('✓') ? '#10B981' : '#F87171' }}>
                {tzMsg}
              </span>
            )}
          </div>
          <div className="font-mono text-[10px] pt-1" style={{ color: 'rgba(155,142,196,.4)' }}>
            ปัจจุบัน: {new Date().toLocaleString('th-TH', { timeZone: timezone, dateStyle: 'full', timeStyle: 'medium' })}
          </div>
        </div>
      </div>

      {/* Content Factory */}
      <div className="rounded-xl border p-6 space-y-5 mb-6" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.4)' }}>
        <div className="flex items-center justify-between gap-6">
          <div>
            <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest mb-1">🧠 Content Factory</div>
            <div className="text-sm font-semibold text-white mb-1">สร้าง content ล่วงหน้า แล้วรอ approve ทาง LINE</div>
            <div className="font-mono text-xs" style={{ color: 'rgba(155,142,196,.6)' }}>
              ระบบจะสร้างบทความเป็น review, ส่ง LINE ให้ตรวจ, และจะ publish/social เฉพาะหลังตอบ approve CODE
            </div>
          </div>
          <button
            onClick={() => {
              const next = !factoryEnabled
              setFactoryEnabled(next)
              saveFactorySetting('content_factory_enabled', next)
            }}
            disabled={savingFactory === 'content_factory_enabled'}
            className="relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0"
            style={{ background: factoryEnabled ? '#7C3AED' : 'rgba(255,255,255,.15)' }}
          >
            <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
              style={{ transform: factoryEnabled ? 'translateX(24px)' : 'translateX(0)' }} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="space-y-1.5">
            <span className="block text-sm font-semibold text-white">ต่อวัน</span>
            <input type="number" min={1} max={10} value={factoryDailyCount} onChange={e => setFactoryDailyCount(Number(e.target.value))}
              onBlur={() => saveFactorySetting('content_factory_daily_count', factoryDailyCount)}
              className="w-full px-3 py-2.5 rounded-lg border text-white text-sm outline-none"
              style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)' }} />
          </label>
          <label className="space-y-1.5">
            <span className="block text-sm font-semibold text-white">วางล่วงหน้า (วัน)</span>
            <input type="number" min={1} max={60} value={factoryDaysAhead} onChange={e => setFactoryDaysAhead(Number(e.target.value))}
              onBlur={() => saveFactorySetting('content_factory_days_ahead', factoryDaysAhead)}
              className="w-full px-3 py-2.5 rounded-lg border text-white text-sm outline-none"
              style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)' }} />
          </label>
          <label className="space-y-1.5">
            <span className="block text-sm font-semibold text-white">เวลา publish</span>
            <input type="number" min={0} max={23} value={factoryPublishHour} onChange={e => setFactoryPublishHour(Number(e.target.value))}
              onBlur={() => saveFactorySetting('content_factory_publish_hour', factoryPublishHour)}
              className="w-full px-3 py-2.5 rounded-lg border text-white text-sm outline-none"
              style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)' }} />
          </label>
        </div>

        <label className="space-y-1.5 block">
          <span className="block text-sm font-semibold text-white">Topic bank</span>
          <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>
            1 บรรทัดต่อ topic. Format: topic | category | tag1, tag2, tag3
          </p>
          <textarea
            value={factoryTopicBank}
            onChange={e => setFactoryTopicBank(e.target.value)}
            rows={6}
            placeholder="ทำไม SME ต้องมี cash conversion cycle ที่สั้นลง? | Finance | SME, Cashflow&#10;AI ช่วยลดงานซ้ำในธุรกิจขนาดเล็กได้อย่างไร? | AI & Tech | AI, Automation"
            className="w-full px-3 py-2.5 rounded-lg border text-white text-sm outline-none font-mono"
            style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)' }}
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => saveFactorySetting('content_factory_topic_bank', factoryTopicBank)}
            disabled={savingFactory === 'content_factory_topic_bank'}
            className="px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'rgba(124,58,237,.3)', color: '#C4B5FD', border: '1px solid rgba(124,58,237,.4)' }}
          >
            {savingFactory === 'content_factory_topic_bank' ? 'กำลังบันทึก...' : 'บันทึก Topic bank'}
          </button>
          {factoryMsg && <span className="font-mono text-xs" style={{ color: factoryMsg.startsWith('✓') ? '#10B981' : '#F87171' }}>{factoryMsg}</span>}
        </div>
      </div>

      {/* Cron Job */}
      <div className="rounded-xl border p-6 space-y-6" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.4)' }}>
        <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest">Cron Job</div>

        <div className="flex items-center justify-between gap-6">
          <div>
            <div className="text-sm font-semibold text-white mb-1">Auto-publish &amp; Broadcast</div>
            <div className="font-mono text-xs" style={{ color: 'rgba(155,142,196,.6)' }}>
              รันทุกวัน 08:00 น. — เผยแพร่บทความ → LINE → Facebook → TikTok
            </div>
          </div>

          {cronEnabled === null ? (
            <div className="w-12 h-6 rounded-full bg-white/10 animate-pulse" />
          ) : (
            <button
              onClick={toggle}
              disabled={saving}
              className="relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0"
              style={{ background: cronEnabled ? '#7C3AED' : 'rgba(255,255,255,.15)' }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
                style={{ transform: cronEnabled ? 'translateX(24px)' : 'translateX(0)' }}
              />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'rgba(124,58,237,.12)' }}>
          <div className="w-2 h-2 rounded-full" style={{
            background: cronEnabled ? '#10B981' : '#EF4444',
            boxShadow: cronEnabled ? '0 0 6px #10B981' : 'none',
          }} />
          <span className="font-mono text-xs" style={{ color: cronEnabled ? '#10B981' : '#F87171' }}>
            {cronEnabled === null ? 'กำลังโหลด...' : cronEnabled ? 'เปิดใช้งาน — ทำงานอัตโนมัติทุกวัน 08:00 น.' : 'ปิดอยู่ — ไม่มีการโพสต์อัตโนมัติ'}
          </span>
        </div>

        {msg && (
          <div className="font-mono text-xs" style={{ color: '#10B981' }}>{msg}</div>
        )}
      </div>

      {/* Platform status */}
      <div className="mt-6 rounded-xl border p-6" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.4)' }}>
        <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest mb-4">Platform Connections</div>
        <div className="space-y-3">
          {[
            { icon: '💬', name: 'LINE Broadcast', env: 'LINE_CHANNEL_ACCESS_TOKEN' },
            { icon: '🔵', name: 'Facebook', env: 'FB_PAGE_ACCESS_TOKEN' },
            { icon: '📸', name: 'Instagram', env: 'IG_USER_ID' },
            { icon: '🎵', name: 'TikTok', env: 'DB' },
          ].map(p => (
            <div key={p.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm" style={{ color: '#9B8EC4' }}>
                <span>{p.icon}</span>
                <span>{p.name}</span>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  background: p.name === 'Instagram' ? 'rgba(245,158,11,.1)' : 'rgba(16,185,129,.1)',
                  color: p.name === 'Instagram' ? '#F59E0B' : '#10B981',
                }}>
                {p.name === 'Instagram' ? 'ยังไม่ได้ตั้งค่า' : 'เชื่อมต่อแล้ว'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
