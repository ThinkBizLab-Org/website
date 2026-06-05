export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { db } from '@/lib/db'
import { articles } from '@/lib/schema'
import { count } from 'drizzle-orm'

export default async function AdminDashboard() {
  const stats = { total: 0, published: 0, approved: 0, draft: 0, review: 0 }

  try {
    const rows = await db.select({ status: articles.status, cnt: count() })
      .from(articles)
      .groupBy(articles.status)
    rows.forEach(r => {
      stats.total += Number(r.cnt)
      if (r.status === 'published') stats.published = Number(r.cnt)
      if (r.status === 'approved')  stats.approved  = Number(r.cnt)
      if (r.status === 'draft')     stats.draft     = Number(r.cnt)
      if (r.status === 'review')    stats.review    = Number(r.cnt)
    })
  } catch { /* DB not connected */ }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-sm" style={{ color: '#9B8EC4' }}>ภาพรวมเนื้อหาและกิจกรรมล่าสุด</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'บทความทั้งหมด', value: stats.total,     color: '#A78BFA' },
          { label: 'เผยแพร่แล้ว',   value: stats.published, color: '#10B981' },
          { label: 'Approved',       value: stats.approved,  color: '#38BDF8' },
          { label: 'Draft',          value: stats.draft,     color: '#F59E0B' },
          { label: 'รอ Review',      value: stats.review,    color: '#F97316' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border p-5" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.5)' }}>
            <div className="font-heading text-3xl font-bold mb-1" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs font-mono" style={{ color: '#9B8EC4' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link href="/admin/articles/new"
          className="flex items-center gap-4 rounded-xl border p-5 transition-all hover:border-accent/40 group"
          style={{ borderColor: 'rgba(124,58,237,.2)', background: 'rgba(124,58,237,.08)' }}>
          <span className="text-3xl">✏️</span>
          <div>
            <div className="font-heading font-bold text-white group-hover:text-accent transition-colors">เขียนบทความใหม่</div>
            <div className="text-xs mt-0.5" style={{ color: '#9B8EC4' }}>สร้างบทความพร้อม GEO fields ครบ</div>
          </div>
        </Link>
        <Link href="/admin/articles"
          className="flex items-center gap-4 rounded-xl border p-5 transition-all hover:border-accent/40 group"
          style={{ borderColor: 'rgba(124,58,237,.2)', background: 'rgba(45,27,94,.3)' }}>
          <span className="text-3xl">📋</span>
          <div>
            <div className="font-heading font-bold text-white group-hover:text-accent transition-colors">จัดการบทความ</div>
            <div className="text-xs mt-0.5" style={{ color: '#9B8EC4' }}>แก้ไข เผยแพร่ หรือลบบทความ</div>
          </div>
        </Link>
      </div>

      {/* GEO Tip */}
      <div className="rounded-xl border p-5" style={{ borderColor: 'rgba(124,58,237,.2)', background: 'rgba(45,27,94,.2)' }}>
        <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest mb-3">{'// GEO CHECKLIST'}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            ['AI Summary Box',    'ตอบคำถามหลักของบทความใน 1-2 ประโยค'],
            ['Key Points',        'สรุปประเด็นสำคัญ 3-5 ข้อ'],
            ['FAQ Section',       'คำถาม-คำตอบที่ AI จะอ้างอิง'],
            ['Question Headings', '## หัวข้อที่เป็นคำถาม เช่น "X คืออะไร?"'],
            ['Tags & Category',   'หมวดหมู่และแท็กครบถ้วน'],
            ['Excerpt 120+ chars','Meta description สำหรับ AI snippet'],
          ].map(([title, desc]) => (
            <div key={title} className="flex items-start gap-2 text-sm">
              <span className="text-accent mt-0.5">▸</span>
              <div>
                <span className="text-white font-semibold">{title}</span>
                <span className="text-xs ml-2" style={{ color: '#9B8EC4' }}>{desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
