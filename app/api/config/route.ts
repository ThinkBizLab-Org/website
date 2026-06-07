import { NextResponse } from 'next/server'
import { getTiktokCreds } from '@/lib/tiktok-creds'

// Returns non-secret client-side config values.
// GOOGLE_CLIENT_ID is a public identifier — not a secret.
export async function GET() {
  const tiktok = await getTiktokCreds()
  return NextResponse.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
    tiktokClientKey: tiktok.clientKey,
    tiktokRedirectUri: tiktok.redirectUri,
  })
}
