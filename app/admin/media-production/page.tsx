import { MediaProductionQueuePanel } from '@/components/MediaProductionQueuePanel'

export const metadata = { title: 'Media Production Queue' }

export default function MediaProductionQueuePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white mb-1">Media Production Queue</h1>
        <p className="text-sm" style={{ color: '#9B8EC4' }}>ผลิต cover, Instagram image, short video แล้วบันทึกกลับเข้า article และ R2</p>
      </div>

      <MediaProductionQueuePanel />
    </div>
  )
}
