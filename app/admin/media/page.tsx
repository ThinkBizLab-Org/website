import { MediaLibrary } from '@/components/MediaLibrary'

export const metadata = { title: 'Media Library' }

export default function MediaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white mb-1">Media Library</h1>
        <p className="text-sm" style={{ color: '#9B8EC4' }}>จัดการไฟล์ Cloudflare R2 ตาม folder structure ของ production</p>
      </div>

      <MediaLibrary />
    </div>
  )
}
