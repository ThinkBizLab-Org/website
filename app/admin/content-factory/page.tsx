import { ContentFactoryDashboard } from '@/components/ContentFactoryDashboard'

export const metadata = { title: 'Content Factory' }

export default function ContentFactoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white mb-1">Content Factory</h1>
        <p className="text-sm" style={{ color: '#9B8EC4' }}>ควบคุม topic plan, draft, LINE approval, social queue, notification และ feedback loop</p>
      </div>

      <ContentFactoryDashboard />
    </div>
  )
}
