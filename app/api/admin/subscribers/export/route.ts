import { NextResponse } from 'next/server'
import { desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { subscribers } from '@/lib/schema'
import { requireAdmin } from '@/lib/api-auth'

export async function GET() {
  const { response } = await requireAdmin('admin')
  if (response) return response

  const rows = await db.select().from(subscribers).orderBy(desc(subscribers.createdAt))
  const csv = [
    ['email', 'status', 'source', 'created_at'],
    ...rows.map(row => [
      row.email ?? '',
      row.status ?? '',
      row.source ?? '',
      row.createdAt?.toISOString?.() ?? '',
    ]),
  ].map(line => line.map(escapeCsv).join(',')).join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="thinkbiz-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}

function escapeCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}
