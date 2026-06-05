import { NextResponse } from 'next/server'

// Returns non-secret client-side config values.
// GOOGLE_CLIENT_ID is a public identifier — not a secret.
export async function GET() {
  return NextResponse.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
    tiktokClientKey: process.env.TIKTOK_CLIENT_KEY ?? '',
    tiktokRedirectUri: process.env.TIKTOK_REDIRECT_URI ?? 'https://www.thinkbizlab.com/api/auth/tiktok/callback',
  })
}
