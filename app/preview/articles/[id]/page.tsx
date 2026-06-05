export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { articles } from '@/lib/schema'
import { Navbar } from '@/components/Navbar'
import { AISummaryBox } from '@/components/AISummaryBox'
import { renderMarkdown } from '@/lib/markdown'
import { verifyArticlePreviewToken } from '@/lib/preview-token'

function renderContent(content: string): string {
  if (content.trimStart().startsWith('<')) return content
  return renderMarkdown(content)
}

export default async function PreviewArticlePage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { token?: string }
}) {
  if (!verifyArticlePreviewToken(params.id, searchParams.token)) notFound()

  const [article] = await db.select().from(articles).where(eq(articles.id, params.id))
  if (!article) notFound()

  const faqItems = (article.faqJson as { q: string; a: string }[] | null) ?? []
  const htmlContent = article.content ? renderContent(article.content) : ''

  return (
    <div className="min-h-screen bg-dark text-white">
      <Navbar />

      <div className="pt-24 px-4">
        <div className="max-w-3xl mx-auto mb-6 rounded-xl border px-4 py-3 font-mono text-xs"
          style={{ borderColor: 'rgba(245,158,11,.35)', background: 'rgba(245,158,11,.1)', color: '#F59E0B' }}>
          PREVIEW MODE · สถานะ: {article.status ?? 'draft'} · ลิงก์นี้หมดอายุอัตโนมัติ
        </div>
      </div>

      {article.coverImage && (
        <div className="w-full" style={{ maxHeight: '480px', overflow: 'hidden' }}>
          <img src={article.coverImage} alt={article.title} className="w-full object-cover opacity-85" style={{ maxHeight: '480px' }} />
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <nav className="flex items-center gap-2 font-mono text-xs mb-8" style={{ color: 'rgba(155,142,196,.5)' }}>
          <Link href="/admin/articles" className="hover:text-accent transition-colors">Admin</Link>
          <span>/</span>
          <Link href={`/admin/articles/${article.id}`} className="hover:text-accent transition-colors">แก้ไขบทความ</Link>
        </nav>

        {article.category && (
          <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest mb-4">{article.category}</div>
        )}

        <h1 className="font-heading font-black text-white leading-tight tracking-tight mb-5" style={{ fontSize: 'clamp(1.75rem,4vw,2.75rem)' }}>
          {article.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 font-mono text-xs mb-8 pb-6" style={{ color: 'rgba(155,142,196,.6)', borderBottom: '1px solid rgba(124,58,237,.15)' }}>
          <span>อ่าน {article.readTime} นาที</span>
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {article.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 rounded text-[10px]" style={{ background: 'rgba(124,58,237,.15)', color: '#A78BFA' }}>#{tag}</span>
              ))}
            </div>
          )}
        </div>

        {article.aiSummaryQ && article.aiSummaryA && (
          <AISummaryBox question={article.aiSummaryQ} answer={article.aiSummaryA} keyPoints={article.keyPoints ?? []} />
        )}

        <article className="prose-article">
          {htmlContent
            ? <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
            : <p style={{ color: '#9B8EC4' }}>เนื้อหากำลังเตรียม...</p>}
        </article>

        {faqItems.length > 0 && (
          <section className="mt-12">
            <h2 className="font-heading text-xl font-bold text-white mb-5 pb-3" style={{ borderBottom: '1px solid rgba(124,58,237,.2)' }}>
              คำถามที่พบบ่อย (FAQ)
            </h2>
            <div className="space-y-4">
              {faqItems.map((item, i) => (
                <details key={i} className="group rounded-xl border p-4 cursor-pointer" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(45,27,94,.25)' }}>
                  <summary className="font-heading font-semibold text-white text-base list-none flex items-center justify-between gap-3">
                    {item.q}
                    <span className="text-accent text-lg shrink-0">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: '#C4B5FD' }}>{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
