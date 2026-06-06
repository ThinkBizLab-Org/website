import { DeadLetterQueuePanel } from '@/components/DeadLetterQueuePanel'

export const metadata = { title: 'Dead Letter Queue' }

export default function DeadLetterQueuePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white mb-1">Dead Letter Queue</h1>
        <p className="text-sm" style={{ color: '#9B8EC4' }}>งานที่ retry หมดแล้วยัง fail จาก social queue และ media production queue — requeue เพื่อลองใหม่ หรือ discard ทิ้ง</p>
      </div>

      <DeadLetterQueuePanel />
    </div>
  )
}
