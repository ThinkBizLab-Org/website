// Field-level and line-level diffing for article revision snapshots. Pure and
// dependency-free so it can run on the server and be unit tested directly.

export type LineDiff = { type: 'same' | 'add' | 'remove'; text: string }
export type FieldDiff = { field: string; before: string; after: string; changed: boolean }

export const DIFF_FIELDS = [
  'title',
  'slug',
  'status',
  'category',
  'excerpt',
  'tags',
  'keyPoints',
  'aiSummaryQ',
  'aiSummaryA',
  'content',
] as const

export function normalizeFieldValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.map(item => String(item)).join('\n')
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function diffSnapshots(before: unknown, after: unknown, fields: readonly string[] = DIFF_FIELDS): FieldDiff[] {
  const a = (before && typeof before === 'object' ? before : {}) as Record<string, unknown>
  const b = (after && typeof after === 'object' ? after : {}) as Record<string, unknown>
  return fields.map(field => {
    const beforeValue = normalizeFieldValue(a[field])
    const afterValue = normalizeFieldValue(b[field])
    return { field, before: beforeValue, after: afterValue, changed: beforeValue !== afterValue }
  })
}

// Line-level diff via a classic LCS table. Returns one entry per line tagged as
// same / add / remove, suitable for rendering a side-aware unified diff.
export function diffLines(before: string, after: string): LineDiff[] {
  const a = before === '' ? [] : before.split('\n')
  const b = after === '' ? [] : after.split('\n')
  const m = a.length
  const n = b.length

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const out: LineDiff[] = []
  let i = 0
  let j = 0
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      out.push({ type: 'same', text: a[i] })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: 'remove', text: a[i] })
      i++
    } else {
      out.push({ type: 'add', text: b[j] })
      j++
    }
  }
  while (i < m) out.push({ type: 'remove', text: a[i++] })
  while (j < n) out.push({ type: 'add', text: b[j++] })
  return out
}

export function summarizeLineDiff(lines: LineDiff[]): { added: number; removed: number } {
  return lines.reduce(
    (acc, line) => {
      if (line.type === 'add') acc.added++
      else if (line.type === 'remove') acc.removed++
      return acc
    },
    { added: 0, removed: 0 },
  )
}
