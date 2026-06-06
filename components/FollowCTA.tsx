'use client'

import { NewsletterForm } from './NewsletterForm'

// End-of-article capture: readers who finish are the most likely to subscribe.
// Offers email signup (segmented by the article's category) plus a LINE follow
// option when a LINE OA link is configured.
export function FollowCTA({ segment = 'general' }: { segment?: string }) {
  const lineUrl = process.env.NEXT_PUBLIC_LINE_OA_URL || 'https://line.me/R/ti/p/@thinkbizlab'

  return (
    <section
      className="mt-14 rounded-2xl border p-6 sm:p-8 text-center"
      style={{ borderColor: 'rgba(124,58,237,.25)', background: 'linear-gradient(160deg, rgba(45,27,94,.45), rgba(30,16,48,.55))' }}
    >
      <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest mb-2">{'// ติดตาม ThinkBiz Lab'}</div>
      <h2 className="font-heading text-xl sm:text-2xl font-bold text-white mb-2">รับบทความธุรกิจคุณภาพ ส่งตรงถึงคุณ</h2>
      <p className="text-sm mb-5" style={{ color: '#C4B5FD' }}>
        Insight สำหรับ SME และเจ้าของธุรกิจ — ฟรี ไม่สแปม ยกเลิกได้ทุกเมื่อ
      </p>

      <NewsletterForm source="article-end" segment={segment} />

      {lineUrl && (
        <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
          <span className="font-mono text-[11px]" style={{ color: 'rgba(155,142,196,.6)' }}>หรือสะดวกกว่าทาง</span>
          <a
            href={lineUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{ background: '#06C755', color: '#fff' }}
          >
            💬 ติดตามทาง LINE
          </a>
        </div>
      )}
    </section>
  )
}
