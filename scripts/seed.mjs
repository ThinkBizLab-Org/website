import { neon } from '@neondatabase/serverless'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

loadEnv('.env.local')
loadEnv('.env.production.local')

const sql = neon(required('DATABASE_URL'))

const categories = [
  ['Strategy', 'strategy', 'กลยุทธ์ธุรกิจและการเติบโต', '#7C3AED', 10],
  ['Finance', 'finance', 'การเงิน กระแสเงินสด และการลงทุน', '#10B981', 20],
  ['Marketing', 'marketing', 'การตลาด แบรนด์ และลูกค้า', '#F59E0B', 30],
  ['Startup', 'startup', 'การเริ่มต้นธุรกิจและ scale up', '#EF4444', 40],
  ['SME', 'sme', 'ความรู้สำหรับเจ้าของธุรกิจ SME', '#06B6D4', 50],
  ['Investment', 'investment', 'การลงทุนและโอกาสทางธุรกิจ', '#A78BFA', 60],
  ['AI & Tech', 'ai-tech', 'AI เทคโนโลยี และ digital transformation', '#3B82F6', 70],
  ['Global Case', 'global-case', 'กรณีศึกษาธุรกิจต่างประเทศ', '#14B8A6', 80],
]

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

const shouldCreateDemo = process.argv.includes('--demo-article')
if (shouldCreateDemo) {
  await sql`
    insert into articles (
      title, slug, excerpt, content, category, tags, status,
      ai_summary_q, ai_summary_a, key_points, faq_json, schema_json,
      geo_score, read_time, published_at, updated_at
    )
    values (
      'ทำไม SME ต้องคิดแบบนักธุรกิจ?',
      'why-sme-business-thinking',
      'SME ที่คิดแบบนักธุรกิจจะตัดสินใจจากข้อมูล เห็นกระแสเงินสดชัดขึ้น และเลือกโอกาสเติบโตได้แม่นกว่าเดิม',
      '<h2>ทำไมการคิดแบบนักธุรกิจถึงสำคัญ?</h2><p>การคิดแบบนักธุรกิจช่วยให้ SME ตัดสินใจจากข้อมูลและวัดผลได้จริง</p>',
      'SME',
      array['SME','Strategy','Business Insight'],
      'published',
      'ทำไม SME ต้องคิดแบบนักธุรกิจ?',
      'เพราะการคิดแบบนักธุรกิจช่วยให้เห็นต้นทุน รายได้ ความเสี่ยง และโอกาสเติบโตชัดขึ้น',
      array['ดูตัวเลขก่อนตัดสินใจ','วางกลยุทธ์จากลูกค้า','วัดผลทุกการทดลอง'],
      '[{"q":"SME เริ่มคิดแบบนักธุรกิจได้อย่างไร?","a":"เริ่มจากดูตัวเลขหลัก เช่น รายได้ ต้นทุน กำไร และกระแสเงินสดทุกสัปดาห์"},{"q":"ต้องใช้เครื่องมือแพงไหม?","a":"ไม่จำเป็น เริ่มจาก spreadsheet และ dashboard ง่าย ๆ ได้"}]'::jsonb,
      '{"auto":true}'::jsonb,
      80,
      3,
      now(),
      now()
    )
    on conflict (slug) do nothing
  `
}

console.log(JSON.stringify({ ok: true, categories: categories.length, demoArticle: shouldCreateDemo }, null, 2))
