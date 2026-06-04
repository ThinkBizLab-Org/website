import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'

export type R2UploadKind =
  | 'article-cover'
  | 'article-content'
  | 'generated-cover'
  | 'generated-ig'
  | 'social-video'
  | 'misc'

const FOLDERS: Record<R2UploadKind, string> = {
  'article-cover': 'articles/covers',
  'article-content': 'articles/content-images',
  'generated-cover': 'generated/covers',
  'generated-ig': 'generated/instagram',
  'social-video': 'social/videos',
  misc: 'uploads/misc',
}

let client: S3Client | null = null

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

function getClient(): S3Client {
  if (!client) {
    const accountId = required('R2_ACCOUNT_ID')
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: required('R2_ACCESS_KEY_ID'),
        secretAccessKey: required('R2_SECRET_ACCESS_KEY'),
      },
    })
  }
  return client
}

function cleanFilename(filename: string): string {
  const fallback = 'file'
  const base = filename.split('/').pop()?.split('\\').pop() ?? fallback
  const cleaned = base
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  return cleaned || fallback
}

function extensionFromContentType(contentType: string): string {
  if (contentType.includes('jpeg')) return 'jpg'
  if (contentType.includes('png')) return 'png'
  if (contentType.includes('webp')) return 'webp'
  if (contentType.includes('gif')) return 'gif'
  if (contentType.includes('mp4')) return 'mp4'
  if (contentType.includes('quicktime')) return 'mov'
  return 'bin'
}

function ensureExtension(filename: string, contentType: string): string {
  if (/\.[a-z0-9]{2,8}$/i.test(filename)) return filename
  return `${filename}.${extensionFromContentType(contentType)}`
}

export function buildR2Key(kind: R2UploadKind, filename: string, now = new Date()): string {
  const yyyy = String(now.getUTCFullYear())
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const safeName = cleanFilename(filename)
  return `${FOLDERS[kind]}/${yyyy}/${mm}/${Date.now()}-${randomUUID()}-${safeName}`
}

export function getR2PublicUrl(key: string): string {
  const base = required('R2_PUBLIC_BASE_URL').replace(/\/+$/, '')
  return `${base}/${key}`
}

export async function uploadToR2({
  body,
  filename,
  contentType,
  kind = 'misc',
}: {
  body: Buffer | Uint8Array
  filename: string
  contentType: string
  kind?: R2UploadKind
}): Promise<{ key: string; url: string }> {
  const bucket = required('R2_BUCKET_NAME')
  const normalizedFilename = ensureExtension(filename, contentType)
  const key = buildR2Key(kind, normalizedFilename)

  await getClient().send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }))

  return { key, url: getR2PublicUrl(key) }
}

export function parseR2UploadKind(value: string | null): R2UploadKind {
  if (
    value === 'article-cover' ||
    value === 'article-content' ||
    value === 'generated-cover' ||
    value === 'generated-ig' ||
    value === 'social-video' ||
    value === 'misc'
  ) {
    return value
  }
  return 'misc'
}
