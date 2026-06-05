import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

const requiredEnv = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'ADMIN_EMAILS',
  'ENCRYPTION_KEY',
  'NEXT_PUBLIC_SITE_URL',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_BASE_URL',
]

const optionalEnv = ['ERROR_WEBHOOK_URL', 'CRON_SECRET']

export async function GET() {
  const env = Object.fromEntries(requiredEnv.map(key => [key, Boolean(process.env[key])]))
  const optional = Object.fromEntries(optionalEnv.map(key => [key, Boolean(process.env[key])]))
  let dbOk = false
  let dbError: string | null = null

  try {
    await db.execute(sql`select 1`)
    dbOk = true
  } catch (error) {
    dbError = String(error)
  }

  const ok = dbOk && Object.values(env).every(Boolean)

  return NextResponse.json({
    ok,
    service: 'thinkbiz-app',
    time: new Date().toISOString(),
    checks: {
      database: dbOk ? { ok: true } : { ok: false, error: dbError },
      env,
      optionalEnv: optional,
    },
  }, { status: ok ? 200 : 503 })
}
