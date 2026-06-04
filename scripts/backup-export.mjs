import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { neon } from '@neondatabase/serverless'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

loadEnv('.env.local')
loadEnv('.env.production.local')

const outDir = path.resolve(process.argv.find(arg => arg.startsWith('--out='))?.split('=')[1] ?? `backups/${new Date().toISOString().replace(/[:.]/g, '-')}`)
mkdirSync(outDir, { recursive: true })

const sql = neon(required('DATABASE_URL'))
const tables = ['categories', 'articles', 'settings', 'subscribers', 'audit_logs', 'publish_attempts', 'admin_users']
const summary = { outDir, tables: {}, r2Objects: 0 }

for (const table of tables) {
  try {
    const rows = await sql.query(`select * from ${table} order by 1`)
    writeFileSync(path.join(outDir, `${table}.json`), JSON.stringify(rows, null, 2))
    summary.tables[table] = rows.length
  } catch (error) {
    summary.tables[table] = { error: String(error) }
  }
}

if (hasR2Env()) {
  const objects = await listAllR2Objects()
  writeFileSync(path.join(outDir, 'r2-manifest.json'), JSON.stringify(objects, null, 2))
  summary.r2Objects = objects.length
}

writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify({
  service: 'thinkbiz-app',
  createdAt: new Date().toISOString(),
  ...summary,
}, null, 2))

console.log(JSON.stringify({ ok: true, ...summary }, null, 2))

async function listAllR2Objects() {
  const accountId = required('R2_ACCOUNT_ID')
  const bucket = required('R2_BUCKET_NAME')
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: required('R2_ACCESS_KEY_ID'),
      secretAccessKey: required('R2_SECRET_ACCESS_KEY'),
    },
  })

  const objects = []
  let ContinuationToken
  do {
    const result = await client.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken, MaxKeys: 1000 }))
    objects.push(...(result.Contents ?? []).map(item => ({
      key: item.Key,
      size: item.Size,
      lastModified: item.LastModified?.toISOString() ?? null,
      etag: item.ETag,
    })))
    ContinuationToken = result.NextContinuationToken
  } while (ContinuationToken)

  return objects
}

function hasR2Env() {
  return Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME)
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
