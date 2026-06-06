import { NotificationCenterPanel } from '@/components/NotificationCenterPanel'

export const metadata = { title: 'Notification Center' }

export default function NotificationCenterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white mb-1">Notification Center</h1>
        <p className="text-sm" style={{ color: '#9B8EC4' }}>ส่ง notification เข้า LINE / Slack / Email ตาม event เช่น dead letter (failed queue), ready for approval, published</p>
      </div>

      <NotificationCenterPanel />
    </div>
  )
}
