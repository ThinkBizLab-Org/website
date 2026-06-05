'use client'
import { useEffect } from 'react'

export type Platform = 'web' | 'line' | 'facebook' | 'instagram' | 'tiktok' | 'og' | 'ai'

export interface PreviewData {
  title: string
  excerpt: string
  coverImage: string
  igImage: string
  category: string
  tags: string
  slug: string
  lineBroadcastMsg: string
  fbCaption: string
  fbHashtags: string
  igCaption: string
  igHashtags: string
  ttCaption: string
  ttHashtags: string
  aiSummaryQ: string
  aiSummaryA: string
  keyPoints: string
  readTime: number
  ttVideoUrl: string
  igVideoUrl: string
}

interface Props {
  platform: Platform
  data: PreviewData
  onClose: () => void
  onChangePlatform: (p: Platform) => void
}

const PLATFORMS: { id: Platform; icon: string; label: string }[] = [
  { id: 'web',       icon: '🌐', label: 'Own Web' },
  { id: 'line',      icon: '💬', label: 'LINE' },
  { id: 'facebook',  icon: '🔵', label: 'Facebook' },
  { id: 'instagram', icon: '📸', label: 'Instagram' },
  { id: 'tiktok',   icon: '🎵', label: 'TikTok' },
  { id: 'og',        icon: '🧩', label: 'OG Card' },
  { id: 'ai',        icon: '🤖', label: 'AI Search' },
]

export function PreviewModal({ platform, data, onClose, onChangePlatform }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(10px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-2xl rounded-2xl flex flex-col overflow-hidden"
        style={{ background: '#0F0D1A', border: '1px solid rgba(124,58,237,.35)', maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'rgba(124,58,237,.2)' }}>
          <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest">👁 Platform Preview</div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/5 text-xl leading-none transition-colors">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b shrink-0 overflow-x-auto" style={{ borderColor: 'rgba(124,58,237,.15)' }}>
          {PLATFORMS.map(p => (
            <button
              key={p.id}
              onClick={() => onChangePlatform(p.id)}
              className="flex items-center gap-1.5 px-4 py-3 font-mono text-xs whitespace-nowrap transition-all shrink-0"
              style={{
                color: platform === p.id ? '#A78BFA' : 'rgba(155,142,196,.5)',
                borderBottom: platform === p.id ? '2px solid #7C3AED' : '2px solid transparent',
                background: platform === p.id ? 'rgba(124,58,237,.07)' : 'transparent',
              }}
            >
              {p.icon} {p.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5">
          {platform === 'web'       && <WebPreview data={data} />}
          {platform === 'line'      && <LinePreview data={data} />}
          {platform === 'facebook'  && <FacebookPreview data={data} />}
          {platform === 'instagram' && <InstagramPreview data={data} />}
          {platform === 'tiktok'    && <TikTokPreview data={data} />}
          {platform === 'og'        && <OpenGraphPreview data={data} />}
          {platform === 'ai'        && <AISearchPreview data={data} />}
        </div>
      </div>
    </div>
  )
}

/* ─── Own Web ─────────────────────────────────────────────────────── */
function WebPreview({ data }: { data: PreviewData }) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thinkbizlab.com'
  const url = `${base}/articles/${data.slug || 'article'}`
  const tags = data.tags.split(',').map(t => t.trim()).filter(Boolean)

  return (
    <div className="space-y-3">
      <div className="text-[10px] font-mono text-center mb-4" style={{ color: 'rgba(155,142,196,.4)' }}>
        ตัวอย่าง: {url}
      </div>

      {/* Article card */}
      <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(124,58,237,.2)', background: 'rgba(30,16,48,.6)' }}>
        {/* Cover */}
        <div className="relative w-full bg-purple/10" style={{ aspectRatio: '1200/630' }}>
          {data.coverImage
            ? <img src={data.coverImage} alt="" className="w-full h-full object-cover" />
            : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono text-xs" style={{ color: 'rgba(155,142,196,.3)' }}>ยังไม่มีภาพปก</span>
              </div>
            )}
          {data.category && (
            <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold"
              style={{ background: 'rgba(124,58,237,.85)', color: '#fff' }}>
              {data.category}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2 font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.5)' }}>
            <span>ThinkBiz Lab</span>
            <span>·</span>
            <span>อ่าน {data.readTime} นาที</span>
          </div>
          <h2 className="font-bold text-white text-base leading-snug">
            {data.title || 'ชื่อบทความ...'}
          </h2>
          {data.excerpt && (
            <p className="text-sm leading-relaxed" style={{ color: '#9B8EC4' }}>
              {data.excerpt.slice(0, 150)}{data.excerpt.length > 150 ? '...' : ''}
            </p>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tags.slice(0, 5).map(t => (
                <span key={t} className="px-2 py-0.5 rounded-full font-mono text-[10px]"
                  style={{ background: 'rgba(124,58,237,.15)', color: '#A78BFA', border: '1px solid rgba(124,58,237,.25)' }}>
                  #{t}
                </span>
              ))}
            </div>
          )}
          <div className="pt-1">
            <span className="font-mono text-xs font-bold" style={{ color: '#A78BFA' }}>อ่านบทความ →</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── LINE ───────────────────────────────────────────────────────── */
function LinePreview({ data }: { data: PreviewData }) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thinkbizlab.com'
  const url = `${base}/articles/${data.slug || 'article'}`
  const message = data.lineBroadcastMsg || [
    data.title ? `📊 ${data.title}` : '',
    data.excerpt,
    `อ่านเพิ่มเติม → ${url}`,
  ].filter(Boolean).join('\n\n')

  return (
    <div className="mx-auto max-w-sm rounded-[28px] p-3" style={{ background: '#071B33', border: '1px solid rgba(255,255,255,.12)' }}>
      <div className="text-center font-mono text-[10px] mb-3" style={{ color: 'rgba(255,255,255,.45)' }}>LINE Broadcast Preview</div>
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0" style={{ background: '#06C755', color: '#fff' }}>T</div>
          <div className="min-w-0">
            <div className="rounded-2xl rounded-tl-sm px-3 py-2 whitespace-pre-wrap text-sm leading-relaxed" style={{ background: '#fff', color: '#111827' }}>
              {message || 'ยังไม่มีข้อความ LINE Broadcast'}
            </div>
            <div className="font-mono text-[9px] mt-1" style={{ color: 'rgba(255,255,255,.35)' }}>ThinkBiz Lab</div>
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden ml-10" style={{ background: '#fff' }}>
          {data.coverImage
            ? <img src={data.coverImage} alt="" className="w-full object-cover" style={{ aspectRatio: '1200/630' }} />
            : <div className="w-full flex items-center justify-center" style={{ aspectRatio: '1200/630', background: '#EEF2FF', color: '#7C3AED' }}>ภาพปก</div>}
          <div className="p-3">
            <div className="text-sm font-bold leading-snug" style={{ color: '#111827' }}>{data.title || 'ชื่อบทความ...'}</div>
            {data.excerpt && <div className="text-xs mt-1 line-clamp-2" style={{ color: '#6B7280' }}>{data.excerpt}</div>}
            <div className="font-mono text-[10px] mt-2 truncate" style={{ color: '#6B7280' }}>{url}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Facebook ────────────────────────────────────────────────────── */
function FacebookPreview({ data }: { data: PreviewData }) {
  const fullText = [data.fbCaption, data.fbHashtags].filter(Boolean).join('\n\n')

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#1C1E21', border: '1px solid rgba(255,255,255,.08)' }}>
      {/* Post header */}
      <div className="flex items-center gap-3 p-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)', color: '#fff' }}>T</div>
        <div>
          <div className="text-sm font-bold text-white">ThinkBiz Lab</div>
          <div className="font-mono text-[10px]" style={{ color: 'rgba(255,255,255,.4)' }}>
            ตอนนี้ · <span style={{ color: '#529fca' }}>🌐</span>
          </div>
        </div>
        <div className="ml-auto font-mono text-[10px]" style={{ color: 'rgba(255,255,255,.4)' }}>···</div>
      </div>

      {/* Post text */}
      <div className="px-3 pb-3">
        {fullText
          ? <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: '#E4E6EB' }}>
              {fullText.slice(0, 280)}{fullText.length > 280 ? '...' : ''}
            </p>
          : <p className="text-sm italic" style={{ color: 'rgba(255,255,255,.3)' }}>ยังไม่มี caption — กด ✨ สร้างอัตโนมัติ</p>}
      </div>

      {/* Link preview card */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
        {data.coverImage
          ? <img src={data.coverImage} alt="" className="w-full" style={{ aspectRatio: '1200/630', objectFit: 'cover' }} />
          : <div className="w-full flex items-center justify-center" style={{ aspectRatio: '1200/630', background: 'rgba(124,58,237,.1)' }}>
              <span className="font-mono text-xs" style={{ color: 'rgba(155,142,196,.3)' }}>ภาพปก</span>
            </div>
        }
        <div className="p-3" style={{ background: '#242526' }}>
          <div className="font-mono text-[10px] uppercase mb-0.5" style={{ color: 'rgba(255,255,255,.4)' }}>THINKBIZLAB.COM</div>
          <div className="text-sm font-bold text-white leading-snug">{data.title || 'ชื่อบทความ...'}</div>
          {data.excerpt && <div className="font-mono text-[10px] mt-0.5 line-clamp-2" style={{ color: 'rgba(255,255,255,.5)' }}>{data.excerpt}</div>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 px-3 py-2 border-t" style={{ borderColor: 'rgba(255,255,255,.08)' }}>
        {['👍 ถูกใจ', '💬 แสดงความคิดเห็น', '↗ แชร์'].map(a => (
          <button key={a} className="flex-1 py-1.5 rounded-lg font-mono text-xs text-center transition-colors hover:bg-white/5"
            style={{ color: 'rgba(255,255,255,.5)' }}>{a}</button>
        ))}
      </div>
    </div>
  )
}

/* ─── Instagram ───────────────────────────────────────────────────── */
function InstagramPreview({ data }: { data: PreviewData }) {
  const fullText = [data.igCaption, '', data.igHashtags].filter(Boolean).join('\n')
  const image = data.igImage || data.coverImage

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#000', border: '1px solid rgba(255,255,255,.1)' }}>
      {/* Header */}
      <div className="flex items-center gap-2.5 p-3">
        <div className="w-8 h-8 rounded-full p-0.5" style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}>
          <div className="w-full h-full rounded-full flex items-center justify-center font-bold text-[10px]"
            style={{ background: '#000', color: '#fff' }}>T</div>
        </div>
        <div className="font-bold text-white text-xs">thinkbizlab</div>
        <div className="ml-auto font-mono text-[10px]" style={{ color: 'rgba(255,255,255,.4)' }}>···</div>
      </div>

      {/* Square image */}
      <div className="relative w-full" style={{ aspectRatio: '1/1' }}>
        {image
          ? <img src={image} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(124,58,237,.15)' }}>
              <span className="font-mono text-xs" style={{ color: 'rgba(155,142,196,.3)' }}>Instagram image</span>
            </div>}
      </div>

      {/* Actions */}
      <div className="px-3 pt-3 pb-1 flex items-center gap-4">
        {['❤️', '💬', '↗'].map((icon, i) => (
          <button key={i} className="text-xl">{icon}</button>
        ))}
        <div className="ml-auto">🔖</div>
      </div>

      {/* Likes */}
      <div className="px-3 py-1 font-mono text-[11px] font-bold text-white">1,234 likes</div>

      {/* Caption */}
      <div className="px-3 pb-3">
        {fullText
          ? <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: '#fff' }}>
              <span className="font-bold">thinkbizlab </span>
              {fullText.slice(0, 200)}{fullText.length > 200 ? '... <span style="color:rgba(255,255,255,.4)">ดูเพิ่มเติม</span>' : ''}
            </p>
          : <p className="text-sm italic" style={{ color: 'rgba(255,255,255,.3)' }}>ยังไม่มี caption — กด ✨ สร้างอัตโนมัติ</p>}
        <p className="font-mono text-[10px] mt-1" style={{ color: 'rgba(255,255,255,.35)' }}>2 ชั่วโมงที่แล้ว</p>
      </div>
    </div>
  )
}

/* ─── TikTok ──────────────────────────────────────────────────────── */
function TikTokPreview({ data }: { data: PreviewData }) {
  const fullCaption = [data.ttCaption, data.ttHashtags].filter(Boolean).join('\n\n')
  const hasVideo = !!data.ttVideoUrl

  return (
    <div className="flex justify-center">
      <div className="relative rounded-xl overflow-hidden w-64" style={{ aspectRatio: '9/16', background: '#000' }}>
        {/* Background */}
        {hasVideo
          ? <video src={data.ttVideoUrl} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
          : data.coverImage
          ? <img src={data.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" style={{ filter: 'blur(8px) saturate(1.4)', transform: 'scale(1.1)' }} />
          : <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(124,58,237,.3) 0%, rgba(0,0,0,.8) 100%)' }} />}

        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,.85) 100%)' }} />

        {/* Cover image (foreground) */}
        {!hasVideo && data.coverImage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <img src={data.coverImage} alt="" className="w-full h-full object-contain" />
          </div>
        )}

        {/* Video overlay indicator */}
        {hasVideo && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,.5)', border: '2px solid rgba(255,255,255,.4)' }}>
            <span className="text-2xl ml-1">▶</span>
          </div>
        )}
        {!hasVideo && (
          <div className="absolute top-3 right-3">
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,.25)', color: '#F87171', border: '1px solid rgba(239,68,68,.4)' }}>
              ไม่มี Video
            </span>
          </div>
        )}

        {/* Right sidebar icons */}
        <div className="absolute right-2 bottom-24 flex flex-col items-center gap-4">
          <div className="w-9 h-9 rounded-full" style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.2)' }} />
          {['❤️', '💬', '↗', '♫'].map((icon, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span className="text-lg">{icon}</span>
              <span className="font-mono text-[8px] text-white">1.2K</span>
            </div>
          ))}
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-10 p-3">
          <div className="font-bold text-white text-xs mb-1">@thinkbizlab</div>
          {fullCaption
            ? <p className="text-[11px] text-white leading-snug line-clamp-3 whitespace-pre-wrap">{fullCaption}</p>
            : <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,.4)' }}>ยังไม่มี caption</p>}
          <div className="flex items-center gap-1 mt-2">
            <span className="text-xs">♫</span>
            <span className="font-mono text-[10px] text-white opacity-70 truncate">ThinkBiz Lab — Original sound</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Open Graph ─────────────────────────────────────────────────── */
function OpenGraphPreview({ data }: { data: PreviewData }) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thinkbizlab.com'
  const url = `${base}/articles/${data.slug || 'article'}`

  return (
    <div className="space-y-4">
      <div className="rounded-xl overflow-hidden" style={{ background: '#F8FAFC', border: '1px solid rgba(148,163,184,.35)' }}>
        {data.coverImage
          ? <img src={data.coverImage} alt="" className="w-full object-cover" style={{ aspectRatio: '1200/630' }} />
          : <div className="w-full flex items-center justify-center" style={{ aspectRatio: '1200/630', background: '#EDE9FE', color: '#7C3AED' }}>Open Graph Image 1200x630</div>}
        <div className="p-4">
          <div className="font-mono text-[10px] uppercase mb-1" style={{ color: '#64748B' }}>www.thinkbizlab.com</div>
          <div className="text-base font-bold leading-snug" style={{ color: '#0F172A' }}>{data.title || 'ชื่อบทความ...'}</div>
          {data.excerpt && <div className="text-sm mt-1 line-clamp-2" style={{ color: '#475569' }}>{data.excerpt}</div>}
        </div>
      </div>

      <div className="rounded-xl p-4" style={{ background: 'rgba(15,13,26,.6)', border: '1px solid rgba(124,58,237,.18)' }}>
        <div className="font-mono text-xs font-bold mb-3" style={{ color: '#A78BFA' }}>Metadata Readiness</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ['Title', data.title, `${data.title.length} chars`],
            ['Description', data.excerpt, `${data.excerpt.length} chars`],
            ['OG Image', data.coverImage, data.coverImage ? 'set' : 'missing'],
            ['Canonical URL', data.slug, url],
          ].map(([label, value, meta]) => (
            <div key={label} className="rounded-lg px-3 py-2 border" style={{ borderColor: value ? 'rgba(16,185,129,.3)' : 'rgba(239,68,68,.3)', background: value ? 'rgba(16,185,129,.06)' : 'rgba(239,68,68,.06)' }}>
              <div className="font-mono text-[10px]" style={{ color: '#9B8EC4' }}>{label}</div>
              <div className="font-mono text-[10px] truncate" style={{ color: value ? '#10B981' : '#F87171' }}>{meta}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── AI Search ───────────────────────────────────────────────────── */
function AISearchPreview({ data }: { data: PreviewData }) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thinkbizlab.com'
  const url = `${base}/articles/${data.slug || 'article'}`
  const keyPoints = data.keyPoints.split('\n').map(k => k.trim()).filter(Boolean)
  const tags = data.tags.split(',').map(t => t.trim()).filter(Boolean)

  return (
    <div className="space-y-4">
      {/* Perplexity-style answer */}
      <div className="rounded-xl p-4" style={{ background: 'rgba(20,18,30,.9)', border: '1px solid rgba(124,58,237,.25)' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs" style={{ background: 'linear-gradient(135deg, #20DDAA, #00B4D8)' }}>P</div>
          <span className="font-mono text-xs font-bold" style={{ color: '#20DDAA' }}>Perplexity AI</span>
        </div>

        {/* Query */}
        {data.aiSummaryQ && (
          <div className="font-mono text-[10px] mb-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,.04)', color: 'rgba(255,255,255,.6)', border: '1px solid rgba(255,255,255,.08)' }}>
            🔍 &quot;{data.aiSummaryQ}&quot;
          </div>
        )}

        {/* Answer */}
        {data.aiSummaryA
          ? <p className="text-sm leading-relaxed text-white mb-3">{data.aiSummaryA}</p>
          : <p className="text-sm italic mb-3" style={{ color: 'rgba(255,255,255,.3)' }}>ยังไม่มี AI Summary — กรอกใน GEO Optimization</p>}

        {/* Key points */}
        {keyPoints.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {keyPoints.slice(0, 4).map((pt, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ background: 'rgba(124,58,237,.3)', color: '#A78BFA' }}>{i + 1}</span>
                <span style={{ color: '#E8E4FF' }}>{pt}</span>
              </div>
            ))}
          </div>
        )}

        {/* Source */}
        <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,.08)' }}>
          <div className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold shrink-0"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)', color: '#fff' }}>T</div>
          <a href={url} target="_blank" rel="noopener" className="font-mono text-[10px] hover:underline truncate" style={{ color: '#A78BFA' }}>
            {url}
          </a>
          <span className="font-mono text-[10px] shrink-0" style={{ color: 'rgba(255,255,255,.3)' }}>· ThinkBiz Lab</span>
        </div>
      </div>

      {/* ChatGPT-style snippet */}
      <div className="rounded-xl p-4" style={{ background: 'rgba(20,18,30,.9)', border: '1px solid rgba(255,255,255,.08)' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#10A37F', color: '#fff' }}>G</div>
          <span className="font-mono text-xs font-bold text-white">ChatGPT</span>
          <span className="font-mono text-[10px] ml-auto" style={{ color: 'rgba(255,255,255,.3)' }}>Source จาก web</span>
        </div>

        <div className="flex gap-3">
          {data.coverImage && (
            <img src={data.coverImage} alt="" className="w-20 h-14 rounded-lg object-cover shrink-0" />
          )}
          <div className="min-w-0">
            <div className="text-sm font-bold text-white leading-snug mb-1 line-clamp-2">{data.title || 'ชื่อบทความ...'}</div>
            <div className="font-mono text-[10px] mb-1 truncate" style={{ color: '#10A37F' }}>{url}</div>
            {data.excerpt && (
              <div className="text-xs leading-relaxed line-clamp-2" style={{ color: 'rgba(255,255,255,.55)' }}>{data.excerpt}</div>
            )}
          </div>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
            {tags.slice(0, 5).map(t => (
              <span key={t} className="px-2 py-0.5 rounded font-mono text-[10px]" style={{ background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.5)' }}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
