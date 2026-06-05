'use client'
import { useState, useEffect, useRef } from 'react'

import type { Article, Category } from '@/lib/schema'
import { CoverImageUpload } from './CoverImageUpload'
import { RichEditor } from './RichEditor'
import { GenerateModal, type GeneratedOption } from './GenerateModal'
import { PreviewModal, type Platform as PreviewPlatform } from './PreviewModal'
import { GoogleDrivePicker } from './GoogleDrivePicker'
import { RevisionHistoryPanel } from './RevisionHistoryPanel'
import { SeoGeoChecklist } from './SeoGeoChecklist'

interface FAQ { q: string; a: string }

interface Props {
  article?: Article
  mode: 'new' | 'edit'
}

const STATUS_OPTIONS = [
  { value: 'draft',     label: 'Draft — ร่าง' },
  { value: 'review',    label: 'Review — รอตรวจ' },
  { value: 'approved',  label: 'Approved — อนุมัติแล้ว' },
  { value: 'published', label: 'Published — เผยแพร่' },
]

export function ArticleForm({ article, mode }: Props) {

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [msg, setMsg] = useState('')
  const [geoScore, setGeoScore] = useState(article?.geoScore ?? 0)
  const [showModal, setShowModal] = useState(false)
  const [generatingCover, setGeneratingCover] = useState(false)
  const [lineTestLoading, setLineTestLoading] = useState(false)
  const [lineBroadcastLoading, setLineBroadcastLoading] = useState(false)
  const [lineMsg, setLineMsg] = useState('')
  const [showBroadcastConfirm, setShowBroadcastConfirm] = useState(false)
  const [fbPostLoading, setFbPostLoading] = useState(false)
  const [fbMsg, setFbMsg] = useState('')
  const [showFbConfirm, setShowFbConfirm] = useState(false)
  const [igPostLoading, setIgPostLoading] = useState(false)
  const [igMsg, setIgMsg] = useState('')
  const [showIgConfirm, setShowIgConfirm] = useState<'photo' | 'reel' | null>(null)
  const [igImageLoading, setIgImageLoading] = useState(false)
  const [fbReelLoading, setFbReelLoading] = useState(false)
  const [fbReelMsg, setFbReelMsg] = useState('')
  const [showFbReelConfirm, setShowFbReelConfirm] = useState(false)
  const [ttPostLoading, setTtPostLoading] = useState(false)
  const [ttPostMsg, setTtPostMsg] = useState('')
  const [showTtConfirm, setShowTtConfirm] = useState(false)
  const [igReelLoading, setIgReelLoading] = useState(false)
  const [igReelMsg, setIgReelMsg] = useState('')
  const [showIgReelConfirm, setShowIgReelConfirm] = useState(false)
  const [ttTestLoading, setTtTestLoading] = useState(false)
  const [ttTestMsg, setTtTestMsg] = useState('')
  const [aiVideoScript, setAiVideoScript] = useState(() => {
    const parts: string[] = []
    if (article?.title) parts.push(article.title)
    if (article?.excerpt) parts.push(article.excerpt.slice(0, 200))
    return parts.join('\n\n')
  })
  const [aiVideoLoading, setAiVideoLoading] = useState(false)
  const [aiVideoUrl, setAiVideoUrl] = useState('')
  const [aiVideoMsg, setAiVideoMsg] = useState('')
  const [aiVideoDriveLoading, setAiVideoDriveLoading] = useState(false)
  const [googleClientId, setGoogleClientId] = useState('')
  const [previewLinkLoading, setPreviewLinkLoading] = useState(false)
  const [coverPrompt, setCoverPrompt] = useState(() => {
    // Auto-populate from article content on first load
    const parts: string[] = []
    if (article?.excerpt) parts.push(article.excerpt.slice(0, 120))
    if (article?.keyPoints?.length) parts.push(article.keyPoints.slice(0, 2).join(', '))
    if (article?.aiSummaryA) parts.push(article.aiSummaryA.slice(0, 80))
    return parts.join('. ')
  })
  const [previewPlatform, setPreviewPlatform] = useState<PreviewPlatform | null>(null)
  const [categoryList, setCategoryList] = useState<Category[]>([])
  const [autosaveReady, setAutosaveReady] = useState(false)
  const [autosaveAvailable, setAutosaveAvailable] = useState(false)
  const [autosaveMsg, setAutosaveMsg] = useState('')
  const lastAutosaveSnapshot = useRef('')

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setCategoryList(d)
    })
    fetch('/api/config').then(r => r.json()).then(d => {
      if (d.googleClientId) setGoogleClientId(d.googleClientId)
    }).catch(() => {})
  }, [])

  const [form, setForm] = useState({
    title:           article?.title ?? '',
    slug:            article?.slug ?? '',
    excerpt:         article?.excerpt ?? '',
    content:         article?.content ?? '',
    coverImage:      article?.coverImage ?? '',
    category:        article?.category ?? '',
    tags:            article?.tags?.join(', ') ?? '',
    status:          article?.status ?? 'draft',
    featured:        article?.featured ?? false,
    readTime:        article?.readTime ?? 5,
    // GEO
    aiSummaryQ:      article?.aiSummaryQ ?? '',
    aiSummaryA:      article?.aiSummaryA ?? '',
    keyPoints:       article?.keyPoints?.join('\n') ?? '',
    // LINE
    lineBroadcastMsg: article?.lineBroadcastMsg ?? '',
    // Schedule
    publishScheduledAt: article?.publishScheduledAt
      ? new Date(article.publishScheduledAt).toISOString().slice(0, 16)
      : '',
    // Social Media
    fbCaption:  article?.fbCaption  ?? '',
    fbHashtags: article?.fbHashtags ?? '',
    ttCaption:    article?.ttCaption    ?? '',
    ttHashtags:   article?.ttHashtags   ?? '',
    ttVideoUrl:   article?.ttVideoUrl   ?? '',
    ttVdoPrompt:  article?.ttVdoPrompt  ?? '',
    igCaption:      article?.igCaption      ?? '',
    igHashtags:     article?.igHashtags     ?? '',
    igVideoUrl:     article?.igVideoUrl     ?? '',
    igImagePrompt:  article?.igImagePrompt  ?? '',
    igImage:        article?.igImage        ?? '',
  })

  const [faq, setFaq] = useState<FAQ[]>(
    (article?.faqJson as FAQ[] | null) ?? []
  )
  const autosaveKey = article?.id ? `article-autosave:${article.id}` : 'article-autosave:new'

  useEffect(() => {
    if (autosaveReady) return
    lastAutosaveSnapshot.current = JSON.stringify({ form, faq })
    const saved = window.localStorage.getItem(autosaveKey)
    if (saved) {
      setAutosaveAvailable(true)
      try {
        const parsed = JSON.parse(saved) as { savedAt?: string }
        if (parsed.savedAt) setAutosaveMsg(`มี autosave จาก ${new Date(parsed.savedAt).toLocaleString('th-TH')}`)
      } catch {
        setAutosaveMsg('มี autosave ที่ยังไม่ได้กู้คืน')
      }
    }
    setAutosaveReady(true)
  }, [autosaveReady, autosaveKey, form, faq])

  useEffect(() => {
    if (!autosaveReady) return
    const snapshot = JSON.stringify({ form, faq })
    if (snapshot === lastAutosaveSnapshot.current) return
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(autosaveKey, JSON.stringify({ form, faq, savedAt: new Date().toISOString() }))
      lastAutosaveSnapshot.current = snapshot
      setAutosaveAvailable(true)
      setAutosaveMsg(`Autosaved ${new Date().toLocaleTimeString('th-TH')}`)
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [autosaveReady, autosaveKey, form, faq])

  const restoreAutosave = () => {
    const saved = window.localStorage.getItem(autosaveKey)
    if (!saved) return
    try {
      const parsed = JSON.parse(saved) as { form?: typeof form; faq?: FAQ[] }
      if (parsed.form) setForm(parsed.form)
      if (Array.isArray(parsed.faq)) setFaq(parsed.faq)
      setAutosaveMsg('กู้คืน autosave แล้ว')
    } catch {
      setAutosaveMsg('กู้คืน autosave ไม่สำเร็จ')
    }
  }

  // Auto-generate slug from title (new mode only)
  useEffect(() => {
    if (mode === 'new' && form.title) {
      const slug = form.title
        .toLowerCase()
        .replace(/[^\u0E00-\u0E7Fa-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
      setForm(f => ({ ...f, slug }))
    }
  }, [form.title, mode])

  // Live GEO score preview
  useEffect(() => {
    let score = 0
    if (form.aiSummaryQ && form.aiSummaryA)         score += 15
    if (form.keyPoints.trim().split('\n').filter(Boolean).length >= 3) score += 10
    if (faq.length >= 2)                            score += 15
    const questionHeadings = (form.content.match(/<h[123][^>]*>[^<]*\?[^<]*<\/h[123]>/gi)?.length ?? 0)
      + (form.content.match(/##\s+.+\?/g)?.length ?? 0)
    if (questionHeadings >= 2)                                 score += 10
    if ((form.content.match(/\d+[%,]/g)?.length ?? 0) >= 2)   score += 5
    if (form.excerpt.length >= 120)                            score += 10
    if (form.tags.split(',').filter(Boolean).length >= 3)      score += 10
    const textLength = form.content.replace(/<[^>]+>/g, '').length
    if (textLength >= 1500)                                    score += 5
    // Schema always generated
    score += 20
    setGeoScore(Math.min(score, 100))
  }, [form, faq])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }))

  const addFaq = () => setFaq(f => [...f, { q: '', a: '' }])
  const updateFaq = (i: number, k: 'q' | 'a', v: string) =>
    setFaq(f => f.map((item, idx) => idx === i ? { ...item, [k]: v } : item))
  const removeFaq = (i: number) => setFaq(f => f.filter((_, idx) => idx !== i))

  // Auto-generate LINE broadcast from title + excerpt
  const autoLineBroadcast = () => {
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thinkbizlab.com'
    const slug = form.slug || 'article'
    const msg = `📊 ${form.title}\n\n${form.excerpt ? form.excerpt.slice(0, 100) + '...' : ''}\n\nอ่านเพิ่มเติม → ${base}/articles/${slug}`
    setForm(f => ({ ...f, lineBroadcastMsg: msg }))
  }

  // Auto-generate social captions
  const autoSocial = (platform: 'fb' | 'tt' | 'ig') => {
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thinkbizlab.com'
    const url = `${base}/articles/${form.slug || 'article'}`
    const pts = form.keyPoints.split('\n').filter(Boolean).slice(0, 5)
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)

    if (platform === 'fb') {
      const caption = [
        `📊 ${form.title}`,
        '',
        form.excerpt || '',
        '',
        pts.length ? pts.map(p => `▸ ${p}`).join('\n') : '',
        '',
        `อ่านบทความเต็ม → ${url}`,
      ].filter(Boolean).join('\n')
      const hashtags = ['#ThinkBizLab', '#ธุรกิจ', '#BusinessInsight',
        ...(form.category ? [`#${form.category.replace(/\s/g,'')}`] : []),
        ...tags.slice(0,5).map(t => `#${t.replace(/\s/g,'')}`),
      ].join(' ')
      setForm(f => ({ ...f, fbCaption: caption, fbHashtags: hashtags }))
    }

    if (platform === 'tt') {
      const hook = form.excerpt ? form.excerpt.slice(0, 80) : form.title
      const caption = [
        `${form.title} 🔥`,
        '',
        hook,
        '',
        pts.slice(0,3).map((p,i) => `${['1️⃣','2️⃣','3️⃣'][i]} ${p}`).join('\n'),
        '',
        'Link in bio 🔗',
      ].filter(Boolean).join('\n')
      const hashtags = ['#ThinkBizLab', '#ธุรกิจ', '#SME', '#BusinessTips', '#เรียนรู้',
        ...(form.category ? [`#${form.category.replace(/\s/g,'')}`] : []),
        ...tags.slice(0,3).map(t => `#${t.replace(/\s/g,'')}`),
      ].join(' ')
      setForm(f => ({ ...f, ttCaption: caption, ttHashtags: hashtags }))
    }

    if (platform === 'ig') {
      const caption = [
        `✨ ${form.title}`,
        '',
        form.excerpt || '',
        '',
        pts.length ? pts.map(p => `• ${p}`).join('\n') : '',
        '',
        '.',
        '.',
        '.',
        `🔗 อ่านบทความเต็ม → Link in bio`,
      ].filter(Boolean).join('\n')
      const hashtags = [
        '#ThinkBizLab','#ธุรกิจ','#SME','#BusinessInsight','#นักธุรกิจ',
        '#เจ้าของธุรกิจ','#Startup','#การลงทุน','#ความรู้ธุรกิจ','#ThaiBusinessDev',
        ...(form.category ? [`#${form.category.replace(/\s/g,'')}`] : []),
        ...tags.slice(0,8).map(t => `#${t.replace(/\s/g,'')}`),
      ].join(' ')
      setForm(f => ({ ...f, igCaption: caption, igHashtags: hashtags }))
    }
  }

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text)

  const sendLineBroadcast = async (mode: 'test' | 'all') => {
    if (!form.lineBroadcastMsg.trim()) { setLineMsg('กรอกข้อความก่อนส่ง'); return }
    if (mode === 'test') setLineTestLoading(true)
    else setLineBroadcastLoading(true)
    setLineMsg('')

    // Always append article link if not already in the message
    const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thinkbizlab.com').trim()
    const slug = (form.slug || article?.slug || '').trim()
    const articleUrl = slug ? `${base}/articles/${slug}` : null
    let message = form.lineBroadcastMsg
    // Check broadly — avoid duplicate if message already has the articles URL
    if (articleUrl && !message.includes(`/articles/`)) {
      message = `${message}\n\n📖 อ่านเพิ่มเติม → ${articleUrl}`
    }

    try {
      const res = await fetch('/api/line/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: article?.id, message, mode }),
      })
      const data = await res.json()
      if (data.ok) {
        setLineMsg(mode === 'test' ? '✓ ส่ง Test ให้ Admin แล้ว' : '✓ Broadcast ถึงทุกคนแล้ว')
      } else {
        setLineMsg(`เกิดข้อผิดพลาด: ${data.error}`)
      }
    } catch (e) {
      setLineMsg(`เกิดข้อผิดพลาด: ${String(e)}`)
    } finally {
      setLineTestLoading(false)
      setLineBroadcastLoading(false)
      setShowBroadcastConfirm(false)
    }
  }

  const sendFacebookPost = async (mode: 'test' | 'publish') => {
    if (!article?.id) { setFbMsg('บันทึกบทความก่อนโพสต์ Facebook'); return }
    if (!form.fbCaption.trim()) { setFbMsg('กรอก Facebook Caption ก่อนโพสต์'); return }
    setFbPostLoading(true)
    setFbMsg('')
    try {
      const res = await fetch('/api/facebook/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: article.id, mode }),
      })
      const data = await res.json()
      if (data.ok) {
        if (mode === 'test') {
          const pageName = (data as { pageName?: string }).pageName
          setFbMsg(`✓ Token ใช้งานได้ — Page: ${pageName ?? 'OK'}`)
        } else {
          setFbMsg('✓ โพสต์ Facebook สำเร็จ!')
        }
      } else {
        setFbMsg(`เกิดข้อผิดพลาด: ${data.error}`)
      }
    } catch (e) {
      setFbMsg(`เกิดข้อผิดพลาด: ${String(e)}`)
    } finally {
      setFbPostLoading(false)
      setShowFbConfirm(false)
    }
  }

  const sendInstagramPost = async (mode: 'test' | 'photo' | 'reel') => {
    if (!article?.id) { setIgMsg('บันทึกบทความก่อนโพสต์ Instagram'); return }
    setIgPostLoading(true)
    setIgMsg('')
    try {
      const res = await fetch('/api/instagram/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: article.id, mode }),
      })
      const data = await res.json()
      if (data.ok) {
        if (mode === 'test') setIgMsg(`✓ IG credentials ใช้งานได้ — @${data.username ?? 'OK'}`)
        else if (mode === 'reel') setIgMsg('✓ โพสต์ Reel สำเร็จ!')
        else setIgMsg('✓ โพสต์ Instagram สำเร็จ!')
      } else {
        setIgMsg(`เกิดข้อผิดพลาด: ${data.error}`)
      }
    } catch (e) {
      setIgMsg(`เกิดข้อผิดพลาด: ${String(e)}`)
    } finally {
      setIgPostLoading(false)
      setShowIgConfirm(null)
    }
  }

  const sendTikTokPost = async () => {
    if (!article?.id) { setTtPostMsg('บันทึกบทความก่อนโพสต์'); return }
    setTtPostLoading(true); setTtPostMsg('')
    try {
      const res = await fetch('/api/tiktok/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: article.id, mode: 'publish' }),
      })
      const data = await res.json()
      if (data.ok) setTtPostMsg('✓ โพสต์ TikTok สำเร็จ!')
      else setTtPostMsg(`เกิดข้อผิดพลาด: ${data.error}`)
    } catch (e) { setTtPostMsg(`เกิดข้อผิดพลาด: ${String(e)}`) }
    finally { setTtPostLoading(false); setShowTtConfirm(false) }
  }

  const sendIgReel = async () => {
    if (!article?.id) { setIgReelMsg('บันทึกบทความก่อนโพสต์'); return }
    setIgReelLoading(true); setIgReelMsg('')
    try {
      const res = await fetch('/api/instagram/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: article.id, mode: 'reel' }),
      })
      const data = await res.json()
      if (data.ok) setIgReelMsg('✓ โพสต์ IG Reel สำเร็จ!')
      else setIgReelMsg(`เกิดข้อผิดพลาด: ${data.error}`)
    } catch (e) { setIgReelMsg(`เกิดข้อผิดพลาด: ${String(e)}`) }
    finally { setIgReelLoading(false); setShowIgReelConfirm(false) }
  }

  const sendFbReel = async () => {
    if (!article?.id) { setFbReelMsg('บันทึกบทความก่อนโพสต์'); return }
    if (!form.ttVideoUrl.trim()) { setFbReelMsg('ต้องมี Video URL ก่อนโพสต์ Facebook Reel'); return }
    setFbReelLoading(true)
    setFbReelMsg('')
    try {
      const res = await fetch('/api/facebook/reel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: article.id }),
      })
      const data = await res.json()
      if (data.ok) setFbReelMsg('✓ โพสต์ Facebook Reel สำเร็จ!')
      else setFbReelMsg(`เกิดข้อผิดพลาด: ${data.error}`)
    } catch (e) {
      setFbReelMsg(`เกิดข้อผิดพลาด: ${String(e)}`)
    } finally {
      setFbReelLoading(false)
      setShowFbReelConfirm(false)
    }
  }

  const generateIgImage = async () => {
    setIgImageLoading(true)
    setIgMsg('')
    try {
      const params = new URLSearchParams({
        title: form.title,
        category: form.category,
        excerpt: form.excerpt,
        keyPoints: form.keyPoints,
        prompt: form.igImagePrompt,
        format: 'ig',
      })
      const res = await fetch(`/api/generate-cover?${params}`)
      if (!res.ok) {
        const err = await res.json()
        setIgMsg(`เกิดข้อผิดพลาด: ${err.error}`)
        return
      }
      const blob = await res.blob()
      const uploadParams = new URLSearchParams({ filename: `ig-${Date.now()}.png`, kind: 'generated-ig' })
      const uploadRes = await fetch(`/api/upload?${uploadParams}`, {
        method: 'POST',
        body: blob,
        headers: { 'content-type': 'image/png' },
      })
      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({ error: `HTTP ${uploadRes.status}` }))
        setIgMsg(`อัปโหลดรูป IG ไม่สำเร็จ: ${errData.error}`)
        return
      }
      const { url } = await uploadRes.json()
      setForm(f => ({ ...f, igImage: url }))
      if (article?.id) {
        await fetch(`/api/articles/${article.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ igImage: url }),
        })
      }
    } catch (e) {
      setIgMsg(`เกิดข้อผิดพลาด: ${String(e)}`)
    } finally {
      setIgImageLoading(false)
    }
  }

  const generateAIVideo = async () => {
    if (!aiVideoScript.trim()) { setAiVideoMsg('กรุณาใส่ script ก่อนสร้างวิดีโอ'); return }
    setAiVideoLoading(true)
    setAiVideoUrl('')
    setAiVideoMsg('🎬 กำลังส่งคำขอไปยัง HeyGen...')
    try {
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: aiVideoScript }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setAiVideoMsg(`เกิดข้อผิดพลาด: ${data.error}`); setAiVideoLoading(false); return }

      const videoId = data.videoId as string
      setAiVideoMsg('⏳ กำลังสร้างวิดีโอ HeyGen Avatar (~2-5 นาที)...')

      const poll = async () => {
        try {
          const sr = await fetch(`/api/generate-video?videoId=${videoId}`)
          const sd = await sr.json()
          if (sd.status === 'COMPLETED') {
            setAiVideoUrl(sd.videoUrl ?? '')
            setAiVideoMsg(`✓ สร้างวิดีโอสำเร็จ${sd.duration ? ` (${Math.round(sd.duration)} วิ)` : ''} — กด "บันทึกไป Google Drive"`)
            setAiVideoLoading(false)
          } else if (sd.status === 'FAILED') {
            setAiVideoMsg(`เกิดข้อผิดพลาด: ${sd.error ?? 'Video generation failed'}`)
            setAiVideoLoading(false)
          } else {
            setTimeout(poll, 8000)
          }
        } catch {
          setAiVideoMsg('เกิดข้อผิดพลาดในการตรวจสอบสถานะ')
          setAiVideoLoading(false)
        }
      }
      setTimeout(poll, 8000)
    } catch (e) {
      setAiVideoMsg(`เกิดข้อผิดพลาด: ${String(e)}`)
      setAiVideoLoading(false)
    }
  }

  const uploadVideoToDrive = async () => {
    if (!aiVideoUrl) return
    if (!googleClientId) { setAiVideoMsg('Google Client ID ไม่พบ — ตรวจสอบ GOOGLE_CLIENT_ID ใน env'); return }
    setAiVideoDriveLoading(true)
    setAiVideoMsg('🔑 กำลังขอสิทธิ์ Google Drive...')
    try {
      if (!window.google?.accounts?.oauth2) {
        await new Promise<void>((resolve, reject) => {
          if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) { resolve(); return }
          const s = document.createElement('script')
          s.src = 'https://accounts.google.com/gsi/client'
          s.async = true; s.onload = () => resolve(); s.onerror = reject
          document.head.appendChild(s)
        })
      }
      const token = await new Promise<string>((resolve, reject) => {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'https://www.googleapis.com/auth/drive.file',
          callback: (resp: { access_token?: string; error?: string }) => {
            if (resp.access_token) resolve(resp.access_token)
            else reject(new Error(resp.error ?? 'OAuth failed'))
          },
        })
        client.requestAccessToken({ prompt: '' })
      })

      setAiVideoMsg('⬇️ กำลังดาวน์โหลดวิดีโอ...')
      const blob = await fetch(aiVideoUrl).then(r => r.blob())

      setAiVideoMsg('⬆️ กำลังอัปโหลดไป Google Drive...')
      const fileName = `ThinkBiz_HeyGen_${Date.now()}.mp4`
      const formData = new FormData()
      formData.append('metadata', new Blob([JSON.stringify({ name: fileName, mimeType: 'video/mp4' })], { type: 'application/json' }))
      formData.append('file', blob, fileName)

      const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData,
      })
      if (!uploadRes.ok) throw new Error(`Drive upload failed: ${uploadRes.status}`)
      const { id: fileId } = await uploadRes.json() as { id: string }

      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'reader', type: 'anyone' }),
      })

      const driveUrl = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`
      setForm(f => ({ ...f, ttVideoUrl: driveUrl, igVideoUrl: driveUrl }))
      setAiVideoMsg('✓ บันทึกลง Google Drive — พร้อมโพสต์ TikTok, IG Reel, Facebook Reel!')
    } catch (e) {
      setAiVideoMsg(`เกิดข้อผิดพลาด: ${String(e)}`)
    } finally {
      setAiVideoDriveLoading(false)
    }
  }

  const generateCover = async () => {
    if (!form.title.trim()) return
    setGeneratingCover(true)
    try {
      const params = new URLSearchParams({
        title: form.title,
        category: form.category,
        excerpt: form.excerpt.slice(0, 150),
        keyPoints: form.keyPoints.split('\n').filter(Boolean).slice(0, 3).join(', '),
        prompt: coverPrompt,
      })
      const res = await fetch(`/api/generate-cover?${params}`)
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(errData.error ?? `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const uploadParams = new URLSearchParams({ filename: `cover-${Date.now()}.png`, kind: 'generated-cover' })
      const uploadRes = await fetch(`/api/upload?${uploadParams}`, {
        method: 'POST',
        body: blob,
        headers: { 'content-type': 'image/png' },
      })
      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({ error: `HTTP ${uploadRes.status}` }))
        throw new Error(errData.error ?? 'Upload failed')
      }
      const { url } = await uploadRes.json()
      setForm(f => ({ ...f, coverImage: url }))
      // Auto-save coverImage to DB immediately (edit mode only)
      if (mode === 'edit' && article?.id) {
        await fetch(`/api/articles/${article.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coverImage: url }),
        })
      }
    } catch (e) {
      setMsg(`สร้างภาพปกไม่สำเร็จ: ${String(e)}`)
    } finally {
      setGeneratingCover(false)
    }
  }

  const onSelectGenerated = (opt: GeneratedOption) => {
    setForm(f => ({
      ...f,
      title:           opt.title,
      excerpt:         opt.excerpt,
      content:         opt.content,
      category:        opt.category,
      tags:            opt.tags.join(', '),
      readTime:        opt.readTime,
      aiSummaryQ:      opt.aiSummaryQ,
      aiSummaryA:      opt.aiSummaryA,
      keyPoints:       opt.keyPoints.join('\n'),
      lineBroadcastMsg: opt.lineBroadcastMsg,
      fbCaption:       opt.fbCaption,
      fbHashtags:      opt.fbHashtags,
      ttCaption:       opt.ttCaption,
      ttHashtags:      opt.ttHashtags,
      ttVdoPrompt:     opt.ttVdoPrompt,
      igCaption:       opt.igCaption,
      igHashtags:      opt.igHashtags,
      igImagePrompt:   opt.igImagePrompt,
    }))
    if (opt.coverImagePrompt) setCoverPrompt(opt.coverImagePrompt)
    setFaq(opt.faq)
  }

  const save = async (statusOverride?: string) => {
    if (!form.title.trim()) { setMsg('กรุณากรอกชื่อบทความ'); return }
    setSaving(true); setMsg('')
    try {
      const effectiveStatus = statusOverride ?? form.status
      const payload = {
        ...form,
        status: effectiveStatus,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        keyPoints: form.keyPoints.split('\n').map(t => t.trim()).filter(Boolean),
        faqJson: faq,
        geoScore,
        readTime: Number(form.readTime),
        featured: Boolean(form.featured),
        schemaJson: { auto: true },
        publishScheduledAt: form.publishScheduledAt ? new Date(form.publishScheduledAt).toISOString() : null,
      }
      const url = mode === 'edit' ? `/api/articles/${article!.id}` : '/api/articles'
      const method = mode === 'edit' ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      if (statusOverride) setForm(f => ({ ...f, status: statusOverride }))
      lastAutosaveSnapshot.current = JSON.stringify({ form: statusOverride ? { ...form, status: statusOverride } : form, faq })
      window.localStorage.removeItem(autosaveKey)
      setAutosaveAvailable(false)
      setMsg(`✓ บันทึกสำเร็จ${statusOverride === 'draft' ? ' (Draft)' : statusOverride === 'review' ? ' (Review)' : statusOverride === 'approved' ? ' (Approved)' : statusOverride === 'published' ? ' (เผยแพร่แล้ว)' : ''}`)
      if (mode === 'new') window.location.href = '/admin/articles'
    } catch (e) {
      setMsg(`เกิดข้อผิดพลาด: ${String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  const deleteArticle = async () => {
    if (!confirm('ต้องการลบบทความนี้?')) return
    setDeleting(true)
    await fetch(`/api/articles/${article!.id}`, { method: 'DELETE' })
    window.location.href = '/admin/articles'
  }

  const openDraftPreview = async () => {
    if (!article?.id) return
    setPreviewLinkLoading(true)
    setMsg('')
    try {
      const res = await fetch(`/api/articles/${article.id}/preview-token`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Preview failed')
      window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      setMsg(`สร้างลิงก์ Preview ไม่สำเร็จ: ${String(e)}`)
    } finally {
      setPreviewLinkLoading(false)
    }
  }

  const geoColor = geoScore >= 80 ? '#10B981' : geoScore >= 60 ? '#F59E0B' : geoScore >= 40 ? '#F97316' : '#EF4444'
  const geoLabel = geoScore >= 80 ? 'Excellent' : geoScore >= 60 ? 'Good' : geoScore >= 40 ? 'Fair' : 'Poor'

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white mb-1">
            {mode === 'new' ? 'เพิ่มบทความใหม่' : 'แก้ไขบทความ'}
          </h1>
          {mode === 'edit' && (
            <p className="font-mono text-xs" style={{ color: 'rgba(155,142,196,.5)' }}>/{article?.slug}</p>
          )}
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {/* AI Generate button */}
          <button
            onClick={() => setShowModal(true)}
            disabled={!form.title.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all"
            style={{
              background: form.title.trim() ? 'linear-gradient(135deg, #7C3AED, #A855F7)' : 'rgba(124,58,237,.15)',
              color: form.title.trim() ? '#fff' : 'rgba(167,139,250,.4)',
              border: '1px solid rgba(124,58,237,.3)',
              cursor: form.title.trim() ? 'pointer' : 'not-allowed',
            }}
            title={form.title.trim() ? 'สร้างเนื้อหาด้วย Claude AI' : 'กรอกชื่อบทความก่อน'}
          >
            ✨ สร้างด้วย AI
          </button>

          {/* GEO Score badge */}
          <div className="flex flex-col items-end gap-1">
            <div className="font-mono text-xs" style={{ color: 'rgba(155,142,196,.6)' }}>GEO Score</div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${geoScore}%`, background: geoColor }} />
              </div>
              <span className="font-mono text-sm font-bold" style={{ color: geoColor }}>{geoScore} — {geoLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {mode === 'edit' && article?.id && <RevisionHistoryPanel articleId={article.id} />}
        <SeoGeoChecklist data={{ ...form, faq, geoScore }} />

        {/* Schedule — top of form */}
        <div className="rounded-xl border p-4" style={{ borderColor: 'rgba(124,58,237,.22)', background: 'rgba(30,16,48,.4)' }}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest shrink-0">📅 ตั้งเวลาเผยแพร่</div>
            <input
              type="datetime-local"
              value={form.publishScheduledAt}
              onChange={set('publishScheduledAt')}
              className={`${inputCls} flex-1 min-w-[200px]`}
              style={{ colorScheme: 'dark' }}
            />
            {form.publishScheduledAt && (
              <span className="font-mono text-xs shrink-0" style={{ color: '#A78BFA' }}>
                {new Date(form.publishScheduledAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            )}
            {form.publishScheduledAt && (
              <button onClick={() => setForm(f => ({ ...f, publishScheduledAt: '' }))}
                className="font-mono text-[10px] text-red-400 hover:text-red-300 shrink-0">✕ ล้าง</button>
            )}
          </div>

          {/* Status + schedule logic hint */}
          <div className="mt-3 pt-3 border-t" style={{ borderColor: 'rgba(124,58,237,.12)' }}>
            <div className="flex flex-wrap gap-2 items-center">
              {[
                {
                  condition: form.status === 'approved' && !!form.publishScheduledAt,
                  color: '#A78BFA',
                  bg: 'rgba(124,58,237,.1)',
                  border: 'rgba(124,58,237,.25)',
                  icon: '⏰',
                  text: 'Approved + Scheduled — Cron จะเผยแพร่อัตโนมัติตามเวลาที่กำหนด',
                },
                {
                  condition: form.status === 'draft' && !form.publishScheduledAt,
                  color: 'rgba(155,142,196,.6)',
                  bg: 'rgba(124,58,237,.06)',
                  border: 'rgba(124,58,237,.15)',
                  icon: '📝',
                  text: 'Draft — ยังไม่เผยแพร่',
                },
                {
                  condition: form.status === 'draft' && !!form.publishScheduledAt,
                  color: 'rgba(155,142,196,.6)',
                  bg: 'rgba(124,58,237,.06)',
                  border: 'rgba(124,58,237,.15)',
                  icon: '📝',
                  text: 'Draft + Scheduled — ตั้งเวลาไว้แล้ว แต่ต้อง Approved ก่อน Cron ถึงจะเผยแพร่',
                },
                {
                  condition: form.status === 'published',
                  color: '#10B981',
                  bg: 'rgba(16,185,129,.08)',
                  border: 'rgba(16,185,129,.2)',
                  icon: '✓',
                  text: 'Published — เผยแพร่แล้ว (publish time จะถูกละเว้น)',
                },
                {
                  condition: form.status === 'review',
                  color: '#F59E0B',
                  bg: 'rgba(245,158,11,.08)',
                  border: 'rgba(245,158,11,.2)',
                  icon: '👀',
                  text: 'Review — รอตรวจสอบ (Cron จะไม่เผยแพร่จนกว่าจะ Approved)',
                },
                {
                  condition: form.status === 'approved' && !form.publishScheduledAt,
                  color: '#38BDF8',
                  bg: 'rgba(56,189,248,.08)',
                  border: 'rgba(56,189,248,.2)',
                  icon: '✓',
                  text: 'Approved — อนุมัติแล้ว พร้อมเผยแพร่หรือตั้งเวลา',
                },
              ].filter(s => s.condition).map(s => (
                <div key={s.text} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[11px]"
                  style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                  {s.icon} {s.text}
                </div>
              ))}
            </div>
          </div>
          {mode === 'edit' && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'rgba(124,58,237,.12)' }}>
              {[
                { label: 'LINE', sent: article?.lineBroadcastSent, at: article?.lineBroadcastAt },
                { label: 'Facebook', sent: article?.fbSent, at: article?.fbSentAt },
                { label: 'Instagram', sent: article?.igSent, at: article?.igSentAt },
                { label: 'TikTok', sent: article?.ttSent, at: article?.ttSentAt },
              ].map(p => (
                <div key={p.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[10px]" style={{
                  background: p.sent ? 'rgba(16,185,129,.1)' : 'rgba(124,58,237,.08)',
                  color: p.sent ? '#10B981' : 'rgba(155,142,196,.5)',
                  border: `1px solid ${p.sent ? 'rgba(16,185,129,.25)' : 'rgba(124,58,237,.15)'}`,
                }}>
                  {p.sent ? '✓' : '○'} {p.label}
                  {p.sent && p.at && <span style={{ color: 'rgba(155,142,196,.4)' }}> · {new Date(p.at).toLocaleDateString('th-TH')}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Basic info */}
        <Section title="ข้อมูลพื้นฐาน">
          <Field label="ชื่อบทความ *">
            <input value={form.title} onChange={set('title')} placeholder="ชื่อบทความที่ชัดเจน ตอบคำถาม..." className={inputCls} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Slug (URL)">
              <input value={form.slug} onChange={set('slug')} placeholder="url-slug-here" className={inputCls} />
            </Field>
            <Field label="หมวดหมู่">
              <select value={form.category} onChange={set('category')} className={inputCls}>
                <option value="">เลือกหมวดหมู่...</option>
                {categoryList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Excerpt / Meta Description (แนะนำ 120-160 ตัวอักษร)">
            <textarea value={form.excerpt} onChange={set('excerpt')} rows={2}
              placeholder="สรุปบทความ — AI search engines ใช้ข้อความนี้ในการตอบคำถาม..."
              className={inputCls} />
            <div className="font-mono text-[10px] mt-1" style={{ color: form.excerpt.length >= 120 ? '#10B981' : '#9B8EC4' }}>
              {form.excerpt.length} ตัวอักษร {form.excerpt.length < 120 ? `(ต้องการอีก ${120 - form.excerpt.length})` : '✓'}
            </div>
          </Field>
          <Field label="Cover Image">
            <CoverImageUpload
              value={form.coverImage}
              onChange={url => {
                setForm(f => ({ ...f, coverImage: url }))
                if (mode === 'edit' && article?.id) {
                  fetch(`/api/articles/${article.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ coverImage: url }),
                  })
                }
              }}
            />
            <div className="mt-3 space-y-2">
              <label className="block font-mono text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#A78BFA' }}>
                คำอธิบายรูปภาพที่ต้องการสร้าง
              </label>
              <textarea
                value={coverPrompt}
                onChange={e => setCoverPrompt(e.target.value)}
                placeholder="เช่น Thai business woman at desk, warm lighting, Bangkok skyline background..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg border font-mono text-xs resize-none outline-none"
                style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)', color: '#C4B5FD' }}
              />
              <button
                type="button"
                onClick={generateCover}
                disabled={generatingCover || !form.title.trim()}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs border transition-all hover:bg-purple/10 disabled:opacity-40"
                style={{ borderColor: 'rgba(124,58,237,.3)', color: '#A78BFA' }}
                title={form.title.trim() ? 'สร้างภาพปกขนาด 1200×630 อัตโนมัติ' : 'กรอกชื่อบทความก่อน'}
              >
                {generatingCover
                  ? <><span className="w-3 h-3 rounded-full border border-purple/30 border-t-purple animate-spin" />กำลังสร้างภาพปก...</>
                  : <>🎨 สร้างภาพปก AI (1200×630)</>}
              </button>
            </div>
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Tags (คั่นด้วย ,)">
              <input value={form.tags} onChange={set('tags')} placeholder="SME, กลยุทธ์, Finance" className={inputCls} />
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={set('status')} className={inputCls}>
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="เวลาอ่าน (นาที)">
              <input type="number" min={1} value={form.readTime} onChange={set('readTime')} className={inputCls} />
            </Field>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))}
              className="w-4 h-4 rounded" style={{ accentColor: '#7C3AED' }} />
            <span className="text-sm" style={{ color: '#9B8EC4' }}>แสดงในส่วน Featured บนหน้าหลัก</span>
          </label>
        </Section>

        {/* Content */}
        <Section title="เนื้อหาบทความ">
          <Field label="เนื้อหา" hint="ใช้ Heading 2 สำหรับหัวข้อที่เป็นคำถาม เช่น 'X คืออะไร?' เพื่อ GEO score">
            <RichEditor
              value={form.content}
              onChange={html => setForm(f => ({ ...f, content: html }))}
            />
          </Field>
        </Section>

        {/* GEO Fields */}
        <Section title="GEO Optimization" accent>
          <div className="font-mono text-xs mb-4" style={{ color: '#9B8EC4' }}>
            ข้อมูลเหล่านี้ถูกอ่านโดย AI search engines (ChatGPT, Perplexity, Gemini, Claude) ก่อนเนื้อหาอื่น
          </div>

          <div className="rounded-lg border p-4 mb-4" style={{ borderColor: 'rgba(124,58,237,.25)', background: 'rgba(124,58,237,.06)' }}>
            <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest mb-3">AI Summary Box</div>
            <Field label="คำถามหลักของบทความ" hint="เขียนเหมือน AI กำลังถามผู้ใช้ เช่น 'Blue Ocean Strategy คืออะไร?'">
              <input value={form.aiSummaryQ} onChange={set('aiSummaryQ')}
                placeholder="Blue Ocean Strategy คืออะไร และทำไมธุรกิจถึงต้องรู้?"
                className={inputCls} />
            </Field>
            <Field label="คำตอบสั้น (1-2 ประโยค)" hint="AI จะอ้างอิงประโยคนี้เมื่อตอบคำถาม">
              <textarea value={form.aiSummaryA} onChange={set('aiSummaryA')} rows={2}
                placeholder="Blue Ocean Strategy คือกลยุทธ์ที่สร้างตลาดใหม่โดยไม่แข่งขันในตลาดเดิม..."
                className={inputCls} />
            </Field>
            <Field label="Key Points (1 ข้อต่อบรรทัด)" hint="สรุป 3-5 ประเด็นสำคัญ — AI ดึง list ได้ง่าย">
              <textarea value={form.keyPoints} onChange={set('keyPoints')} rows={4}
                placeholder="ไม่แข่งกับคู่แข่งในตลาดเดิม&#10;สร้าง Value Innovation ใหม่&#10;ลดต้นทุนและเพิ่มคุณค่าพร้อมกัน"
                className={`${inputCls} font-mono text-sm`} />
            </Field>
          </div>

          <div className="rounded-lg border p-4" style={{ borderColor: 'rgba(124,58,237,.25)', background: 'rgba(124,58,237,.06)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest">FAQ Section</div>
              <button onClick={addFaq} className="font-mono text-xs text-accent hover:underline">+ เพิ่มคำถาม</button>
            </div>
            {faq.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: 'rgba(155,142,196,.5)' }}>ยังไม่มี FAQ — กด &quot;+ เพิ่มคำถาม&quot;</p>
            ) : (
              <div className="space-y-3">
                {faq.map((item, i) => (
                  <div key={i} className="rounded-lg p-3 border" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(15,13,26,.4)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[10px] text-purple">Q{i+1}</span>
                      <button onClick={() => removeFaq(i)} className="font-mono text-[10px] text-red-400 hover:text-red-300">ลบ</button>
                    </div>
                    <input value={item.q} onChange={e => updateFaq(i,'q',e.target.value)}
                      placeholder="คำถาม..." className={`${inputCls} mb-2 text-sm`} />
                    <textarea value={item.a} onChange={e => updateFaq(i,'a',e.target.value)}
                      rows={2} placeholder="คำตอบ..." className={`${inputCls} text-sm`} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* LINE Broadcast */}
        <Section title="LINE Broadcast">
          <div className="font-mono text-xs mb-3" style={{ color: '#9B8EC4' }}>
            ข้อความที่จะ broadcast ไปยัง Line OA เมื่อเผยแพร่บทความ
          </div>
          <Field label="ข้อความ LINE Broadcast">
            <textarea
              value={form.lineBroadcastMsg}
              onChange={set('lineBroadcastMsg')}
              rows={5}
              placeholder="📊 ชื่อบทความ&#10;&#10;สรุปสั้นๆ...&#10;&#10;อ่านเพิ่มเติม → https://thinkbizlab.com/articles/slug"
              className={`${inputCls} font-mono text-sm`}
            />
            <div className="flex items-center justify-between mt-1">
              <span className="font-mono text-[10px]" style={{ color: form.lineBroadcastMsg.length > 0 ? '#A78BFA' : 'rgba(155,142,196,.4)' }}>
                {form.lineBroadcastMsg.length} ตัวอักษร
              </span>
              <button
                onClick={autoLineBroadcast}
                className="font-mono text-[10px] text-accent hover:underline"
              >
                ✨ สร้างอัตโนมัติจากชื่อ + excerpt
              </button>
            </div>
          </Field>
          {/* Broadcast buttons */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => sendLineBroadcast('test')}
              disabled={lineTestLoading || lineBroadcastLoading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs border transition-all hover:bg-white/5 disabled:opacity-40"
              style={{ borderColor: 'rgba(16,185,129,.3)', color: '#10B981' }}
            >
              {lineTestLoading
                ? <><span className="w-3 h-3 rounded-full border border-green-400/30 border-t-green-400 animate-spin" />ส่งอยู่...</>
                : <>🧪 Test (ส่งให้ Admin)</>}
            </button>

            {!showBroadcastConfirm ? (
              <button
                type="button"
                onClick={() => setShowBroadcastConfirm(true)}
                disabled={lineTestLoading || lineBroadcastLoading}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs border transition-all hover:bg-white/5 disabled:opacity-40"
                style={{ borderColor: 'rgba(124,58,237,.3)', color: '#A78BFA' }}
              >
                📣 Broadcast ถึงทุกคน
              </button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border" style={{ borderColor: 'rgba(239,68,68,.3)', background: 'rgba(239,68,68,.06)' }}>
                <span className="font-mono text-xs" style={{ color: '#F87171' }}>ยืนยัน Broadcast ถึงทุกคน?</span>
                <button
                  type="button"
                  onClick={() => sendLineBroadcast('all')}
                  disabled={lineBroadcastLoading}
                  className="px-2 py-0.5 rounded font-mono text-xs font-bold transition-all"
                  style={{ background: '#EF4444', color: '#fff' }}
                >
                  {lineBroadcastLoading ? 'ส่งอยู่...' : 'ยืนยัน'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBroadcastConfirm(false)}
                  className="font-mono text-xs text-muted hover:text-white"
                >
                  ยกเลิก
                </button>
              </div>
            )}
          </div>

          {lineMsg && (
            <div className="mt-2 font-mono text-xs" style={{ color: lineMsg.startsWith('✓') ? '#10B981' : '#F87171' }}>
              {lineMsg}
            </div>
          )}

          {article?.lineBroadcastSent && (
            <div className="mt-2 flex items-center gap-2 font-mono text-xs" style={{ color: '#10B981' }}>
              <span>✓</span>
              <span>ส่ง LINE Broadcast แล้ว {article.lineBroadcastAt ? new Date(article.lineBroadcastAt).toLocaleString('th-TH') : ''}</span>
            </div>
          )}
        </Section>

        {/* Social Media */}
        <Section title="Social Media">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="font-mono text-xs" style={{ color: '#9B8EC4' }}>
              เตรียม caption สำหรับแต่ละ platform — กด ✨ เพื่อสร้างอัตโนมัติ แล้วแก้ไขก่อน post
            </div>
            {/* Quick preview buttons */}
            <div className="flex flex-wrap gap-1.5">
              {([
                { id: 'web' as PreviewPlatform,       icon: '🌐', label: 'Web' },
                { id: 'facebook' as PreviewPlatform,  icon: '🔵', label: 'FB' },
                { id: 'instagram' as PreviewPlatform, icon: '📸', label: 'IG' },
                { id: 'tiktok' as PreviewPlatform,    icon: '🎵', label: 'TT' },
                { id: 'ai' as PreviewPlatform,        icon: '🤖', label: 'AI' },
              ] as const).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreviewPlatform(p.id)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono text-[10px] border transition-all hover:bg-purple/10"
                  style={{ borderColor: 'rgba(124,58,237,.3)', color: '#A78BFA' }}
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Facebook */}
          <SocialBlock
            icon="🔵" platform="Facebook" limit={500} ideal={500}
            caption={form.fbCaption} hashtags={form.fbHashtags}
            onCaption={v => setForm(f => ({ ...f, fbCaption: v }))}
            onHashtags={v => setForm(f => ({ ...f, fbHashtags: v }))}
            onAuto={() => autoSocial('fb')}
            onCopy={() => copyToClipboard(`${form.fbCaption}\n\n${form.fbHashtags}`)}
            onPreview={() => setPreviewPlatform('facebook')}
          >
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => sendFacebookPost('test')}
                disabled={fbPostLoading || !form.fbCaption.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs border transition-all hover:bg-white/5 disabled:opacity-40"
                style={{ borderColor: 'rgba(124,58,237,.3)', color: '#A78BFA' }}
              >
                {fbPostLoading ? <span className="w-3 h-3 rounded-full border border-purple/30 border-t-purple animate-spin" /> : '🧪'}
                Verify Token
              </button>

              {!showFbConfirm ? (
                article?.fbSent ? (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] px-2 py-1 rounded" style={{ background: 'rgba(16,185,129,.15)', color: '#10B981', border: '1px solid rgba(16,185,129,.3)' }}>✓ โพสต์แล้ว</span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!article?.id) return
                        await fetch('/api/facebook/post', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ articleId: article.id, mode: 'reset' }) })
                        setFbMsg('รีเซ็ตแล้ว — กด Post Facebook เพื่อโพสต์ใหม่')
                        window.location.reload()
                      }}
                      className="font-mono text-[10px] px-2 py-1 rounded border hover:bg-white/5 transition-colors"
                      style={{ borderColor: 'rgba(155,142,196,.25)', color: 'rgba(155,142,196,.5)' }}
                    >
                      รีเซ็ต
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowFbConfirm(true)}
                    disabled={fbPostLoading || !form.fbCaption.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs transition-all hover:opacity-90 disabled:opacity-40"
                    style={{ background: 'rgba(59,130,246,.2)', color: '#60A5FA', border: '1px solid rgba(59,130,246,.3)' }}
                  >
                    🔵 โพสต์ Facebook
                  </button>
                )
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px]" style={{ color: '#F97316' }}>โพสต์ Public ยืนยัน?</span>
                  <button
                    type="button"
                    onClick={() => sendFacebookPost('publish')}
                    disabled={fbPostLoading}
                    className="px-3 py-1.5 rounded-lg font-mono text-xs transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'rgba(59,130,246,.3)', color: '#60A5FA', border: '1px solid rgba(59,130,246,.3)' }}
                  >
                    {fbPostLoading ? 'โพสต์...' : 'ยืนยัน'}
                  </button>
                  <button type="button" onClick={() => setShowFbConfirm(false)} className="font-mono text-xs text-purple hover:underline">ยกเลิก</button>
                </div>
              )}

              {fbMsg && (
                <span className="font-mono text-[10px]" style={{ color: fbMsg.startsWith('✓') ? '#10B981' : '#F87171' }}>{fbMsg}</span>
              )}
            </div>
          </SocialBlock>

          {/* TikTok */}
          <SocialBlock
            icon="🎵" platform="TikTok" limit={2200} ideal={150}
            caption={form.ttCaption} hashtags={form.ttHashtags}
            onCaption={v => setForm(f => ({ ...f, ttCaption: v }))}
            onHashtags={v => setForm(f => ({ ...f, ttHashtags: v }))}
            onAuto={() => autoSocial('tt')}
            onCopy={() => copyToClipboard(`${form.ttCaption}\n\n${form.ttHashtags}`)}
            onPreview={() => setPreviewPlatform('tiktok')}
          >
            <Field label="TikTok VDO Prompt" hint="อธิบาย scene by scene — รวมไม่เกิน 60 วินาที ใช้ส่ง API สร้าง VDO อัตโนมัติ">
              <textarea
                value={form.ttVdoPrompt}
                onChange={e => setForm(f => ({ ...f, ttVdoPrompt: e.target.value }))}
                placeholder={"Scene 1 (0-10 วิ): แสดงตัวเลขสถิติที่น่าตกใจ — text overlay ขาวบนพื้นม่วงเข้ม\nScene 2 (10-25 วิ): อธิบายปัญหาหลัก — motion graphic แสดง pain point\nScene 3 (25-45 วิ): นำเสนอวิธีแก้ 3 ข้อ — bullet point animation\nScene 4 (45-60 วิ): CTA — แชร์ให้เพื่อนเจ้าของธุรกิจ / คอมเมนต์ว่าคุณเจอปัญหานี้ไหม / กด Follow เพื่อไม่พลาดเคล็ดลับธุรกิจ"}
                rows={6}
                className="w-full px-3 py-2 rounded-lg font-mono text-xs resize-y"
                style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(124,58,237,.25)', color: '#E2D9F3' }}
              />
            </Field>

            {/* HeyGen AI Video */}
            <Field label="สร้าง VDO ด้วย HeyGen AI" hint="Avatar พูด script — ยิ่ง script ยาว วิดีโอยิ่งยาว (15-60+ วิ)">
              <textarea
                value={aiVideoScript}
                onChange={e => setAiVideoScript(e.target.value)}
                placeholder="พิมพ์ script ที่ต้องการให้ Avatar พูด เช่น: สวัสดีครับ วันนี้เราจะมาพูดถึงการทำธุรกิจกับเพื่อน..."
                rows={5}
                className="w-full px-3 py-2 rounded-lg font-mono text-xs resize-y"
                style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(124,58,237,.25)', color: '#E2D9F3' }}
              />
              <p className="mt-1 font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.5)' }}>
                ~150 คำ ≈ 60 วิ · ต้องตั้งค่า Avatar ID + Voice ID ใน Admin → Settings → HeyGen ก่อน
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={generateAIVideo}
                  disabled={aiVideoLoading || !aiVideoScript.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs transition-all hover:opacity-90 disabled:opacity-40"
                  style={{ background: 'rgba(124,58,237,.25)', color: '#C4B5FD', border: '1px solid rgba(124,58,237,.4)' }}
                >
                  {aiVideoLoading
                    ? <><span className="w-3 h-3 rounded-full border border-purple/30 border-t-purple animate-spin" /> กำลังสร้าง...</>
                    : <>🤖 สร้าง VDO ด้วย HeyGen</>}
                </button>
                {aiVideoUrl && !aiVideoLoading && (
                  <button
                    type="button"
                    onClick={uploadVideoToDrive}
                    disabled={aiVideoDriveLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs transition-all hover:opacity-90 disabled:opacity-40"
                    style={{ background: 'rgba(16,185,129,.15)', color: '#10B981', border: '1px solid rgba(16,185,129,.3)' }}
                  >
                    {aiVideoDriveLoading
                      ? <><span className="w-3 h-3 rounded-full border border-emerald-400/30 border-t-emerald-400 animate-spin" /> กำลังบันทึก...</>
                      : <>📁 บันทึกไป Google Drive</>}
                  </button>
                )}
              </div>
              {aiVideoMsg && (
                <p className="mt-1.5 font-mono text-[10px]" style={{ color: aiVideoMsg.startsWith('✓') ? '#10B981' : aiVideoMsg.startsWith('เกิดข้อผิดพลาด') ? '#F87171' : '#A78BFA' }}>
                  {aiVideoMsg}
                </p>
              )}
              {aiVideoUrl && (
                <video src={aiVideoUrl} controls className="mt-3 rounded-lg w-full" style={{ maxHeight: 320, border: '1px solid rgba(124,58,237,.2)' }} />
              )}
            </Field>

            <Field label="Video URL (Google Drive)" hint="ใช้สำหรับโพสต์ TikTok · IG Reel · Facebook Reel — บันทึกจาก HeyGen ด้านบน หรือเลือกไฟล์">
              <GoogleDrivePicker
                value={form.ttVideoUrl}
                onChange={(url) => setForm(f => ({ ...f, ttVideoUrl: url, igVideoUrl: url }))}
              />
            </Field>

            {/* Post to all 3 platforms */}
            <div className="space-y-2 mt-1">
              {/* TikTok */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] w-20 flex-shrink-0" style={{ color: 'rgba(155,142,196,.5)' }}>🎵 TikTok</span>
                <button type="button" onClick={async () => { setTtTestLoading(true); setTtTestMsg(''); try { const r = await fetch('/api/tiktok/test'); const d = await r.json(); setTtTestMsg(d.ok ? `✓ @${d.displayName}` : `${d.error}`) } catch { setTtTestMsg('ไม่สามารถเชื่อมต่อได้') } finally { setTtTestLoading(false) } }} disabled={ttTestLoading} className="flex items-center gap-1 px-2.5 py-1 rounded font-mono text-[10px] border transition-all hover:bg-white/5 disabled:opacity-40" style={{ borderColor: 'rgba(124,58,237,.3)', color: '#A78BFA' }}>
                  {ttTestLoading ? <span className="w-2.5 h-2.5 rounded-full border border-purple/30 border-t-purple animate-spin" /> : '🧪'} Verify
                </button>
                {!showTtConfirm ? (
                  article?.ttSent ? (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: 'rgba(16,185,129,.15)', color: '#10B981', border: '1px solid rgba(16,185,129,.3)' }}>✓ โพสต์แล้ว</span>
                      <button type="button" onClick={async () => { if (!article?.id) return; await fetch('/api/tiktok/post', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ articleId: article.id, mode: 'reset' }) }); window.location.reload() }} className="font-mono text-[10px] px-2 py-0.5 rounded border hover:bg-white/5" style={{ borderColor: 'rgba(155,142,196,.25)', color: 'rgba(155,142,196,.5)' }}>รีเซ็ต</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setShowTtConfirm(true)} disabled={ttPostLoading || !form.ttVideoUrl.trim() || !form.ttCaption.trim()} className="flex items-center gap-1 px-2.5 py-1 rounded font-mono text-[10px] transition-all hover:opacity-90 disabled:opacity-40" style={{ background: 'rgba(0,0,0,.3)', color: '#E2D9F3', border: '1px solid rgba(155,142,196,.3)' }}>
                      🎵 โพสต์ TikTok
                    </button>
                  )
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px]" style={{ color: '#F97316' }}>ยืนยัน?</span>
                    <button type="button" onClick={sendTikTokPost} disabled={ttPostLoading} className="px-2.5 py-1 rounded font-mono text-[10px] transition-all hover:opacity-90 disabled:opacity-50" style={{ background: 'rgba(0,0,0,.3)', color: '#E2D9F3', border: '1px solid rgba(155,142,196,.3)' }}>{ttPostLoading ? 'โพสต์...' : 'ยืนยัน'}</button>
                    <button type="button" onClick={() => setShowTtConfirm(false)} className="font-mono text-[10px] text-purple hover:underline">ยกเลิก</button>
                  </div>
                )}
                {ttTestMsg && <span className="font-mono text-[10px]" style={{ color: ttTestMsg.startsWith('✓') ? '#10B981' : '#F87171' }}>{ttTestMsg}</span>}
                {ttPostMsg && <span className="font-mono text-[10px]" style={{ color: ttPostMsg.startsWith('✓') ? '#10B981' : '#F87171' }}>{ttPostMsg}</span>}
              </div>

              {/* IG Reel */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] w-20 flex-shrink-0" style={{ color: 'rgba(155,142,196,.5)' }}>📸 IG Reel</span>
                {!showIgReelConfirm ? (
                  article?.igSent ? (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: 'rgba(16,185,129,.15)', color: '#10B981', border: '1px solid rgba(16,185,129,.3)' }}>✓ โพสต์แล้ว</span>
                      <button type="button" onClick={async () => { if (!article?.id) return; await fetch('/api/instagram/post', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ articleId: article.id, mode: 'reset' }) }); window.location.reload() }} className="font-mono text-[10px] px-2 py-0.5 rounded border hover:bg-white/5" style={{ borderColor: 'rgba(155,142,196,.25)', color: 'rgba(155,142,196,.5)' }}>รีเซ็ต</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setShowIgReelConfirm(true)} disabled={igReelLoading || !form.ttVideoUrl.trim() || !form.igCaption.trim()} className="flex items-center gap-1 px-2.5 py-1 rounded font-mono text-[10px] transition-all hover:opacity-90 disabled:opacity-40" style={{ background: 'rgba(236,72,153,.15)', color: '#F472B6', border: '1px solid rgba(236,72,153,.3)' }}>
                      📸 โพสต์ IG Reel
                    </button>
                  )
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px]" style={{ color: '#F97316' }}>ยืนยัน?</span>
                    <button type="button" onClick={sendIgReel} disabled={igReelLoading} className="px-2.5 py-1 rounded font-mono text-[10px] transition-all hover:opacity-90 disabled:opacity-50" style={{ background: 'rgba(236,72,153,.2)', color: '#F472B6', border: '1px solid rgba(236,72,153,.3)' }}>{igReelLoading ? 'โพสต์...' : 'ยืนยัน'}</button>
                    <button type="button" onClick={() => setShowIgReelConfirm(false)} className="font-mono text-[10px] text-purple hover:underline">ยกเลิก</button>
                  </div>
                )}
                {igReelMsg && <span className="font-mono text-[10px]" style={{ color: igReelMsg.startsWith('✓') ? '#10B981' : '#F87171' }}>{igReelMsg}</span>}
              </div>

              {/* Facebook Reel */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] w-20 flex-shrink-0" style={{ color: 'rgba(155,142,196,.5)' }}>🔵 FB Reel</span>
                {!showFbReelConfirm ? (
                  <button type="button" onClick={() => setShowFbReelConfirm(true)} disabled={fbReelLoading || !form.ttVideoUrl.trim()} className="flex items-center gap-1 px-2.5 py-1 rounded font-mono text-[10px] transition-all hover:opacity-90 disabled:opacity-40" style={{ background: 'rgba(59,130,246,.15)', color: '#60A5FA', border: '1px solid rgba(59,130,246,.3)' }}>
                    🔵 โพสต์ FB Reel
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px]" style={{ color: '#F97316' }}>ยืนยัน?</span>
                    <button type="button" onClick={sendFbReel} disabled={fbReelLoading} className="px-2.5 py-1 rounded font-mono text-[10px] transition-all hover:opacity-90 disabled:opacity-50" style={{ background: 'rgba(59,130,246,.2)', color: '#60A5FA', border: '1px solid rgba(59,130,246,.3)' }}>{fbReelLoading ? 'โพสต์...' : 'ยืนยัน'}</button>
                    <button type="button" onClick={() => setShowFbReelConfirm(false)} className="font-mono text-[10px] text-purple hover:underline">ยกเลิก</button>
                  </div>
                )}
                {fbReelMsg && <span className="font-mono text-[10px]" style={{ color: fbReelMsg.startsWith('✓') ? '#10B981' : '#F87171' }}>{fbReelMsg}</span>}
              </div>
            </div>
          </SocialBlock>

          {/* Instagram */}
          <SocialBlock
            icon="📸" platform="Instagram" limit={2200} ideal={300}
            caption={form.igCaption} hashtags={form.igHashtags}
            onCaption={v => setForm(f => ({ ...f, igCaption: v }))}
            onHashtags={v => setForm(f => ({ ...f, igHashtags: v }))}
            onAuto={() => autoSocial('ig')}
            onCopy={() => copyToClipboard(`${form.igCaption}\n\n${form.igHashtags}`)}
            onPreview={() => setPreviewPlatform('instagram')}
            hashtagHint="Instagram รองรับ hashtag สูงสุด 30 อัน"
          >
            {/* IG Image (1080×1080) */}
            <Field label="IG Image (1080×1080)" hint="รูปสำหรับโพสต์ Feed — ถ้าไม่มีจะใช้ Cover Image แทน">
              <div className="space-y-2">
                <textarea
                  value={form.igImagePrompt}
                  onChange={e => setForm(f => ({ ...f, igImagePrompt: e.target.value }))}
                  placeholder="อธิบายภาพที่ต้องการ เช่น: entrepreneur reviewing business charts, warm office lighting, square composition..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg font-mono text-xs resize-y"
                  style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(124,58,237,.25)', color: '#E2D9F3' }}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={generateIgImage}
                    disabled={igImageLoading || !form.title.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs transition-all hover:opacity-90 disabled:opacity-40"
                    style={{ background: 'rgba(124,58,237,.25)', color: '#C4B5FD', border: '1px solid rgba(124,58,237,.4)' }}
                  >
                    {igImageLoading
                      ? <><span className="w-3 h-3 rounded-full border border-purple/30 border-t-purple animate-spin" /> กำลังสร้าง...</>
                      : <>🎨 สร้างรูป IG AI (1080×1080)</>}
                  </button>
                </div>
                {form.igImage && (
                  <img src={form.igImage} alt="IG" className="rounded-lg w-full max-w-[240px]" style={{ aspectRatio: '1/1', objectFit: 'cover', border: '1px solid rgba(124,58,237,.2)' }} />
                )}
              </div>
            </Field>

            {/* Post buttons */}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => sendInstagramPost('test')}
                disabled={igPostLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs border transition-all hover:bg-white/5 disabled:opacity-40"
                style={{ borderColor: 'rgba(124,58,237,.3)', color: '#A78BFA' }}
              >
                {igPostLoading ? <span className="w-3 h-3 rounded-full border border-purple/30 border-t-purple animate-spin" /> : '🧪'}
                Verify Token
              </button>

              {!showIgConfirm ? (
                article?.igSent ? (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] px-2 py-1 rounded" style={{ background: 'rgba(16,185,129,.15)', color: '#10B981', border: '1px solid rgba(16,185,129,.3)' }}>✓ โพสต์แล้ว</span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!article?.id) return
                        await fetch('/api/instagram/post', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ articleId: article.id, mode: 'reset' }) })
                        setIgMsg('รีเซ็ตแล้ว — กด Post เพื่อโพสต์ใหม่')
                        window.location.reload()
                      }}
                      className="font-mono text-[10px] px-2 py-1 rounded border hover:bg-white/5 transition-colors"
                      style={{ borderColor: 'rgba(155,142,196,.25)', color: 'rgba(155,142,196,.5)' }}
                    >รีเซ็ต</button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowIgConfirm('photo')}
                    disabled={igPostLoading || !form.igCaption.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs transition-all hover:opacity-90 disabled:opacity-40"
                    style={{ background: 'rgba(236,72,153,.2)', color: '#F472B6', border: '1px solid rgba(236,72,153,.3)' }}
                  >📸 โพสต์ Photo</button>
                )
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px]" style={{ color: '#F97316' }}>
                    {showIgConfirm === 'reel' ? 'โพสต์ Reel Public ยืนยัน?' : 'โพสต์ Photo Public ยืนยัน?'}
                  </span>
                  <button
                    type="button"
                    onClick={() => sendInstagramPost(showIgConfirm)}
                    disabled={igPostLoading}
                    className="px-3 py-1.5 rounded-lg font-mono text-xs transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'rgba(236,72,153,.3)', color: '#F472B6', border: '1px solid rgba(236,72,153,.3)' }}
                  >
                    {igPostLoading ? 'โพสต์...' : 'ยืนยัน'}
                  </button>
                  <button type="button" onClick={() => setShowIgConfirm(null)} className="font-mono text-xs text-purple hover:underline">ยกเลิก</button>
                </div>
              )}

              {igMsg && (
                <span className="font-mono text-[10px]" style={{ color: igMsg.startsWith('✓') ? '#10B981' : '#F87171' }}>{igMsg}</span>
              )}
            </div>
          </SocialBlock>
        </Section>

        {/* Actions */}
        {(autosaveAvailable || autosaveMsg) && (
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-lg border" style={{ background: 'rgba(45,27,94,.12)', borderColor: 'rgba(124,58,237,.18)' }}>
            <span className="font-mono text-xs" style={{ color: autosaveMsg.includes('ไม่สำเร็จ') ? '#F87171' : '#A78BFA' }}>{autosaveMsg || 'มี autosave ที่ยังไม่ได้กู้คืน'}</span>
            {autosaveAvailable && (
              <button
                type="button"
                onClick={restoreAutosave}
                className="px-3 py-1.5 rounded font-mono text-[10px] border hover:opacity-90 transition-opacity"
                style={{ borderColor: 'rgba(56,189,248,.35)', color: '#38BDF8', background: 'rgba(56,189,248,.08)' }}
              >
                Restore autosave
              </button>
            )}
          </div>
        )}

        {msg && (
          <div className="px-4 py-3 rounded-lg font-mono text-sm" style={{
            background: msg.startsWith('✓') ? 'rgba(16,185,129,.1)' : 'rgba(239,68,68,.1)',
            color: msg.startsWith('✓') ? '#10B981' : '#F87171',
            border: `1px solid ${msg.startsWith('✓') ? 'rgba(16,185,129,.25)' : 'rgba(239,68,68,.25)'}`,
          }}>
            {msg}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap gap-3">
            <button onClick={() => save()} disabled={saving}
              className="bg-purple text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity">
              {saving ? 'กำลังบันทึก...' : mode === 'new' ? 'สร้างบทความ' : 'บันทึกการแก้ไข'}
            </button>
            <button
              onClick={() => save('draft')}
              disabled={saving}
              className="px-6 py-2.5 rounded-lg font-semibold text-sm border hover:opacity-90 disabled:opacity-50 transition-opacity"
              style={{ borderColor: 'rgba(124,58,237,.35)', color: '#A78BFA', background: 'rgba(124,58,237,.08)' }}>
              บันทึกเป็น Draft
            </button>
            <button
              onClick={() => save('review')}
              disabled={saving}
              className="px-6 py-2.5 rounded-lg font-semibold text-sm border hover:opacity-90 disabled:opacity-50 transition-opacity"
              style={{ borderColor: 'rgba(245,158,11,.35)', color: '#F59E0B', background: 'rgba(245,158,11,.08)' }}>
              ส่งเข้า Review
            </button>
            {mode === 'edit' && form.status !== 'published' && (
              <button
                onClick={() => save('approved')}
                disabled={saving}
                className="px-6 py-2.5 rounded-lg font-semibold text-sm border hover:opacity-90 disabled:opacity-50 transition-opacity"
                style={{ borderColor: 'rgba(56,189,248,.35)', color: '#38BDF8', background: 'rgba(56,189,248,.08)' }}>
                Approve
              </button>
            )}
            {mode === 'edit' && form.status !== 'published' && (
              <button onClick={() => save('published')}
                className="text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
                style={{ background: '#10B981' }}>
                เผยแพร่ทันที
              </button>
            )}
            {mode === 'edit' && form.slug && (
              <>
              <button
                type="button"
                onClick={openDraftPreview}
                disabled={previewLinkLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-semibold text-sm border hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ borderColor: 'rgba(245,158,11,.35)', color: '#F59E0B', background: 'rgba(245,158,11,.08)' }}>
                {previewLinkLoading ? 'กำลังสร้าง...' : 'Preview Draft ↗'}
              </button>
              <a href={`/articles/${form.slug}`} target="_blank" rel="noopener"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-semibold text-sm border hover:opacity-90 transition-opacity"
                style={{ borderColor: 'rgba(124,58,237,.35)', color: '#A78BFA', background: 'rgba(124,58,237,.08)' }}>
                ดูหน้าจริง ↗
              </a>
              </>
            )}
          </div>
          {mode === 'edit' && (
            <button onClick={deleteArticle} disabled={deleting}
              className="font-mono text-xs text-red-400 hover:text-red-300 transition-colors">
              {deleting ? 'กำลังลบ...' : 'ลบบทความ'}
            </button>
          )}
        </div>
      </div>

      {/* AI Generation Modal */}
      {showModal && (
        <GenerateModal
          title={form.title}
          category={form.category}
          tags={form.tags}
          onSelect={onSelectGenerated}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Platform Preview Modal */}
      {previewPlatform && (
        <PreviewModal
          platform={previewPlatform}
          data={{
            title: form.title,
            excerpt: form.excerpt,
            coverImage: form.coverImage,
            category: form.category,
            tags: form.tags,
            slug: form.slug,
            fbCaption: form.fbCaption,
            fbHashtags: form.fbHashtags,
            igCaption: form.igCaption,
            igHashtags: form.igHashtags,
            ttCaption: form.ttCaption,
            ttHashtags: form.ttHashtags,
            ttVideoUrl: form.ttVideoUrl,
            aiSummaryQ: form.aiSummaryQ,
            aiSummaryA: form.aiSummaryA,
            keyPoints: form.keyPoints,
            readTime: form.readTime,
          }}
          onClose={() => setPreviewPlatform(null)}
          onChangePlatform={setPreviewPlatform}
        />
      )}
    </div>
  )
}

function Section({ title, children, accent }: { title: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-xl border p-5 space-y-4" style={{
      borderColor: accent ? 'rgba(124,58,237,.3)' : 'rgba(124,58,237,.18)',
      background: accent ? 'rgba(45,27,94,.2)' : 'rgba(30,16,48,.4)',
    }}>
      <div className={`font-mono text-xs font-bold uppercase tracking-widest ${accent ? 'text-accent' : 'text-purple'}`}>
        {accent ? '🎯 ' : ''}{title}
      </div>
      {children}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-white">{label}</label>
      {hint && <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>{hint}</p>}
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 rounded-lg border text-white text-sm outline-none transition-colors focus:border-purple/60'
  + ' [&]:bg-[rgba(15,13,26,.7)] [&]:border-[rgba(124,58,237,.25)] [&]:placeholder-[rgba(167,139,250,.3)]'

interface SocialBlockProps {
  icon: string
  platform: string
  limit: number
  ideal: number
  caption: string
  hashtags: string
  onCaption: (v: string) => void
  onHashtags: (v: string) => void
  onAuto: () => void
  onCopy: () => void
  onPreview?: () => void
  hashtagHint?: string
  children?: React.ReactNode
}

function SocialBlock({ icon, platform, limit, ideal, caption, hashtags, onCaption, onHashtags, onAuto, onCopy, onPreview, hashtagHint, children }: SocialBlockProps) {
  const len = caption.length + (hashtags ? hashtags.length + 2 : 0)
  const color = len > limit ? '#EF4444' : len > ideal ? '#F59E0B' : '#10B981'
  return (
    <div className="rounded-lg border p-4 mb-4" style={{ borderColor: 'rgba(124,58,237,.2)', background: 'rgba(15,13,26,.4)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-xs font-bold uppercase tracking-widest" style={{ color: '#A78BFA' }}>
          {icon} {platform}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onAuto} className="font-mono text-[10px] text-accent hover:underline">✨ สร้างอัตโนมัติ</button>
          <button onClick={onCopy} className="font-mono text-[10px] text-purple hover:underline">📋 คัดลอก</button>
          {onPreview && (
            <button onClick={onPreview} className="font-mono text-[10px] hover:underline" style={{ color: '#9B8EC4' }}>👁 Preview</button>
          )}
        </div>
      </div>
      <textarea
        value={caption}
        onChange={e => onCaption(e.target.value)}
        rows={5}
        placeholder={`${platform} caption...`}
        className={`${inputCls} font-mono text-sm mb-2`}
        style={{ resize: 'vertical' }}
      />
      <input
        value={hashtags}
        onChange={e => onHashtags(e.target.value)}
        placeholder="#hashtag1 #hashtag2 ..."
        className={`${inputCls} font-mono text-xs`}
      />
      <div className="flex items-center justify-between mt-1.5">
        <span className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.45)' }}>
          {hashtagHint ?? `max ${limit.toLocaleString()} / ideal ${ideal} chars`}
        </span>
        <span className="font-mono text-[10px]" style={{ color }}>
          {len} ตัวอักษร {len > limit ? '⚠ เกินขีดจำกัด' : len > ideal ? '↑ ค่อนข้างยาว' : '✓'}
        </span>
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  )
}
