import { describe, expect, it } from 'vitest'
import { diffLines, diffSnapshots, normalizeFieldValue, summarizeLineDiff } from '@/lib/article-diff'

describe('article diff', () => {
  it('normalizes scalars, arrays, and objects to comparable strings', () => {
    expect(normalizeFieldValue(null)).toBe('')
    expect(normalizeFieldValue(undefined)).toBe('')
    expect(normalizeFieldValue('hi')).toBe('hi')
    expect(normalizeFieldValue(['a', 'b'])).toBe('a\nb')
    expect(normalizeFieldValue({ q: 1 })).toBe('{"q":1}')
  })

  it('flags changed fields between two snapshots', () => {
    const fields = diffSnapshots(
      { title: 'Old', tags: ['a'], status: 'draft' },
      { title: 'New', tags: ['a'], status: 'published' },
    )
    const byField = Object.fromEntries(fields.map(field => [field.field, field]))
    expect(byField.title.changed).toBe(true)
    expect(byField.title.before).toBe('Old')
    expect(byField.title.after).toBe('New')
    expect(byField.tags.changed).toBe(false)
    expect(byField.status.changed).toBe(true)
  })

  it('produces a line diff with adds and removes', () => {
    const lines = diffLines('one\ntwo\nthree', 'one\ntwo point five\nthree')
    expect(lines).toContainEqual({ type: 'same', text: 'one' })
    expect(lines).toContainEqual({ type: 'remove', text: 'two' })
    expect(lines).toContainEqual({ type: 'add', text: 'two point five' })
    expect(lines).toContainEqual({ type: 'same', text: 'three' })
    expect(summarizeLineDiff(lines)).toEqual({ added: 1, removed: 1 })
  })

  it('handles empty before/after without phantom blank lines', () => {
    expect(diffLines('', '')).toEqual([])
    expect(summarizeLineDiff(diffLines('', 'a\nb'))).toEqual({ added: 2, removed: 0 })
    expect(summarizeLineDiff(diffLines('a\nb', ''))).toEqual({ added: 0, removed: 2 })
  })
})
