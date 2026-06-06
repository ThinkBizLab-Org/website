import { AiUsageDashboard } from '@/components/AiUsageDashboard'

export const metadata = { title: 'AI Cost & Usage' }

export default function AiUsagePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white mb-1">AI Cost &amp; Usage</h1>
        <p className="text-sm" style={{ color: '#9B8EC4' }}>ติดตามจำนวน generations, tokens, failed runs และ cost estimate ต่อวัน/เดือน</p>
      </div>

      <AiUsageDashboard />
    </div>
  )
}
