import type { Metadata } from 'next'
import { Navbar } from '@/components/Navbar'
import { PublicArticleListing } from '@/components/PublicArticleListing'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'ThinkBiz Lab Team',
  description: 'บทความทั้งหมดจากทีม ThinkBiz Lab',
}

export default function AuthorPage() {
  return (
    <div className="min-h-screen bg-dark text-white">
      <Navbar />
      <PublicArticleListing
        title="ThinkBiz Lab Team"
        description="ทีมทดลอง วิเคราะห์ และเรียบเรียง Business Insight สำหรับ SME เจ้าของธุรกิจ นักลงทุน และคนที่อยากคิดแบบนักธุรกิจ"
      />
    </div>
  )
}
