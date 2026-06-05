import { neon } from '@neondatabase/serverless'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

loadEnv('.env.local')
loadEnv('.env.production.local')

const sql = neon(required('DATABASE_URL'))
const now = new Date()

const categories = [
  ['Strategy', 'strategy', 'กลยุทธ์ธุรกิจและการเติบโต', '#7C3AED', 10],
  ['Finance', 'finance', 'การเงิน กระแสเงินสด และการลงทุน', '#10B981', 20],
  ['Marketing', 'marketing', 'การตลาด แบรนด์ และลูกค้า', '#F59E0B', 30],
  ['AI & Tech', 'ai-tech', 'AI เทคโนโลยี และ digital transformation', '#3B82F6', 70],
]

for (const [name, slug, description, color, order] of categories) {
  await sql`
    insert into categories (name, slug, description, color, "order", updated_at)
    values (${name}, ${slug}, ${description}, ${color}, ${order}, now())
    on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        color = excluded.color,
        "order" = excluded."order",
        updated_at = now()
  `
}

const articles = [
  {
    title: 'SME ควรวาง Dashboard ธุรกิจอย่างไร?',
    slug: 'preview-sme-dashboard',
    category: 'Strategy',
    status: 'published',
    tags: ['SME', 'Dashboard', 'Strategy'],
    excerpt: 'Dashboard ที่ดีช่วยให้ SME เห็นรายได้ ต้นทุน กำไร และ cash flow ในหน้าเดียว เพื่อรีบตัดสินใจจากข้อมูลจริง',
  },
  {
    title: 'ทำไมกระแสเงินสดสำคัญกว่ากำไร?',
    slug: 'preview-cash-flow-profit',
    category: 'Finance',
    status: 'approved',
    tags: ['Finance', 'Cash Flow', 'SME'],
    excerpt: 'กำไรบอกว่าธุรกิจขายได้ แต่กระแสเงินสดบอกว่าธุรกิจอยู่รอดได้หรือไม่ โดยเฉพาะช่วงโตเร็ว',
  },
  {
    title: 'AI ช่วยทีมการตลาดเล็ก ๆ ได้ตรงไหน?',
    slug: 'preview-ai-marketing-team',
    category: 'AI & Tech',
    status: 'review',
    tags: ['AI', 'Marketing', 'Content'],
    excerpt: 'AI ช่วยทีมเล็กลดเวลางานซ้ำ เช่น research, outline, caption และ performance summary เพื่อให้มีเวลาคิดกลยุทธ์มากขึ้น',
  },
]

for (const article of articles) {
  await sql`
    insert into articles (
      title, slug, excerpt, content, category, tags, status,
      ai_summary_q, ai_summary_a, key_points, faq_json, schema_json,
      geo_score, read_time, published_at, updated_at
    )
    values (
      ${article.title},
      ${article.slug},
      ${article.excerpt},
      ${contentFor(article.title, article.excerpt)},
      ${article.category},
      ${article.tags},
      ${article.status},
      ${`${article.title} คืออะไร?`},
      ${article.excerpt},
      ${['ดูตัวเลขหลักทุกสัปดาห์', 'เลือก metric ที่ตัดสินใจได้จริง', 'ทำ dashboard ให้คนทั้งทีมอ่านง่าย']},
      ${JSON.stringify([
        { q: `${article.title} เริ่มอย่างไร?`, a: 'เริ่มจากกำหนดเป้าหมายธุรกิจและเลือกตัวเลขที่สะท้อนเป้าหมายนั้น' },
        { q: 'ต้องใช้เครื่องมือแพงไหม?', a: 'ไม่จำเป็น เริ่มจาก spreadsheet หรือ dashboard ง่าย ๆ ก่อน แล้วค่อยขยายเมื่อทีมใช้จริง' },
      ])}::jsonb,
      '{"auto":true}'::jsonb,
      82,
      4,
      ${article.status === 'published' ? now : null},
      now()
    )
    on conflict (slug) do update
    set title = excluded.title,
        excerpt = excluded.excerpt,
        content = excluded.content,
        category = excluded.category,
        tags = excluded.tags,
        status = excluded.status,
        updated_at = now()
  `
}

await sql`
  insert into subscribers (email, status, source, segment, confirmed_at, updated_at)
  values ('preview-subscriber@thinkbizlab.local', 'active', 'preview-seed', 'general', now(), now())
  on conflict (email) do update
  set status = 'active',
      source = 'preview-seed',
      segment = 'general',
      confirmed_at = coalesce(subscribers.confirmed_at, now()),
      updated_at = now()
`

console.log(JSON.stringify({ ok: true, categories: categories.length, articles: articles.length, subscribers: 1 }, null, 2))

function contentFor(title, excerpt) {
  return `<h2>${title} สำคัญอย่างไร?</h2><p>${excerpt}</p><h2>ควรเริ่มจากตัวเลขอะไร?</h2><p>เริ่มจากรายได้ ต้นทุน กำไร และ cash flow เพราะเป็นตัวเลขที่สะท้อนสุขภาพธุรกิจโดยตรง</p><h2>ใช้กับทีมเล็กได้ไหม?</h2><p>ใช้ได้ทันทีถ้าทำให้เรียบง่ายและ review เป็นประจำทุกสัปดาห์</p>`
}

function loadEnv(file) {
  const full = path.resolve(file)
  if (!existsSync(full)) return
  for (const line of readFileSync(full, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!match) continue
    const [, key, raw] = match
    if (!process.env[key]) process.env[key] = raw.replace(/^['"]|['"]$/g, '')
  }
}

function required(name) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not configured`)
  return value
}
