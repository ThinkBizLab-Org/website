import { NextResponse } from 'next/server'
import { setSetting } from '@/lib/settings-store'
import { getTiktokCreds } from '@/lib/tiktok-creds'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/admin/tiktok?error=${error ?? 'no_code'}`, req.url)
    )
  }

  try {
    const { clientKey, clientSecret, redirectUri } = await getTiktokCreds()

    if (!clientKey || !clientSecret) {
      return NextResponse.redirect(new URL('/admin/tiktok?error=missing_tiktok_env', req.url))
    }

    const body = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    })

    const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
      body,
    })

    const data = await res.json()

    if (!res.ok || data.error) {
      const errDetail = encodeURIComponent(JSON.stringify(data))
      return NextResponse.redirect(
        new URL(`/admin/tiktok?error=${errDetail}`, req.url)
      )
    }

    const accessToken = data.data?.access_token ?? data.access_token
    const refreshToken = data.data?.refresh_token ?? data.refresh_token
    const expiresIn = Number(data.data?.expires_in ?? data.expires_in ?? 86400)
    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    await setSetting('tiktok_access_token', accessToken, expiresAt)
    await setSetting('tiktok_refresh_token', refreshToken)

    return NextResponse.redirect(new URL('/admin/tiktok?success=1', req.url))
  } catch (e) {
    return NextResponse.redirect(
      new URL(`/admin/tiktok?error=${String(e)}`, req.url)
    )
  }
}
