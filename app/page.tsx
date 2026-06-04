import Link from 'next/link'
import { db } from '@/lib/db'
import { articles } from '@/lib/schema'
import { count, desc, eq } from 'drizzle-orm'
import { Navbar } from '@/components/Navbar'
import { ArticleCard } from '@/components/ArticleCard'
import { NewsletterForm } from '@/components/NewsletterForm'

const categoryMeta = [
  { icon: '📊', name: 'Strategy' },
  { icon: '💰', name: 'Finance' },
  { icon: '📣', name: 'Marketing' },
  { icon: '🚀', name: 'Startup' },
  { icon: '🏪', name: 'SME' },
  { icon: '📈', name: 'Investment' },
  { icon: '🤖', name: 'AI & Tech' },
  { icon: '🌏', name: 'Global Case' },
]

function LineIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
    </svg>
  )
}

function SectionHeader({ label, title, href }: { label: string; title: string; href: string }) {
  return (
    <div className="flex items-end justify-between mb-8 gap-4">
      <div>
        <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest mb-1">{label}</div>
        <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">{title}</h2>
      </div>
      <Link href={href} className="text-accent text-sm font-semibold shrink-0 hover:underline">ดูทั้งหมด →</Link>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-16 text-center text-muted font-mono text-sm border border-purple/10 rounded-xl" style={{ background: 'rgba(45,27,94,.15)' }}>
      {text}
    </div>
  )
}

export default async function HomePage() {
  let featured: (typeof articles.$inferSelect)[] = []
  let latest: (typeof articles.$inferSelect)[] = []
  let categoryCounts: Record<string, number> = {}
  let totalPublished = 0

  try {
    featured = await db.select().from(articles)
      .where(eq(articles.status, 'published'))
      .orderBy(desc(articles.publishedAt))
      .limit(3)
    latest = await db.select().from(articles)
      .where(eq(articles.status, 'published'))
      .orderBy(desc(articles.publishedAt))
      .limit(5)
    const [totalRow] = await db.select({ value: count() }).from(articles).where(eq(articles.status, 'published'))
    totalPublished = Number(totalRow?.value ?? 0)
    const categoryRows = await db.select({ category: articles.category, value: count() })
      .from(articles)
      .where(eq(articles.status, 'published'))
      .groupBy(articles.category)
    categoryCounts = Object.fromEntries(categoryRows.filter(r => r.category).map(r => [r.category!, Number(r.value)]))
  } catch { /* DB not connected — show empty state */ }

  const categories = categoryMeta
    .map(cat => ({ ...cat, count: categoryCounts[cat.name] ?? 0 }))
    .filter(cat => cat.count > 0)

  return (
    <div className="min-h-screen bg-dark text-white">
      <Navbar />

      {/* HERO */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-28 pb-16 overflow-hidden text-center">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 85% 60% at 50% -5%,rgba(124,58,237,.35) 0%,transparent 60%),radial-gradient(ellipse 50% 40% at 85% 90%,rgba(91,33,182,.14) 0%,transparent 55%)' }} />
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(124,58,237,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,.06) 1px,transparent 1px)', backgroundSize: '54px 54px' }} />
        <div className="absolute right-[5%] top-1/2 -translate-y-1/2 opacity-[0.04] pointer-events-none hidden lg:block">
          <svg width="280" height="380" viewBox="0 0 140 190" fill="none">
            <rect x="50" y="0" width="40" height="10" rx="4" fill="#A78BFA"/>
            <rect x="55" y="10" width="30" height="38" rx="2" fill="#A78BFA"/>
            <polygon points="42,48 98,48 118,170 22,170" fill="#A78BFA"/>
            <polygon points="42,104 98,104 118,170 22,170" fill="#7C3AED"/>
            <circle cx="52" cy="138" r="11" fill="#C4B5FD"/>
            <circle cx="78" cy="130" r="8" fill="#DDD6FE"/>
            <circle cx="98" cy="142" r="7" fill="#C4B5FD"/>
          </svg>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 border border-purple/30 text-accent font-mono text-xs tracking-widest px-5 py-2 rounded-full mb-8" style={{ background: 'rgba(124,58,237,.1)' }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#A78BFA' }} />
            BUSINESS INTELLIGENCE LAB · ห้องทดลองความคิดธุรกิจ
          </div>

          <h1 className="font-heading font-black leading-[1.05] tracking-tight mb-7" style={{ fontSize: 'clamp(2.8rem,6vw,5.5rem)' }}>
            <span className="text-white">คิดแบบ</span><br />
            <span className="text-accent relative inline-block">
              นักธุรกิจ
              <span className="absolute left-0 right-0 h-1 rounded" style={{ bottom: '-6px', background: 'linear-gradient(90deg,#7C3AED,transparent)' }} />
            </span><br />
            <span className="text-white">ได้ตั้งแต่วันนี้</span>
          </h1>

          <p className="text-lg leading-relaxed max-w-lg mx-auto mb-10 font-light" style={{ color: '#9B8EC4' }}>
            ทดลอง วิเคราะห์ และแชร์ Business Insight ที่นำไปใช้ได้จริง<br className="hidden sm:block" />
            สำหรับ SME เจ้าของธุรกิจ นักลงทุน และผู้ที่อยากคิดแบบนักธุรกิจ
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            <Link href="/articles" className="inline-flex items-center gap-2 bg-purple text-white px-6 py-3.5 rounded-xl text-base font-semibold transition-all hover:opacity-90 hover:-translate-y-0.5">
              อ่านบทความ →
            </Link>
            <a href="https://line.me/R/ti/p/@thinkbizlab" target="_blank" rel="noopener"
              className="inline-flex items-center gap-2 text-white px-5 py-3.5 rounded-xl text-base font-semibold transition-all hover:opacity-90" style={{ background: '#06C755' }}>
              <LineIcon /> Add Line OA
            </a>
          </div>

          <NewsletterForm source="home-hero" />
          <p className="font-mono text-xs" style={{ color: 'rgba(155,142,196,.5)' }}>ฟรี · ยกเลิกได้ทุกเมื่อ · ไม่มี Spam</p>

          <div className="flex items-center justify-center gap-10 mt-12 pt-8" style={{ borderTop: '1px solid rgba(124,58,237,.15)' }}>
            {[[totalPublished ? `${totalPublished}+` : '0','บทความ'],['5K+','ผู้อ่านประจำ'],['4.8★','คะแนนเฉลี่ย']].map(([num, label]) => (
              <div key={label} className="text-center">
                <div className="font-heading text-3xl font-bold text-accent tracking-tight">{num}</div>
                <div className="text-sm mt-1 font-light" style={{ color: '#9B8EC4' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <SectionHeader label="// FEATURED" title="บทความแนะนำ" href="/articles" />
        {featured.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featured.map((a, i) => <ArticleCard key={a.id} article={a} featured={i === 0} />)}
          </div>
        ) : (
          <EmptyState text="ยังไม่มีบทความ — เริ่มเพิ่มบทความแรกได้ที่ /admin" />
        )}
      </section>

      {/* CATEGORIES */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <SectionHeader label="// EXPLORE" title="หมวดหมู่ความรู้" href="/categories" />
        {categories.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {categories.map(cat => (
            <Link key={cat.name} href={`/articles?category=${encodeURIComponent(cat.name)}`}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border text-center group transition-all hover:-translate-y-1"
              style={{ borderColor: 'rgba(124,58,237,.15)', background: 'rgba(45,27,94,.3)' }}>
              <span className="text-2xl">{cat.icon}</span>
              <span className="font-heading text-sm font-bold text-white">{cat.name}</span>
              <span className="font-mono text-[10px]" style={{ color: '#9B8EC4' }}>{cat.count} บทความ</span>
            </Link>
          ))}
        </div>
        ) : (
          <EmptyState text="ยังไม่มีหมวดหมู่จากบทความที่เผยแพร่" />
        )}
      </section>

      {/* LATEST */}
      <div className="border-y py-16" style={{ borderColor: 'rgba(124,58,237,.1)', background: 'rgba(15,13,26,.6)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeader label="// LATEST" title="บทความล่าสุด" href="/articles" />
          <div className="divide-y" style={{ borderColor: 'rgba(124,58,237,.07)' }}>
            {latest.length > 0 ? latest.map((a, i) => (
              <Link key={a.id} href={`/articles/${a.slug}`}
                className="flex items-center gap-4 py-4 group transition-all hover:pl-2">
                <span className="font-mono text-xs w-6 shrink-0" style={{ color: 'rgba(124,58,237,.4)' }}>{String(i+1).padStart(2,'0')}</span>
                {a.coverImage && (
                  <div className="w-16 h-11 rounded-lg overflow-hidden shrink-0 hidden sm:block">
                    <img src={a.coverImage} alt="" className="w-full h-full object-cover opacity-80" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {a.category && <div className="font-mono text-[10px] text-purple uppercase tracking-widest mb-1">{a.category}</div>}
                  <div className="font-heading text-base font-semibold text-[#E8E4FF] group-hover:text-accent transition-colors line-clamp-1">{a.title}</div>
                </div>
                <span className="font-mono text-xs shrink-0 hidden sm:block" style={{ color: 'rgba(155,142,196,.5)' }}>
                  {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '—'}
                </span>
              </Link>
            )) : <EmptyState text="ยังไม่มีบทความ" />}
          </div>
        </div>
      </div>

      {/* NEWSLETTER */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 65% 75% at 50% 50%,rgba(124,58,237,.1) 0%,transparent 70%)' }} />
        <div className="relative z-10 max-w-lg mx-auto text-center">
          <div className="text-4xl mb-4">📬</div>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">ไม่พลาดทุก Insight<br/>ที่นำไปใช้ได้จริง</h2>
          <p className="mb-7 font-light text-lg" style={{ color: '#9B8EC4' }}>รับบทความวิเคราะห์ธุรกิจใหม่ทุกสัปดาห์<br/>สมัครฟรี · ยกเลิกได้ทุกเมื่อ</p>
          <div className="mb-3">
            <NewsletterForm compact source="home-newsletter" />
          </div>
          <div className="flex items-center justify-center gap-3 pt-5" style={{ borderTop: '1px solid rgba(124,58,237,.1)', marginTop: '1rem' }}>
            <span className="text-sm" style={{ color: '#9B8EC4' }}>หรือติดตามผ่าน Line OA</span>
            <a href="https://line.me/R/ti/p/@thinkbizlab" target="_blank" rel="noopener"
              className="inline-flex items-center gap-1.5 text-white text-sm font-semibold px-4 py-2 rounded-lg" style={{ background: '#06C755' }}>
              <LineIcon size={14} /> @thinkbizlab
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-4" style={{ borderTop: '1px solid rgba(124,58,237,.1)' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start justify-between gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-heading text-lg font-bold text-white">Think<span className="text-accent">Biz</span></span>
              <span className="font-mono text-[9px] text-accent border border-purple/40 px-1.5 py-0.5 rounded" style={{ background: 'rgba(45,27,94,.5)' }}>LAB</span>
            </div>
            <p className="font-mono text-xs leading-relaxed" style={{ color: '#9B8EC4' }}>ห้องทดลองความคิดธุรกิจ<br/>ทดลอง วิเคราะห์ แชร์ Insight ธุรกิจ</p>
          </div>
          <div className="flex gap-12">
            {[
              { title: 'เนื้อหา', links: [['บทความ','/articles'],['หมวดหมู่','/categories']] },
              { title: 'เกี่ยวกับ', links: [['เกี่ยวกับเรา','/about'],['บริการ','/services'],['ติดต่อ','/contact'],['นโยบายความเป็นส่วนตัว','/privacy'],['ข้อกำหนดการใช้งาน','/terms']] },
            ].map(col => (
              <div key={col.title}>
                <div className="font-mono text-[10px] font-bold text-purple uppercase tracking-widest mb-3">{col.title}</div>
                <ul className="space-y-2">
                  {col.links.map(([l, h]) => (
                    <li key={l}><Link href={h} className="text-sm transition-colors hover:text-accent" style={{ color: '#9B8EC4' }}>{l}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="max-w-6xl mx-auto pt-5 flex flex-col sm:flex-row items-center justify-between gap-2" style={{ borderTop: '1px solid rgba(124,58,237,.08)' }}>
          <span className="font-mono text-[11px]" style={{ color: 'rgba(155,142,196,.4)' }}>© 2025 ThinkBiz Lab · thinkbizlab.com</span>
          <a href="mailto:thinkbizlab@gmail.com" className="font-mono text-[11px] transition-colors hover:text-accent" style={{ color: 'rgba(155,142,196,.45)' }}>thinkbizlab@gmail.com</a>
        </div>
      </footer>

      {/* Floating LINE */}
      <a href="https://line.me/R/ti/p/@thinkbizlab" target="_blank" rel="noopener"
        className="fixed right-4 z-40 flex items-center gap-2 text-white text-sm font-bold px-4 py-2.5 rounded-full transition-all hover:-translate-y-1"
        style={{ bottom: '5.5rem', background: '#06C755', boxShadow: '0 4px 20px rgba(6,199,85,.4)' }}>
        <LineIcon size={15} /> Add Line
      </a>
    </div>
  )
}
