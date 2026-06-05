import { describe, expect, it, vi } from 'vitest'
import { decryptSecret, encryptSecret, isEncryptedSecret, maskSecret } from '@/lib/secrets'

describe('secret encryption', () => {
  it('round-trips encrypted secrets', () => {
    vi.stubEnv('ENCRYPTION_KEY', Buffer.alloc(32, 1).toString('base64'))
    const encrypted = encryptSecret('super-secret-token')
    expect(isEncryptedSecret(encrypted)).toBe(true)
    expect(decryptSecret(encrypted)).toBe('super-secret-token')
    expect(maskSecret(encrypted)).toBe('super-••••••••••••oken')
    vi.unstubAllEnvs()
  })

  it('keeps plaintext readable for backward compatibility', () => {
    expect(decryptSecret('plain')).toBe('plain')
  })
})
