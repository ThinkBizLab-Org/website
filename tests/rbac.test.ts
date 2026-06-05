import { describe, expect, it } from 'vitest'
import { canRole } from '@/lib/rbac'

describe('rbac', () => {
  it('allows higher roles to perform lower-role actions', () => {
    expect(canRole('owner', 'admin')).toBe(true)
    expect(canRole('admin', 'editor')).toBe(true)
    expect(canRole('editor', 'viewer')).toBe(true)
  })

  it('blocks lower roles from privileged actions', () => {
    expect(canRole('viewer', 'editor')).toBe(false)
    expect(canRole('editor', 'admin')).toBe(false)
    expect(canRole('admin', 'owner')).toBe(false)
  })
})
