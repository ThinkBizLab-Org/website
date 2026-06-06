import { BrandVoicePanel } from '@/components/BrandVoicePanel'

export const metadata = { title: 'Brand Voice' }

export default function BrandVoicePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white mb-1">Brand Voice Memory</h1>
        <p className="text-sm" style={{ color: '#9B8EC4' }}>กำหนด tone/audience/do/don&apos;t ครั้งเดียว แล้วระบบจะแนบเข้า prompt ทุกครั้งที่ AI สร้างบทความและแคปชัน</p>
      </div>

      <BrandVoicePanel />
    </div>
  )
}
