import { SocialQueuePanel } from '@/components/SocialQueuePanel'
import { EvergreenPanel } from '@/components/EvergreenPanel'

export const metadata = { title: 'Social Queue' }

export default function SocialQueuePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white mb-1">Social Queue</h1>
        <p className="text-sm" style={{ color: '#9B8EC4' }}>จัดการ queue และ retry งานโพสต์ LINE, Facebook, Instagram, TikTok</p>
      </div>

      <EvergreenPanel />
      <SocialQueuePanel />
    </div>
  )
}
