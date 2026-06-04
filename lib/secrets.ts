import crypto from 'crypto'

const PREFIX = 'enc:v1:'

function getKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) return null

  try {
    const decoded = Buffer.from(raw, 'base64')
    if (decoded.length === 32) return decoded
  } catch {
    // Fall through to hash-based key for developer convenience.
  }

  return crypto.createHash('sha256').update(raw).digest()
}

export function encryptSecret(value: string): string {
  const key = getKey()
  if (!key) return value

  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return [
    PREFIX,
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.')
}

export function decryptSecret(value: string | null | undefined): string {
  if (!value) return ''
  if (!value.startsWith(PREFIX)) return value

  const key = getKey()
  if (!key) throw new Error('ENCRYPTION_KEY is required to decrypt stored secrets')

  const [, ivRaw, tagRaw, ciphertextRaw] = value.split('.')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivRaw, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'))

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextRaw, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}

export function maskSecret(value: string): string {
  const decrypted = decryptSecret(value)
  if (!decrypted) return ''
  return decrypted.length > 8
    ? `${decrypted.slice(0, 6)}••••••••••••${decrypted.slice(-4)}`
    : '••••••••'
}

export function isEncryptedSecret(value: string | null | undefined): boolean {
  return !!value?.startsWith(PREFIX)
}
