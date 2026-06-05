export const TOPICS = [
  { slug: 'strategy', name: 'Strategy', description: 'กลยุทธ์ธุรกิจ การเติบโต และการตัดสินใจเชิงระบบ' },
  { slug: 'finance', name: 'Finance', description: 'การเงิน กระแสเงินสด กำไร และการลงทุนสำหรับธุรกิจ' },
  { slug: 'marketing', name: 'Marketing', description: 'การตลาด แบรนด์ ลูกค้า และ growth experiments' },
  { slug: 'startup', name: 'Startup', description: 'การเริ่มต้นธุรกิจ การหา product-market fit และการ scale' },
  { slug: 'sme', name: 'SME', description: 'ความรู้สำหรับเจ้าของธุรกิจ SME และผู้ประกอบการไทย' },
  { slug: 'investment', name: 'Investment', description: 'มุมมองการลงทุน โอกาสธุรกิจ และการประเมินความเสี่ยง' },
  { slug: 'ai-tech', name: 'AI & Tech', description: 'AI เทคโนโลยี และ digital transformation สำหรับธุรกิจ' },
  { slug: 'global-case', name: 'Global Case', description: 'กรณีศึกษาธุรกิจต่างประเทศและบทเรียนที่นำมาปรับใช้ได้' },
]

export function topicBySlug(slug: string) {
  return TOPICS.find(topic => topic.slug === slug)
}
