import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { runContentFactory } from '@/lib/content-factory'

export async function POST(req: Request) {
  const { response } = await requireAdmin('editor')
  if (response) return response

  const body = await req.json().catch(() => ({}))
  const limit = body.limit ? Number(body.limit) : undefined
  const result = await runContentFactory({ limit })

  return NextResponse.json(result)
}
