import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { PublicArticleListing } from '@/components/PublicArticleListing'
import { topicBySlug, TOPICS } from '@/lib/topics'

export const dynamic = 'force-dynamic'

export function generateStaticParams() {
  return TOPICS.map(topic => ({ slug: topic.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const topic = topicBySlug(params.slug)
  if (!topic) return { title: 'Topic' }
  return {
    title: topic.name,
    description: topic.description,
  }
}

export default function TopicPage({ params }: { params: { slug: string } }) {
  const topic = topicBySlug(params.slug)
  if (!topic) notFound()

  return (
    <div className="min-h-screen bg-dark text-white">
      <Navbar />
      <PublicArticleListing title={topic.name} description={topic.description} category={topic.name} />
    </div>
  )
}
