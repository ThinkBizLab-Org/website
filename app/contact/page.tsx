import type { Metadata } from 'next'
import { Navbar } from '@/components/Navbar'
import { ConsultCTA } from '@/components/ConsultCTA'

export const metadata: Metadata = {
  title: 'ติดต่อเรา | ThinkBiz Lab',
  description: 'ติดต่อ ThinkBiz Lab สำหรับงาน insight, content strategy, research และความร่วมมือทางธุรกิจ',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-dark text-white">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-20">
        <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest mb-3">CONTACT</div>
        <h1 className="font-heading text-3xl sm:text-5xl font-black tracking-tight mb-6">
          ติดต่อ ThinkBiz Lab
        </h1>
        <p className="text-muted leading-relaxed max-w-2xl mb-10">
          สนใจร่วมงาน ทำโปรเจกต์ insight หรือสอบถามบริการ ส่งข้อความหาเราได้ผ่านช่องทางด้านล่าง
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          {[
            ['Email', 'thinkbizlab@gmail.com', 'mailto:thinkbizlab@gmail.com'],
            ['LINE', '@thinkbizlab', 'https://line.me/R/ti/p/@thinkbizlab'],
            ['โทรศัพท์', '(+66) 61-465-6497', 'tel:+66614656497'],
            ['ที่อยู่', '99/29 ซ.บางแวก17 แขวงบางแวก เขตภาษีเจริญ กรุงเทพฯ 10160', null],
          ].map(([label, value, href]) => (
            <div key={label} className="rounded-xl border p-5" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(45,27,94,.25)' }}>
              <div className="font-mono text-xs text-purple uppercase tracking-widest mb-2">{label}</div>
              {href ? (
                <a href={href} className="text-white font-semibold hover:text-accent transition-colors">{value}</a>
              ) : (
                <p className="text-white font-semibold leading-relaxed">{value}</p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10">
          <ConsultCTA source="contact-page" />
        </div>
      </main>
    </div>
  )
}
