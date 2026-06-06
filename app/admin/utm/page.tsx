import { UtmCampaignPanel } from '@/components/UtmCampaignPanel'

export const metadata = { title: 'UTM Campaign Builder' }

export default function UtmCampaignPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white mb-1">UTM Campaign Builder</h1>
        <p className="text-sm" style={{ color: '#9B8EC4' }}>สร้าง UTM ต่อ platform อัตโนมัติ สำหรับแปะ link ใน social captions</p>
      </div>

      <UtmCampaignPanel />
    </div>
  )
}
