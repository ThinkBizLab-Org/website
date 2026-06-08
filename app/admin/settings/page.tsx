'use client'
import { useEffect, useState } from 'react'

// fal.ai B-roll (generative video) model presets. brollModel stays a free string
// in config, so a custom id outside this list is preserved as a "current" option.
const BROLL_MODEL_PRESETS: { id: string; label: string }[] = [
  { id: 'fal-ai/kling-video/v1/standard/text-to-video', label: 'Kling 1.0 Standard (default, ถูกสุด)' },
  { id: 'fal-ai/bytedance/seedance/v1/lite/text-to-video', label: 'Seedance 1.0 Lite' },
  { id: 'fal-ai/bytedance/seedance/v1/pro/text-to-video', label: 'Seedance 1.0 Pro' },
  { id: 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video', label: 'Seedance 1.5 Pro' },
  { id: 'bytedance/seedance-2.0/fast/text-to-video', label: 'Seedance 2.0 Fast' },
  { id: 'bytedance/seedance-2.0/text-to-video', label: 'Seedance 2.0 (สมจริงสุด, แพงสุด)' },
]

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

  // Resend (email)
  const [resendKey, setResendKey] = useState('')
  const [resendMasked, setResendMasked] = useState('')
  const [resendSet, setResendSet] = useState(false)
  const [showResendKey, setShowResendKey] = useState(false)
  const [savingResendKey, setSavingResendKey] = useState(false)
  const [resendKeyMsg, setResendKeyMsg] = useState('')
  const [notifyFrom, setNotifyFrom] = useState('')
  const [savingNotifyFrom, setSavingNotifyFrom] = useState(false)
  const [notifyFromMsg, setNotifyFromMsg] = useState('')

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

  // LINE Channel Access Token
  const [lineToken, setLineToken] = useState('')
  const [lineTokenMasked, setLineTokenMasked] = useState('')
  const [lineTokenSet, setLineTokenSet] = useState(false)
  const [showLineToken, setShowLineToken] = useState(false)
  const [savingLineToken, setSavingLineToken] = useState(false)
  const [lineTokenMsg, setLineTokenMsg] = useState('')

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

  // TikTok app credentials
  const [ttClientKey, setTtClientKey] = useState('')
  const [savingTtClientKey, setSavingTtClientKey] = useState(false)
  const [ttClientKeyMsg, setTtClientKeyMsg] = useState('')
  const [ttSecret, setTtSecret] = useState('')
  const [ttSecretMasked, setTtSecretMasked] = useState('')
  const [ttSecretSet, setTtSecretSet] = useState(false)
  const [showTtSecret, setShowTtSecret] = useState(false)
  const [savingTtSecret, setSavingTtSecret] = useState(false)
  const [ttSecretMsg, setTtSecretMsg] = useState('')
  const [ttRedirect, setTtRedirect] = useState('')
  const [savingTtRedirect, setSavingTtRedirect] = useState(false)
  const [ttRedirectMsg, setTtRedirectMsg] = useState('')
  const [ttAudited, setTtAudited] = useState(false)
  const [savingTtAudited, setSavingTtAudited] = useState(false)

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

  // ElevenLabs (Thai voiceover for the Remotion video pipeline)
  const [elevenKey, setElevenKey] = useState('')
  const [elevenKeyMasked, setElevenKeyMasked] = useState('')
  const [elevenKeySet, setElevenKeySet] = useState(false)
  const [showElevenKey, setShowElevenKey] = useState(false)
  const [savingElevenKey, setSavingElevenKey] = useState(false)
  const [elevenKeyMsg, setElevenKeyMsg] = useState('')
  const [elevenVoiceId, setElevenVoiceId] = useState('')
  const [savingElevenVoice, setSavingElevenVoice] = useState(false)
  const [elevenVoiceMsg, setElevenVoiceMsg] = useState('')
  type ElevenVoice = { voice_id: string; name: string; source: 'mine' | 'library'; language?: string; accent?: string; gender?: string; preview_url?: string; public_owner_id?: string }
  const [elevenVoices, setElevenVoices] = useState<{ myVoices: ElevenVoice[]; libraryVoices: ElevenVoice[] } | null>(null)
  const [loadingElevenVoices, setLoadingElevenVoices] = useState(false)
  const [elevenVoicesMsg, setElevenVoicesMsg] = useState('')
  const [elevenManual, setElevenManual] = useState(false)

  // Video pipeline config + readiness preflight
  type ReadinessCheck = { key: string; ok: boolean; hint?: string }
  type Readiness = { ready: boolean; enabled: boolean; engine: string; ttsProvider: string; missing: string[]; checklist: ReadinessCheck[] }
  const [vpConfig, setVpConfig] = useState<{ enabled: boolean; engine: string; ttsProvider: string; requireApproval: boolean; brollModel: string } | null>(null)
  const [readiness, setReadiness] = useState<Readiness | null>(null)
  const [vpLoading, setVpLoading] = useState(false)
  const [vpMsg, setVpMsg] = useState('')

  // Timezone
  const [timezone, setTimezone] = useState('Asia/Bangkok')
  const [savingTz, setSavingTz] = useState(false)
  const [tzMsg, setTzMsg] = useState('')

  // Content Factory
  const [factoryEnabled, setFactoryEnabled] = useState(false)
  const [factoryDailyCount, setFactoryDailyCount] = useState(1)
  const [factoryDaysAhead, setFactoryDaysAhead] = useState(7)
  const [factoryPublishHour, setFactoryPublishHour] = useState(9)
  const [factoryAnalyticsFeedback, setFactoryAnalyticsFeedback] = useState(true)
  const [factoryQualityGate, setFactoryQualityGate] = useState(true)
  const [factoryTrendRefine, setFactoryTrendRefine] = useState(true)
  const [factoryTopicBank, setFactoryTopicBank] = useState('')
  const [factoryTrendFeeds, setFactoryTrendFeeds] = useState('')
  const [savingFactory, setSavingFactory] = useState<string | null>(null)
  const [factoryMsg, setFactoryMsg] = useState('')

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      setCronEnabled(d.cron_enabled)
      setAnthropicSet(d.anthropic_key_set)
      setAnthropicMasked(d.anthropic_key_masked ?? '')
      setFalSet(d.fal_key_set)
      setFalMasked(d.fal_key_masked ?? '')
      setResendSet(d.resend_key_set ?? false)
      setResendMasked(d.resend_key_masked ?? '')
      setNotifyFrom(d.notify_email_from ?? '')
      setTimezone(d.timezone ?? 'Asia/Bangkok')
      setGaId(d.ga_measurement_id ?? '')
      setFbPixelId(d.fb_pixel_id ?? '')
      setTtPixelId(d.tiktok_pixel_id ?? '')
      setLineAdminIds((d.line_admin_user_ids ?? '').split(',').map((s: string) => s.trim()).filter(Boolean))
      setLineKeyword(d.line_register_keyword ?? 'admin register')
      setLineSecretSet(d.line_channel_secret_set ?? false)
      setLineSecretMasked(d.line_channel_secret_masked ?? '')
      setLineTokenSet(d.line_access_token_set ?? false)
      setLineTokenMasked(d.line_access_token_masked ?? '')
      setFbPageTokenSet(d.fb_page_token_set ?? false)
      setFbPageTokenMasked(d.fb_page_token_masked ?? '')
      setFbPageId(d.fb_page_id ?? '')
      setIgUserId(d.ig_user_id ?? '')
      setTtClientKey(d.tiktok_client_key ?? '')
      setTtSecretSet(d.tiktok_secret_set ?? false)
      setTtSecretMasked(d.tiktok_secret_masked ?? '')
      setTtRedirect(d.tiktok_redirect_uri ?? '')
      setTtAudited(d.tiktok_audited ?? false)
      setHeygenKeySet(d.heygen_key_set ?? false)
      setHeygenKeyMasked(d.heygen_key_masked ?? '')
      setHeygenAvatarId(d.heygen_avatar_id ?? '')
      setHeygenAvatarLookId(d.heygen_avatar_look_id ?? '')
      setHeygenVoiceId(d.heygen_voice_id ?? '')
      setElevenKeySet(d.elevenlabs_key_set ?? false)
      setElevenKeyMasked(d.elevenlabs_key_masked ?? '')
      setElevenVoiceId(d.elevenlabs_voice_id ?? '')
      setFactoryEnabled(Boolean(d.content_factory_enabled))
      setFactoryDailyCount(Number(d.content_factory_daily_count ?? 1))
      setFactoryDaysAhead(Number(d.content_factory_days_ahead ?? 7))
      setFactoryPublishHour(Number(d.content_factory_publish_hour ?? 9))
      setFactoryAnalyticsFeedback(d.content_factory_analytics_feedback_enabled !== false)
      setFactoryQualityGate(d.content_factory_quality_gate_enabled !== false)
      setFactoryTrendRefine(d.content_factory_trend_refine_enabled !== false)
      setFactoryTopicBank(d.content_factory_topic_bank ?? '')
      setFactoryTrendFeeds(d.content_factory_trend_feeds ?? '')
    })
    fetch('/api/video-pipeline').then(r => r.json()).then(d => {
      if (d.config) setVpConfig({ enabled: d.config.enabled, engine: d.config.engine, ttsProvider: d.config.ttsProvider, requireApproval: Boolean(d.config.requireApproval), brollModel: d.config.brollModel ?? '' })
      if (d.readiness) setReadiness(d.readiness)
    }).catch(() => {})
  }, [])

  const saveLineToken = async () => {
    if (!lineToken.trim()) return
    setSavingLineToken(true)
    setLineTokenMsg('')
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ line_channel_access_token: lineToken.trim() }),
    })
    const data = await res.json()
    if (data.ok) {
      setLineTokenMsg('✓ บันทึก Channel Access Token แล้ว')
      setLineTokenSet(true)
      setLineToken('')
      setShowLineToken(false)
      fetch('/api/settings').then(r => r.json()).then(d => setLineTokenMasked(d.line_access_token_masked ?? ''))
    } else {
      setLineTokenMsg(`เกิดข้อผิดพลาด: ${data.error}`)
    }
    setSavingLineToken(false)
  }

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

  const saveTtClientKey = async () => {
    setSavingTtClientKey(true); setTtClientKeyMsg('')
    const res = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tiktok_client_key: ttClientKey.trim() }) })
    const data = await res.json()
    setTtClientKeyMsg(data.ok ? '✓ บันทึกแล้ว' : `Error: ${data.error}`)
    setSavingTtClientKey(false)
  }

  const saveTtSecret = async () => {
    if (!ttSecret.trim()) return
    setSavingTtSecret(true); setTtSecretMsg('')
    const res = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tiktok_client_secret: ttSecret.trim() }) })
    const data = await res.json()
    if (data.ok) { setTtSecretMsg('✓ บันทึก Client Secret แล้ว'); setTtSecretSet(true); setTtSecret(''); setShowTtSecret(false); fetch('/api/settings').then(r => r.json()).then(d => setTtSecretMasked(d.tiktok_secret_masked ?? '')) }
    else setTtSecretMsg(`เกิดข้อผิดพลาด: ${data.error}`)
    setSavingTtSecret(false)
  }

  const saveTtRedirect = async () => {
    setSavingTtRedirect(true); setTtRedirectMsg('')
    const res = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tiktok_redirect_uri: ttRedirect.trim() }) })
    const data = await res.json()
    setTtRedirectMsg(data.ok ? '✓ บันทึกแล้ว' : `Error: ${data.error}`)
    setSavingTtRedirect(false)
  }

  const saveTtAudited = async (value: boolean) => {
    setSavingTtAudited(true)
    setTtAudited(value)
    const res = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tiktok_audited: value }) })
    const data = await res.json()
    if (!data.ok) setTtAudited(!value)
    setSavingTtAudited(false)
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

  const saveElevenKey = async () => {
    if (!elevenKey.trim()) return
    setSavingElevenKey(true); setElevenKeyMsg('')
    const res = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ elevenlabs_api_key: elevenKey.trim() }) })
    const data = await res.json()
    if (data.ok) { setElevenKeyMsg('✓ บันทึก ElevenLabs API Key แล้ว'); setElevenKeySet(true); setElevenKey(''); setShowElevenKey(false); fetch('/api/settings').then(r => r.json()).then(d => setElevenKeyMasked(d.elevenlabs_key_masked ?? '')) }
    else { setElevenKeyMsg(`เกิดข้อผิดพลาด: ${data.error}`) }
    setSavingElevenKey(false)
  }

  const saveElevenVoice = async () => {
    setSavingElevenVoice(true); setElevenVoiceMsg('')
    const res = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ elevenlabs_voice_id: elevenVoiceId.trim() }) })
    const data = await res.json()
    setElevenVoiceMsg(data.ok ? '✓ บันทึกแล้ว' : `Error: ${data.error}`)
    setSavingElevenVoice(false)
  }

  const loadElevenVoices = async () => {
    setLoadingElevenVoices(true); setElevenVoicesMsg('')
    try {
      const res = await fetch('/api/elevenlabs/voices')
      const d = await res.json()
      if (!res.ok || d.error) { setElevenVoicesMsg(d.error ?? 'โหลดเสียงไม่สำเร็จ'); setElevenVoices(null) }
      else {
        setElevenVoices({ myVoices: d.myVoices ?? [], libraryVoices: d.libraryVoices ?? [] })
        if (!(d.myVoices ?? []).length && !(d.libraryVoices ?? []).length) setElevenVoicesMsg('ไม่พบเสียงไทยในคลัง — ลองวาง Voice ID เอง')
      }
    } catch { setElevenVoicesMsg('โหลดเสียงไม่สำเร็จ') } finally { setLoadingElevenVoices(false) }
  }

  const previewElevenVoice = (url?: string) => {
    if (!url) return
    try { const a = new Audio(url); void a.play() } catch { /* ignore autoplay errors */ }
  }

  // Selecting a library voice adds it to the account first (→ usable voice_id),
  // then persists it; account voices are saved directly.
  const selectElevenVoice = async (v: ElevenVoice) => {
    setSavingElevenVoice(true); setElevenVoiceMsg('')
    try {
      let voiceId = v.voice_id
      if (v.source === 'library') {
        setElevenVoiceMsg('⏳ กำลังเพิ่มเสียงเข้าบัญชี ElevenLabs...')
        const addRes = await fetch('/api/elevenlabs/voices', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_owner_id: v.public_owner_id, voice_id: v.voice_id, name: v.name }),
        })
        const addD = await addRes.json()
        if (!addRes.ok || addD.error) { setElevenVoiceMsg(`Error: ${addD.error}`); setSavingElevenVoice(false); return }
        voiceId = addD.voice_id
      }
      const res = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ elevenlabs_voice_id: voiceId }) })
      const d = await res.json()
      if (d.ok) {
        setElevenVoiceId(voiceId)
        setElevenVoiceMsg(`✓ เลือกเสียง "${v.name}" แล้ว`)
        fetch('/api/video-pipeline').then(r => r.json()).then(x => { if (x.readiness) setReadiness(x.readiness) }).catch(() => {})
      } else setElevenVoiceMsg(`Error: ${d.error}`)
    } catch (e) { setElevenVoiceMsg(`Error: ${String(e)}`) } finally { setSavingElevenVoice(false) }
  }

  const loadVideoPipeline = async () => {
    setVpLoading(true); setVpMsg('')
    try {
      const d = await (await fetch('/api/video-pipeline')).json()
      if (d.config) setVpConfig({ enabled: d.config.enabled, engine: d.config.engine, ttsProvider: d.config.ttsProvider, requireApproval: Boolean(d.config.requireApproval), brollModel: d.config.brollModel ?? '' })
      if (d.readiness) setReadiness(d.readiness)
    } catch { setVpMsg('โหลด readiness ไม่สำเร็จ') }
    setVpLoading(false)
  }

  const saveVpConfig = async (patch: Partial<{ enabled: boolean; engine: string; ttsProvider: string; requireApproval: boolean; brollModel: string }>) => {
    const next = { ...(vpConfig ?? { enabled: false, engine: 'remotion', ttsProvider: 'none', requireApproval: false, brollModel: '' }), ...patch }
    setVpConfig(next); setVpMsg('')
    const res = await fetch('/api/video-pipeline', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config: next }) })
    const data = await res.json()
    if (data.ok) { setVpMsg('✓ บันทึกแล้ว'); if (data.readiness) setReadiness(data.readiness); if (data.config) setVpConfig({ enabled: data.config.enabled, engine: data.config.engine, ttsProvider: data.config.ttsProvider, requireApproval: Boolean(data.config.requireApproval), brollModel: data.config.brollModel ?? '' }) }
    else setVpMsg(`เกิดข้อผิดพลาด: ${data.error ?? 'unknown'}`)
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

  const saveResendKey = async () => {
    if (!resendKey.trim()) return
    setSavingResendKey(true); setResendKeyMsg('')
    const res = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resend_api_key: resendKey.trim() }) })
    const data = await res.json()
    if (data.ok) { setResendKeyMsg('✓ บันทึก Resend API Key แล้ว'); setResendSet(true); setResendKey(''); setShowResendKey(false); fetch('/api/settings').then(r => r.json()).then(d => setResendMasked(d.resend_key_masked ?? '')) }
    else { setResendKeyMsg(`เกิดข้อผิดพลาด: ${data.error}`) }
    setSavingResendKey(false)
  }

  const saveNotifyFrom = async () => {
    setSavingNotifyFrom(true); setNotifyFromMsg('')
    const res = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notify_email_from: notifyFrom.trim() }) })
    const data = await res.json()
    setNotifyFromMsg(data.ok ? '✓ บันทึกแล้ว' : `Error: ${data.error}`)
    setSavingNotifyFrom(false)
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

      {/* Resend (email) */}
      <div className="rounded-xl border p-6 space-y-5 mb-6" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.4)' }}>
        <div className="flex items-center gap-2">
          <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest">✉️ Resend (Email)</div>
          {resendSet && <span className="font-mono text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,.12)', color: '#10B981' }}>✓ ตั้งค่าแล้ว</span>}
        </div>
        <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>
          อีเมลยืนยันสมัคร / welcome / newsletter / re-engagement — ต้อง verify โดเมนผู้ส่งใน resend.com ก่อน
        </p>

        {/* API Key */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-white">API Key</label>
          <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>ดูได้ที่ resend.com → API Keys (ขึ้นต้น re_...)</p>
          {resendSet && resendMasked && !showResendKey ? (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.2)' }}>
              <span className="font-mono text-sm" style={{ color: '#A78BFA' }}>{resendMasked}</span>
              <button onClick={() => setShowResendKey(true)} className="font-mono text-[10px] text-accent hover:underline ml-4">เปลี่ยน</button>
            </div>
          ) : (
            <div className="space-y-2">
              <input type="password" value={resendKey} onChange={e => setResendKey(e.target.value)} placeholder="re_xxxxxxxxxxxxxxxx" onKeyDown={e => e.key === 'Enter' && saveResendKey()}
                className="w-full px-3 py-2.5 rounded-lg border text-white text-sm outline-none font-mono"
                style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)' }} />
              <div className="flex items-center gap-2">
                <button onClick={saveResendKey} disabled={savingResendKey || !resendKey.trim()}
                  className="px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)', color: '#fff' }}>
                  {savingResendKey ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
                {showResendKey && <button onClick={() => { setShowResendKey(false); setResendKey('') }} className="font-mono text-xs text-purple hover:underline">ยกเลิก</button>}
              </div>
            </div>
          )}
          {resendKeyMsg && <div className="font-mono text-xs" style={{ color: resendKeyMsg.startsWith('✓') ? '#10B981' : '#F87171' }}>{resendKeyMsg}</div>}
        </div>

        {/* From address */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-white">From (อีเมลผู้ส่ง)</label>
          <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>ต้องเป็นโดเมนที่ verify แล้ว เช่น ThinkBiz Lab &lt;hello@thinkbizlab.com&gt;</p>
          <div className="flex items-center gap-2">
            <input type="text" value={notifyFrom} onChange={e => setNotifyFrom(e.target.value)}
              placeholder="ThinkBiz Lab <hello@thinkbizlab.com>"
              className="flex-1 px-3 py-2.5 rounded-lg border text-white text-sm outline-none font-mono"
              style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)', color: '#fff' }}
              onKeyDown={e => e.key === 'Enter' && saveNotifyFrom()} />
            <button onClick={saveNotifyFrom} disabled={savingNotifyFrom || !notifyFrom.trim()}
              className="px-4 py-2.5 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50 flex-shrink-0"
              style={{ background: 'rgba(124,58,237,.3)', color: '#C4B5FD', border: '1px solid rgba(124,58,237,.4)' }}>
              {savingNotifyFrom ? 'บันทึก...' : 'บันทึก'}
            </button>
          </div>
          {notifyFromMsg && <div className="font-mono text-xs" style={{ color: notifyFromMsg.startsWith('✓') ? '#10B981' : '#F87171' }}>{notifyFromMsg}</div>}
        </div>

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

      {/* TikTok */}
      <div className="rounded-xl border p-6 space-y-5 mb-6" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.4)' }}>
        <div className="flex items-center gap-2">
          <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest">🎵 TikTok</div>
          {ttClientKey && ttSecretSet && <span className="font-mono text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,.12)', color: '#10B981' }}>✓ ตั้งค่าแล้ว</span>}
        </div>
        <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>
          จาก developers.tiktok.com → app ของคุณ. ตั้งค่าครบแล้วไปเชื่อมบัญชีที่ <a href="/admin/tiktok" className="text-accent hover:underline">TikTok Auth</a>
        </p>

        {/* Client Key */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-white">Client Key</label>
          <div className="flex items-center gap-2">
            <input type="text" value={ttClientKey} onChange={e => setTtClientKey(e.target.value)} placeholder="awxxxxxxxxxxxxxxxx"
              className="flex-1 px-3 py-2.5 rounded-lg border text-white text-sm outline-none font-mono"
              style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)', color: '#fff' }}
              onKeyDown={e => e.key === 'Enter' && saveTtClientKey()} />
            <button onClick={saveTtClientKey} disabled={savingTtClientKey}
              className="px-4 py-2.5 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50 flex-shrink-0"
              style={{ background: 'rgba(124,58,237,.3)', color: '#C4B5FD', border: '1px solid rgba(124,58,237,.4)' }}>
              {savingTtClientKey ? 'บันทึก...' : 'บันทึก'}
            </button>
          </div>
          {ttClientKeyMsg && <div className="font-mono text-xs" style={{ color: ttClientKeyMsg.startsWith('✓') ? '#10B981' : '#F87171' }}>{ttClientKeyMsg}</div>}
        </div>

        {/* Client Secret */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-white">Client Secret</label>
          {ttSecretSet && ttSecretMasked && !showTtSecret ? (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.2)' }}>
              <span className="font-mono text-sm" style={{ color: '#A78BFA' }}>{ttSecretMasked}</span>
              <button onClick={() => setShowTtSecret(true)} className="font-mono text-[10px] text-accent hover:underline ml-4">เปลี่ยน</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input type="password" value={ttSecret} onChange={e => setTtSecret(e.target.value)} placeholder="client secret"
                className="flex-1 px-3 py-2.5 rounded-lg border text-white text-sm outline-none font-mono"
                style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)', color: '#fff' }}
                onKeyDown={e => e.key === 'Enter' && saveTtSecret()} />
              <button onClick={saveTtSecret} disabled={savingTtSecret || !ttSecret.trim()}
                className="px-4 py-2.5 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-40 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)', color: '#fff' }}>
                {savingTtSecret ? 'บันทึก...' : 'บันทึก'}
              </button>
              {showTtSecret && <button onClick={() => { setShowTtSecret(false); setTtSecret('') }} className="font-mono text-xs text-purple hover:underline">ยกเลิก</button>}
            </div>
          )}
          {ttSecretMsg && <div className="font-mono text-xs" style={{ color: ttSecretMsg.startsWith('✓') ? '#10B981' : '#F87171' }}>{ttSecretMsg}</div>}
        </div>

        {/* Redirect URI */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-white">Redirect URI</label>
          <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>ต้องตรงกับที่ตั้งใน TikTok app เป๊ะ ๆ</p>
          <div className="flex items-center gap-2">
            <input type="text" value={ttRedirect} onChange={e => setTtRedirect(e.target.value)}
              placeholder="https://thinkbizlab.com/api/auth/tiktok/callback"
              className="flex-1 px-3 py-2.5 rounded-lg border text-white text-sm outline-none font-mono"
              style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)', color: '#fff' }}
              onKeyDown={e => e.key === 'Enter' && saveTtRedirect()} />
            <button onClick={saveTtRedirect} disabled={savingTtRedirect}
              className="px-4 py-2.5 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50 flex-shrink-0"
              style={{ background: 'rgba(124,58,237,.3)', color: '#C4B5FD', border: '1px solid rgba(124,58,237,.4)' }}>
              {savingTtRedirect ? 'บันทึก...' : 'บันทึก'}
            </button>
          </div>
          {ttRedirectMsg && <div className="font-mono text-xs" style={{ color: ttRedirectMsg.startsWith('✓') ? '#10B981' : '#F87171' }}>{ttRedirectMsg}</div>}
        </div>

        {/* Audited / approved gate */}
        <div className="space-y-1.5 pt-3 border-t" style={{ borderColor: 'rgba(124,58,237,.15)' }}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={ttAudited} disabled={savingTtAudited} onChange={e => saveTtAudited(e.target.checked)} className="accent-purple w-4 h-4" />
            <span className="text-sm font-semibold text-white">แอปผ่าน TikTok review แล้ว (อนุญาตโพสต์สาธารณะ)</span>
          </label>
          <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>
            เปิดหลังจาก app review ผ่านแล้วเท่านั้น — ถ้ายังไม่เปิด ระบบจะบังคับโพสต์เป็น &ldquo;ส่วนตัว (SELF_ONLY)&rdquo; เพื่อให้เป็นไปตามกฎ TikTok
          </p>
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

      {/* ElevenLabs */}
      <div className="rounded-xl border p-6 space-y-5 mb-6" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.4)' }}>
        <div className="flex items-center gap-2">
          <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest">🎙️ ElevenLabs (Thai Voiceover)</div>
          {elevenKeySet && <span className="font-mono text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,.12)', color: '#10B981' }}>✓ ตั้งค่าแล้ว</span>}
        </div>
        <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>
          เสียงพากย์ไทยสำหรับ Video Pipeline (Remotion) — Key เก็บแบบเข้ารหัสใน DB
        </p>

        {/* API Key */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-white">API Key</label>
          <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>ดูได้ที่ elevenlabs.io → Profile → API Keys</p>
          {elevenKeySet && elevenKeyMasked && !showElevenKey ? (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.2)' }}>
              <span className="font-mono text-sm" style={{ color: '#A78BFA' }}>{elevenKeyMasked}</span>
              <button onClick={() => setShowElevenKey(true)} className="font-mono text-[10px] text-accent hover:underline ml-4">เปลี่ยน</button>
            </div>
          ) : (
            <div className="space-y-2">
              <input type="password" value={elevenKey} onChange={e => setElevenKey(e.target.value)} placeholder="sk_xxxxxxxxxxxxxxxxxxxx" onKeyDown={e => e.key === 'Enter' && saveElevenKey()}
                className="w-full px-3 py-2.5 rounded-lg border text-white text-sm outline-none font-mono"
                style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)' }} />
              <div className="flex items-center gap-2">
                <button onClick={saveElevenKey} disabled={savingElevenKey || !elevenKey.trim()}
                  className="px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)', color: '#fff' }}>
                  {savingElevenKey ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
                {showElevenKey && <button onClick={() => { setShowElevenKey(false); setElevenKey('') }} className="font-mono text-xs text-purple hover:underline">ยกเลิก</button>}
              </div>
            </div>
          )}
          {elevenKeyMsg && <div className="font-mono text-xs" style={{ color: elevenKeyMsg.startsWith('✓') ? '#10B981' : '#F87171' }}>{elevenKeyMsg}</div>}
        </div>

        {/* Voice selector — Thai-capable voices from the ElevenLabs library + account */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="block text-sm font-semibold text-white">Voice (เสียงพากย์ไทย)</label>
            <button onClick={loadElevenVoices} disabled={loadingElevenVoices || !elevenKeySet}
              className="font-mono text-[10px] px-2.5 py-1 rounded border transition-all hover:bg-white/5 disabled:opacity-40 flex-shrink-0"
              style={{ borderColor: 'rgba(124,58,237,.3)', color: '#A78BFA' }}>
              {loadingElevenVoices
                ? <><span className="inline-block w-2.5 h-2.5 rounded-full border border-purple/30 border-t-purple animate-spin align-middle" /> กำลังโหลด...</>
                : (elevenVoices ? '↻ โหลดใหม่' : '🔍 โหลดเสียงไทย')}
            </button>
          </div>
          <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>
            ดึงเฉพาะเสียงที่รองรับไทย (multilingual v2) — เลือกจากคลังแล้วระบบเพิ่มเข้าบัญชีให้อัตโนมัติ {!elevenKeySet && '· ใส่ API Key ก่อน'}
          </p>

          {elevenVoiceId && (
            <div className="font-mono text-[10px] px-2.5 py-1.5 rounded" style={{ background: 'rgba(16,185,129,.1)', color: '#10B981', border: '1px solid rgba(16,185,129,.25)' }}>
              ✓ ใช้อยู่: <span className="font-bold break-all">{elevenVoiceId}</span>
            </div>
          )}

          {elevenVoices && (elevenVoices.libraryVoices.length > 0 || elevenVoices.myVoices.length > 0) && (
            <div className="space-y-3 rounded-lg border p-3" style={{ borderColor: 'rgba(124,58,237,.2)', background: 'rgba(15,13,26,.5)' }}>
              {elevenVoices.libraryVoices.length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'rgba(155,142,196,.7)' }}>🇹🇭 คลังเสียงไทย ElevenLabs ({elevenVoices.libraryVoices.length})</div>
                  <div className="space-y-1 overflow-y-auto" style={{ maxHeight: 256 }}>
                    {elevenVoices.libraryVoices.map(v => (
                      <div key={`lib-${v.voice_id}`} className="flex items-center gap-2 px-2 py-1.5 rounded" style={{ background: elevenVoiceId === v.voice_id ? 'rgba(16,185,129,.1)' : 'rgba(124,58,237,.06)' }}>
                        <button onClick={() => previewElevenVoice(v.preview_url)} disabled={!v.preview_url} title="ฟังตัวอย่าง" className="text-xs disabled:opacity-30" style={{ color: '#A78BFA' }}>▶</button>
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-xs truncate" style={{ color: '#E2D9F3' }}>{v.name}</div>
                          <div className="font-mono text-[9px]" style={{ color: 'rgba(155,142,196,.5)' }}>{[v.gender, v.accent, v.language].filter(Boolean).join(' · ') || 'ไทย'}</div>
                        </div>
                        <button onClick={() => selectElevenVoice(v)} disabled={savingElevenVoice} className="font-mono text-[10px] px-2 py-0.5 rounded border transition-all hover:bg-white/5 disabled:opacity-40 flex-shrink-0" style={{ borderColor: 'rgba(124,58,237,.3)', color: '#A78BFA' }}>เลือก</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {elevenVoices.myVoices.length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'rgba(155,142,196,.7)' }}>🎙️ เสียงในบัญชีของฉัน ({elevenVoices.myVoices.length})</div>
                  <div className="space-y-1 overflow-y-auto" style={{ maxHeight: 192 }}>
                    {elevenVoices.myVoices.map(v => (
                      <div key={`mine-${v.voice_id}`} className="flex items-center gap-2 px-2 py-1.5 rounded" style={{ background: elevenVoiceId === v.voice_id ? 'rgba(16,185,129,.1)' : 'rgba(124,58,237,.06)' }}>
                        <button onClick={() => previewElevenVoice(v.preview_url)} disabled={!v.preview_url} title="ฟังตัวอย่าง" className="text-xs disabled:opacity-30" style={{ color: '#A78BFA' }}>▶</button>
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-xs truncate" style={{ color: '#E2D9F3' }}>{v.name}{v.language === 'th' && <span className="ml-1.5 text-[9px]" style={{ color: '#10B981' }}>· ไทย ✓</span>}</div>
                          <div className="font-mono text-[9px]" style={{ color: 'rgba(155,142,196,.5)' }}>{[v.gender, v.accent].filter(Boolean).join(' · ') || v.voice_id}</div>
                        </div>
                        <button onClick={() => selectElevenVoice(v)} disabled={savingElevenVoice} className="font-mono text-[10px] px-2 py-0.5 rounded border transition-all hover:bg-white/5 disabled:opacity-40 flex-shrink-0" style={{ borderColor: 'rgba(124,58,237,.3)', color: '#A78BFA' }}>{elevenVoiceId === v.voice_id ? '✓ ใช้อยู่' : 'เลือก'}</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {elevenVoicesMsg && <div className="font-mono text-xs" style={{ color: '#F87171' }}>{elevenVoicesMsg}</div>}

          <button onClick={() => setElevenManual(m => !m)} className="font-mono text-[10px] text-purple hover:underline">
            {elevenManual ? '▲ ซ่อนการกรอกเอง' : '▼ หรือวาง Voice ID เอง'}
          </button>
          {elevenManual && (
            <div className="flex items-center gap-2">
              <input type="text" value={elevenVoiceId} onChange={e => setElevenVoiceId(e.target.value)}
                placeholder="21m00Tcm4TlvDq8ikWAM"
                className="flex-1 px-3 py-2.5 rounded-lg border text-white text-sm outline-none font-mono"
                style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)', color: '#fff' }}
                onKeyDown={e => e.key === 'Enter' && saveElevenVoice()} />
              <button onClick={saveElevenVoice} disabled={savingElevenVoice || !elevenVoiceId.trim()}
                className="px-4 py-2.5 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-40 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#7C3AED,#A855F7)', color: '#fff' }}>
                {savingElevenVoice ? 'บันทึก...' : 'บันทึก'}
              </button>
            </div>
          )}
          {elevenVoiceMsg && <div className="font-mono text-xs" style={{ color: elevenVoiceMsg.startsWith('✓') ? '#10B981' : '#F87171' }}>{elevenVoiceMsg}</div>}
        </div>
      </div>

      {/* Video Pipeline + Readiness */}
      <div className="rounded-xl border p-6 space-y-5 mb-6" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.4)' }}>
        <div className="flex items-center justify-between">
          <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest">🎞️ Video Pipeline (Remotion)</div>
          {readiness && (
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full" style={{ background: readiness.ready ? 'rgba(16,185,129,.12)' : 'rgba(248,113,113,.12)', color: readiness.ready ? '#10B981' : '#F87171' }}>
              {readiness.ready ? '✓ พร้อมใช้งาน' : `ขาด ${readiness.missing.length} รายการ`}
            </span>
          )}
        </div>
        <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>
          เปิดใช้งานได้เมื่อ readiness ครบทุกข้อ (deploy Remotion Lambda + ใส่คีย์ครบ) — ไม่งั้นงานจะ fail ตก dead-letter
        </p>

        {/* TTS provider */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-white">TTS Provider (เสียงพากย์)</label>
          <select value={vpConfig?.ttsProvider ?? 'none'} onChange={e => saveVpConfig({ ttsProvider: e.target.value })}
            className="w-full px-3 py-2.5 rounded-lg border text-white text-sm outline-none font-mono"
            style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)' }}>
            <option value="none">ไม่มีเสียงพากย์</option>
            <option value="elevenlabs">ElevenLabs</option>
            <option value="google">Google Cloud TTS</option>
          </select>
        </div>

        {/* B-roll generative video model (fal.ai) */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-white">B-roll model (วิดีโอ AI ฉากหลัง)</label>
          <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>
            ใช้กับ scene ที่เป็น B-roll — Remotion จะทับข้อความ/เสียงไทยบนคลิปนี้. Kling = ถูก/เร็ว, Seedance = สมจริงกว่าแต่แพงกว่า
          </p>
          <select value={vpConfig?.brollModel ?? ''} onChange={e => saveVpConfig({ brollModel: e.target.value })}
            className="w-full px-3 py-2.5 rounded-lg border text-white text-sm outline-none font-mono"
            style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)' }}>
            {vpConfig?.brollModel && !BROLL_MODEL_PRESETS.some(p => p.id === vpConfig.brollModel) && (
              <option value={vpConfig.brollModel}>{`current: ${vpConfig.brollModel}`}</option>
            )}
            {BROLL_MODEL_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>

        {/* Require human approval before auto-posting video */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">ต้องอนุมัติก่อนโพสต์วิดีโอ</div>
            <div className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.5)' }}>
              เปิด = วิดีโอจะถูกถือไว้จนกดอนุมัติใน Video Review ก่อนโพสต์ TikTok/Reels
            </div>
          </div>
          <button onClick={() => saveVpConfig({ requireApproval: !(vpConfig?.requireApproval) })}
            className="relative w-12 h-6 rounded-full transition-all flex-shrink-0"
            style={{ background: vpConfig?.requireApproval ? '#10B981' : 'rgba(124,58,237,.25)' }}>
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: vpConfig?.requireApproval ? '26px' : '2px' }} />
          </button>
        </div>

        {/* Readiness checklist */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <button onClick={loadVideoPipeline} disabled={vpLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs border transition-all hover:bg-white/5 disabled:opacity-50"
              style={{ borderColor: 'rgba(124,58,237,.3)', color: '#A78BFA' }}>
              {vpLoading ? <><span className="w-3 h-3 rounded-full border border-purple/30 border-t-purple animate-spin" />ตรวจสอบ...</> : <>🔄 ตรวจ Readiness</>}
            </button>
            {vpMsg && <span className="font-mono text-xs" style={{ color: vpMsg.startsWith('✓') ? '#10B981' : '#F87171' }}>{vpMsg}</span>}
          </div>
          {readiness && (
            <div className="space-y-1 rounded-lg p-3" style={{ background: 'rgba(15,13,26,.5)', border: '1px solid rgba(124,58,237,.15)' }}>
              {readiness.checklist.map(c => (
                <div key={c.key} className="flex items-start gap-2 font-mono text-[11px]">
                  <span style={{ color: c.ok ? '#10B981' : '#F87171' }}>{c.ok ? '✓' : '✗'}</span>
                  <span style={{ color: c.ok ? '#C4B5FD' : '#F87171' }}>{c.key}</span>
                  {!c.ok && c.hint && <span style={{ color: 'rgba(155,142,196,.5)' }}>— {c.hint}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Enable toggle */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="text-sm font-semibold text-white">เปิดใช้งาน Pipeline</div>
            <div className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.5)' }}>
              {readiness && !readiness.ready ? 'แนะนำให้ readiness ครบก่อนเปิด' : 'engine: ' + (vpConfig?.engine ?? 'remotion')}
            </div>
          </div>
          <button onClick={() => saveVpConfig({ enabled: !(vpConfig?.enabled) })}
            className="relative w-12 h-6 rounded-full transition-all flex-shrink-0"
            style={{ background: vpConfig?.enabled ? '#10B981' : 'rgba(124,58,237,.25)' }}>
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: vpConfig?.enabled ? '26px' : '2px' }} />
          </button>
        </div>
        {vpConfig?.enabled && readiness && !readiness.ready && (
          <div className="font-mono text-[11px] px-3 py-2 rounded-lg" style={{ background: 'rgba(248,113,113,.1)', color: '#F87171', border: '1px solid rgba(248,113,113,.25)' }}>
            ⚠️ เปิดอยู่แต่ readiness ยังไม่ครบ — งานวิดีโออาจ fail จนกว่าจะ provision ครบ
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
          <label className="block text-sm font-semibold text-white">Channel Access Token</label>
          <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>
            ดูได้ที่ LINE Developers → Messaging API → Channel access token (long-lived) — ใช้ส่ง broadcast + การ์ดอนุมัติ
          </p>
          {lineTokenSet && lineTokenMasked && !showLineToken ? (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.2)' }}>
              <span className="font-mono text-sm" style={{ color: '#A78BFA' }}>{lineTokenMasked}</span>
              <button onClick={() => setShowLineToken(true)} className="font-mono text-[10px] text-accent hover:underline ml-4">เปลี่ยน</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input type="password" value={lineToken} onChange={e => setLineToken(e.target.value)}
                placeholder="channel access token (long-lived)"
                className="flex-1 px-3 py-2.5 rounded-lg border text-white text-sm outline-none font-mono"
                style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)', color: '#fff' }}
                onKeyDown={e => e.key === 'Enter' && saveLineToken()} />
              <button onClick={saveLineToken} disabled={savingLineToken || !lineToken.trim()}
                className="px-4 py-2.5 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)', color: '#fff' }}>
                {savingLineToken ? 'บันทึก...' : 'บันทึก'}
              </button>
              {showLineToken && <button onClick={() => { setShowLineToken(false); setLineToken('') }} className="font-mono text-xs text-purple hover:underline">ยกเลิก</button>}
            </div>
          )}
          {lineTokenMsg && <span className="font-mono text-xs" style={{ color: lineTokenMsg.startsWith('✓') ? '#10B981' : '#F87171' }}>{lineTokenMsg}</span>}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              const next = !factoryAnalyticsFeedback
              setFactoryAnalyticsFeedback(next)
              saveFactorySetting('content_factory_analytics_feedback_enabled', next)
            }}
            className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-left"
            style={{ borderColor: 'rgba(124,58,237,.2)', background: 'rgba(15,13,26,.45)' }}
          >
            <span>
              <span className="block text-sm font-semibold text-white">Analytics feedback loop</span>
              <span className="block font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>ใช้หมวดที่คนอ่านเยอะช่วยวาง topic</span>
            </span>
            <span className="font-mono text-xs" style={{ color: factoryAnalyticsFeedback ? '#10B981' : '#9B8EC4' }}>{factoryAnalyticsFeedback ? 'on' : 'off'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const next = !factoryQualityGate
              setFactoryQualityGate(next)
              saveFactorySetting('content_factory_quality_gate_enabled', next)
            }}
            className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-left"
            style={{ borderColor: 'rgba(124,58,237,.2)', background: 'rgba(15,13,26,.45)' }}
          >
            <span>
              <span className="block text-sm font-semibold text-white">Quality gate alerts</span>
              <span className="block font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>log warning เมื่อ draft ไม่พร้อม publish</span>
            </span>
            <span className="font-mono text-xs" style={{ color: factoryQualityGate ? '#10B981' : '#9B8EC4' }}>{factoryQualityGate ? 'on' : 'off'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const next = !factoryTrendRefine
              setFactoryTrendRefine(next)
              saveFactorySetting('content_factory_trend_refine_enabled', next)
            }}
            className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-left"
            style={{ borderColor: 'rgba(124,58,237,.2)', background: 'rgba(15,13,26,.45)' }}
          >
            <span>
              <span className="block text-sm font-semibold text-white">AI refine trend feeds</span>
              <span className="block font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>ใช้ AI กรองข่าวธุรกิจ + เรียบเรียง headline เป็นมุม insight</span>
            </span>
            <span className="font-mono text-xs" style={{ color: factoryTrendRefine ? '#10B981' : '#9B8EC4' }}>{factoryTrendRefine ? 'on' : 'off'}</span>
          </button>
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

        <label className="space-y-1.5 block">
          <span className="block text-sm font-semibold text-white">Trend feeds (RSS/Atom)</span>
          <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>
            1 ฟีดต่อบรรทัด — ดึงหัวข้อข่าว/เทรนด์จริงมาเป็นวัตถุดิบให้ Factory. Format: url | Category
          </p>
          <textarea
            value={factoryTrendFeeds}
            onChange={e => setFactoryTrendFeeds(e.target.value)}
            rows={4}
            placeholder="https://news.google.com/rss/search?q=ธุรกิจ+SME&hl=th&gl=TH&ceid=TH:th | Strategy&#10;https://www.bangkokbiznews.com/rss/feed/business.xml | Finance"
            className="w-full px-3 py-2.5 rounded-lg border text-white text-sm outline-none font-mono"
            style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)' }}
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => saveFactorySetting('content_factory_trend_feeds', factoryTrendFeeds)}
            disabled={savingFactory === 'content_factory_trend_feeds'}
            className="px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'rgba(124,58,237,.3)', color: '#C4B5FD', border: '1px solid rgba(124,58,237,.4)' }}
          >
            {savingFactory === 'content_factory_trend_feeds' ? 'กำลังบันทึก...' : 'บันทึก Trend feeds'}
          </button>
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
