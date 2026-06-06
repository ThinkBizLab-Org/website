import { getIndexNowKey } from '@/lib/search-ping'

// Serves the IndexNow key so it can be used as the payload's keyLocation,
// letting search engines verify ownership. Returns the key as plain text.
export async function GET() {
  const key = await getIndexNowKey()
  if (!key) return new Response('IndexNow key not configured', { status: 404 })
  return new Response(key, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
