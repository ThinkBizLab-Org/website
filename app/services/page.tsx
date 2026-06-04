import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'บริการ | ThinkBiz Lab',
  description: 'บริการด้าน business insight, content strategy, market research และ digital growth สำหรับผู้ประกอบการและทีมธุรกิจ',
}

export default function ServicesPage() {
  const services = [
    ['Business Insight', 'วิเคราะห์ธุรกิจ คู่แข่ง ตลาด และโอกาสเติบโตสำหรับ SME และ startup'],
    ['Content Strategy', 'วางแผนบทความ แคมเปญ และ social content ที่เชื่อมกับเป้าหมายธุรกิจ'],
    ['Market Research', 'สรุปข้อมูลตลาด เทรนด์ และกรณีศึกษาให้อ่านง่ายและนำไปใช้ต่อได้'],
    ['GEO Content', 'ออกแบบบทความให้ตอบโจทย์ search engines และ AI answer engines'],
  ]

  return (
    <div className="min-h-screen bg-dark text-white">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-20">
        <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest mb-3">SERVICES</div>
        <h1 className="font-heading text-3xl sm:text-5xl font-black tracking-tight mb-6">
          บริการสำหรับทีมที่อยากคิดธุรกิจให้คมขึ้น
        </h1>
        <p className="text-muted leading-relaxed max-w-2xl mb-10">
          ThinkBiz Lab ช่วยเปลี่ยนข้อมูลธุรกิจให้เป็น insight ที่อ่านง่าย ใช้งานได้ และสื่อสารต่อได้ทั้งในเว็บไซต์และ social platforms
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {services.map(([title, text]) => (
            <div key={title} className="rounded-xl border p-5" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(45,27,94,.25)' }}>
              <h2 className="font-heading text-lg font-bold text-white mb-2">{title}</h2>
              <p className="text-sm text-muted leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        <Link href="/contact" className="inline-flex bg-purple text-white px-5 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
          คุยโปรเจกต์กับเรา
        </Link>
      </main>
    </div>
  )
}
