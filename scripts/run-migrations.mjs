import { neon } from '@neondatabase/serverless'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

loadEnv('.env.local')
loadEnv('.env.production.local')

const sql = neon(required('DATABASE_URL'))
const dir = path.resolve('scripts/sql')
const dryRun = !process.argv.includes('--write')

if (!existsSync(dir)) {
  console.log(JSON.stringify({ ok: true, message: 'No scripts/sql directory found' }, null, 2))
  process.exit(0)
}

if (!dryRun) {
  await ensureMigrationTable()
}

const files = readdirSync(dir).filter(file => /^\d+_.+\.sql$/.test(file)).sort()
const appliedRows = await readAppliedMigrations()
const applied = new Map(appliedRows.map(row => [row.id, row.checksum]))
const pending = []

for (const file of files) {
  const source = readFileSync(path.join(dir, file), 'utf8')
  const checksum = await sha256(source)
  const existing = applied.get(file)

  if (existing && existing !== checksum) {
    throw new Error(`Migration checksum changed after apply: ${file}`)
  }
  if (!existing) pending.push({ file, source, checksum })
}

if (dryRun) {
  console.log(JSON.stringify({ ok: true, dryRun: true, pending: pending.map(item => item.file) }, null, 2))
  process.exit(0)
}

for (const item of pending) {
  console.log(`Applying ${item.file}`)
  await sql.query('begin')
  try {
    for (const statement of splitSql(item.source)) {
      await sql.query(statement)
    }
    await sql.query('insert into schema_migrations (id, checksum) values ($1, $2)', [item.file, item.checksum])
    await sql.query('commit')
  } catch (error) {
    await sql.query('rollback')
    throw error
  }
}

console.log(JSON.stringify({ ok: true, dryRun: false, applied: pending.map(item => item.file) }, null, 2))

function splitSql(source) {
  return source
    .split(/;\s*(?:\r?\n|$)/)
    .map(statement => statement.trim())
    .filter(Boolean)
}

async function ensureMigrationTable() {
  await sql.query(`
    create table if not exists schema_migrations (
      id text primary key,
      checksum text not null,
      applied_at timestamptz default now()
    )
  `)
}

async function readAppliedMigrations() {
  const exists = await sql.query("select to_regclass('public.schema_migrations') as name")
  if (!exists[0]?.name) return []
  return sql.query('select id, checksum from schema_migrations')
}

async function sha256(value) {
  const { createHash } = await import('node:crypto')
  return createHash('sha256').update(value).digest('hex')
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
