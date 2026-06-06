export const dynamic = 'force-dynamic'

import { desc, isNotNull, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { articles } from '@/lib/schema'
import { loadVideoPipelineConfig } from '@/lib/video-pipeline-config'
import { VideoApproveButton } from '@/components/VideoApproveButton'

export const metadata = { title: 'Video Review' }

function fmt(date: Date | null) {
  return date ? new Date(date).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-'
}

export default async function VideoReviewPage() {
  let rows: (typeof articles.$inferSelect)[] = []
  let requireApproval = false
  try {
    requireApproval = (await loadVideoPipelineConfig()).requireApproval
    rows = await db.select().from(articles)
      .where(or(isNotNull(articles.ttVideoUrl), isNotNull(articles.igVideoUrl)))
      .orderBy(desc(articles.updatedAt))
      .limit(100)
  } catch {
    // DB unavailable during local setup.
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white mb-1">Video Review</h1>
        <p className="text-sm" style={{ color: '#9B8EC4' }}>
          พรีวิววิดีโอก่อนปล่อยขึ้นแพลตฟอร์ม{' '}
          {requireApproval
            ? <span style={{ color: '#10B981' }}>· ต้องอนุมัติก่อนโพสต์ (เปิดอยู่)</span>
            : <span style={{ color: '#F59E0B' }}>· โหมดอนุมัติปิดอยู่ — โพสต์อัตโนมัติได้เลย (เปิดได้ใน Settings)</span>}
        </p>
      </div>

      {rows.length === 0 && (
        <div className="rounded-xl border p-12 text-center font-mono text-sm" style={{ borderColor: 'rgba(124,58,237,.18)', color: 'rgba(155,142,196,.5)' }}>
          ยังไม่มีวิดีโอ
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {rows.map(article => {
          const videoUrl = article.ttVideoUrl ?? article.igVideoUrl ?? ''
          return (
            <div key={article.id} className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.4)' }}>
              <div className="aspect-[9/16] max-h-[360px] bg-black flex items-center justify-center">
                {videoUrl
                  ? <video src={videoUrl} controls playsInline className="h-full w-full object-contain" />
                  : <span className="font-mono text-xs" style={{ color: 'rgba(155,142,196,.4)' }}>no preview</span>}
              </div>
              <div className="p-4 space-y-3">
                <div className="font-heading font-semibold text-white text-sm line-clamp-2">{article.title}</div>
                <div className="flex flex-wrap gap-2 font-mono text-[10px]">
                  {article.videoFormatUsed && <span className="px-2 py-0.5 rounded" style={{ background: 'rgba(56,189,248,.12)', color: '#38BDF8' }}>{article.videoFormatUsed}</span>}
                  <span className="px-2 py-0.5 rounded" style={{ background: article.videoApprovedAt ? 'rgba(16,185,129,.12)' : 'rgba(245,158,11,.12)', color: article.videoApprovedAt ? '#10B981' : '#F59E0B' }}>
                    {article.videoApprovedAt ? `อนุมัติ ${fmt(article.videoApprovedAt)}` : 'ยังไม่อนุมัติ'}
                  </span>
                </div>
                <VideoApproveButton articleId={article.id} approved={Boolean(article.videoApprovedAt)} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
