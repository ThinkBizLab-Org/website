import { neon } from '@neondatabase/serverless'
import crypto from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

loadEnv('.env.local')
loadEnv('.env.production.local')

const PREFIX = 'enc:v1:'
const SECRET_KEYS = [
  'anthropic_api_key',
  'fal_api_key',
  'heygen_api_key',
  'line_channel_secret',
  'fb_page_access_token',
  'tiktok_access_token',
  'tiktok_refresh_token',
]

const write = process.argv.includes('--write')
const sql = neon(required('DATABASE_URL'))
const key = getKey()

function loadEnv(file) {
  const full = path.resolve(file)
  if (!existsSync(full)) return
  const lines = readFileSync(full, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!match) continue
    const [, name, raw] = match
    if (process.env[name]) continue
    process.env[name] = raw.replace(/^['"]|['"]$/g, '')
  }
}

function required(name) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

function getKey() {
  const raw = required('ENCRYPTION_KEY')
  try {
    const decoded = Buffer.from(raw, 'base64')
    if (decoded.length === 32) return decoded
  } catch {
    // Fall through.
  }
  return crypto.createHash('sha256').update(raw).digest()
}

function encrypt(value) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    PREFIX,
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.')
}

const rows = await sql`
  select key, value
  from settings
  where key = any(${SECRET_KEYS})
`

let encrypted = 0
let skipped = 0

for (const row of rows) {
  if (!row.value || row.value.startsWith(PREFIX)) {
    skipped += 1
    continue
  }

  encrypted += 1
  console.log(`${write ? 'encrypting' : 'would encrypt'} ${row.key}`)

  if (write) {
    await sql`
      update settings
      set value = ${encrypt(row.value)},
          updated_at = now()
      where key = ${row.key}
    `
  }
}

console.log('')
console.log(write ? 'Secret encryption complete.' : 'Dry run complete. Re-run with --write to encrypt settings secrets.')
console.log(JSON.stringify({ scanned: rows.length, encrypted, skipped }, null, 2))
