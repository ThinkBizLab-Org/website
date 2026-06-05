import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { neon } from '@neondatabase/serverless'
import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

loadEnv('.env.local')
loadEnv('.env.production.local')

const write = process.argv.includes('--write')
const publicBase = required('R2_PUBLIC_BASE_URL').replace(/\/+$/, '')
const sql = neon(required('DATABASE_URL'))
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${required('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: required('R2_ACCESS_KEY_ID'),
    secretAccessKey: required('R2_SECRET_ACCESS_KEY'),
  },
})

const bucket = required('R2_BUCKET_NAME')

const folders = {
  coverImage: 'articles/covers',
  igImage: 'generated/instagram',
  content: 'articles/content-images',
}

const seen = new Map()

function loadEnv(file) {
  const full = path.resolve(file)
  if (!existsSync(full)) return
  const lines = readFileSync(full, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!match) continue
    const [, key, raw] = match
    if (process.env[key]) continue
    process.env[key] = raw.replace(/^['"]|['"]$/g, '')
  }
}

function required(name) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

function isMigratable(url) {
  if (!url || !/^https?:\/\//i.test(url)) return false
  return !url.startsWith(`${publicBase}/`)
}

function extractContentUrls(html = '') {
  return [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)]
    .map(match => match[1])
    .filter(isMigratable)
}

function extensionFromContentType(contentType) {
  if (contentType.includes('jpeg')) return 'jpg'
  if (contentType.includes('png')) return 'png'
  if (contentType.includes('webp')) return 'webp'
  if (contentType.includes('gif')) return 'gif'
  if (contentType.includes('mp4')) return 'mp4'
  if (contentType.includes('quicktime')) return 'mov'
  return 'bin'
}

function cleanFilename(filename) {
  return (filename || 'file')
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'file'
}

function keyFor(folder, sourceUrl, contentType) {
  const now = new Date()
  const yyyy = String(now.getUTCFullYear())
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const parsed = new URL(sourceUrl)
  const originalName = cleanFilename(parsed.pathname.split('/').pop())
  const hasExt = /\.[a-z0-9]{2,8}$/i.test(originalName)
  const filename = hasExt ? originalName : `${originalName}.${extensionFromContentType(contentType)}`
  return `${folder}/${yyyy}/${mm}/${Date.now()}-${randomUUID()}-${filename}`
}

async function migrateUrl(url, folder) {
  if (seen.has(url)) return seen.get(url)

  if (!write) {
    const dryUrl = `${publicBase}/${folder}/YYYY/MM/<generated-key>`
    seen.set(url, dryUrl)
    return dryUrl
  }

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)

  const contentType = res.headers.get('content-type') ?? 'application/octet-stream'
  const bytes = Buffer.from(await res.arrayBuffer())
  const key = keyFor(folder, url, contentType)

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: bytes,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }))

  const newUrl = `${publicBase}/${key}`
  seen.set(url, newUrl)
  return newUrl
}

const rows = await sql`
  select id, title, cover_image, ig_image, content
  from articles
`

let scanned = 0
let changed = 0
let skipped = 0

for (const article of rows) {
  scanned += 1
  let coverImage = article.cover_image
  let igImage = article.ig_image
  let content = article.content ?? ''
  let articleChanged = false

  try {
    if (isMigratable(coverImage)) {
      const next = await migrateUrl(coverImage, folders.coverImage)
      console.log(`${write ? 'migrated' : 'would migrate'} cover: ${article.title}`)
      console.log(`  ${coverImage}`)
      console.log(`  -> ${next}`)
      coverImage = next
      articleChanged = true
    }

    if (isMigratable(igImage)) {
      const next = await migrateUrl(igImage, folders.igImage)
      console.log(`${write ? 'migrated' : 'would migrate'} IG image: ${article.title}`)
      console.log(`  ${igImage}`)
      console.log(`  -> ${next}`)
      igImage = next
      articleChanged = true
    }

    for (const url of extractContentUrls(content)) {
      const next = await migrateUrl(url, folders.content)
      console.log(`${write ? 'migrated' : 'would migrate'} content image: ${article.title}`)
      console.log(`  ${url}`)
      console.log(`  -> ${next}`)
      content = content.split(url).join(next)
      articleChanged = true
    }

    if (articleChanged) {
      changed += 1
      if (write) {
        await sql`
          update articles
          set cover_image = ${coverImage},
              ig_image = ${igImage},
              content = ${content},
              updated_at = now()
          where id = ${article.id}
        `
      }
    }
  } catch (error) {
    skipped += 1
    console.error(`skipped article ${article.id} (${article.title}):`, error)
  }
}

console.log('')
console.log(write ? 'R2 migration complete.' : 'Dry run complete. Re-run with --write to migrate and update DB.')
console.log(JSON.stringify({ scanned, changed, skipped, uniqueUrls: seen.size }, null, 2))
