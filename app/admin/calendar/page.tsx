export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { articles, contentFactoryTopics } from '@/lib/schema'
import { desc } from 'drizzle-orm'
import Link from 'next/link'
import { CalendarView } from '@/components/CalendarView'

export default async function CalendarPage() {
  const all = await db.select({
    id: articles.id,
    title: articles.title,
    slug: articles.slug,
    status: articles.status,
    publishScheduledAt: articles.publishScheduledAt,
    publishedAt: articles.publishedAt,
    coverImage: articles.coverImage,
    category: articles.category,
    lineBroadcastSent: articles.lineBroadcastSent,
    fbSent: articles.fbSent,
    igSent: articles.igSent,
    ttSent: articles.ttSent,
    lineBroadcastMsg: articles.lineBroadcastMsg,
    fbCaption: articles.fbCaption,
    igCaption: articles.igCaption,
    ttCaption: articles.ttCaption,
  }).from(articles).orderBy(desc(articles.publishScheduledAt))

  const topics = await db.select({
    id: contentFactoryTopics.id,
    topic: contentFactoryTopics.topic,
    category: contentFactoryTopics.category,
    tags: contentFactoryTopics.tags,
    status: contentFactoryTopics.status,
    scheduledAt: contentFactoryTopics.scheduledAt,
    articleId: contentFactoryTopics.articleId,
    approvalToken: contentFactoryTopics.approvalToken,
    lineNotifiedAt: contentFactoryTopics.lineNotifiedAt,
    approvedAt: contentFactoryTopics.approvedAt,
    error: contentFactoryTopics.error,
  }).from(contentFactoryTopics).orderBy(desc(contentFactoryTopics.scheduledAt))

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white mb-1">Content Calendar</h1>
          <p className="font-mono text-xs" style={{ color: 'rgba(155,142,196,.5)' }}>
            ระบบโพสต์อัตโนมัติ — ทำงานทุกชั่วโมง
          </p>
        </div>
        <Link href="/admin/articles/new"
          className="bg-purple text-white px-4 py-2 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity">
          + เพิ่มบทความ
        </Link>
      </div>

      <CalendarView articles={all} factoryTopics={topics} />
    </div>
  )
}
