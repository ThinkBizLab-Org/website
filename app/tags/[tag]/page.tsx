import type { Metadata } from 'next'
import { Navbar } from '@/components/Navbar'
import { PublicArticleListing } from '@/components/PublicArticleListing'

export const dynamic = 'force-dynamic'

export function generateMetadata({ params }: { params: { tag: string } }): Metadata {
  const tag = decodeURIComponent(params.tag)
  return {
    title: `#${tag}`,
    description: `บทความ ThinkBiz Lab ที่เกี่ยวข้องกับ ${tag}`,
  }
}

export default function TagPage({ params }: { params: { tag: string } }) {
  const tag = decodeURIComponent(params.tag)
  return (
    <div className="min-h-screen bg-dark text-white">
      <Navbar />
      <PublicArticleListing
        title={`#${tag}`}
        description={`รวมบทความธุรกิจและ insight ที่เกี่ยวข้องกับ ${tag}`}
        tag={tag}
      />
    </div>
  )
}
