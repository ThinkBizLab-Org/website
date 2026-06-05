import type { Metadata } from 'next'
import { Navbar } from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'เกี่ยวกับเรา | ThinkBiz Lab',
  description: 'ThinkBiz Lab คือห้องทดลองความคิดธุรกิจ คลังความรู้ธุรกิจภาษาไทยสำหรับ SME Startup นักลงทุน และผู้ประกอบการ',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-dark text-white">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-20">
        <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest mb-3">ABOUT</div>
        <h1 className="font-heading text-3xl sm:text-5xl font-black tracking-tight mb-6">
          ห้องทดลองความคิดธุรกิจ
        </h1>
        <div className="space-y-5 text-muted leading-relaxed">
          <p>
            ThinkBiz Lab ทดลอง วิเคราะห์ และแชร์ Business Insight ที่นำไปใช้ได้จริง เพื่อช่วยให้ผู้ประกอบการไทยคิดเป็นระบบและตัดสินใจทางธุรกิจได้ดีขึ้น
          </p>
          <p>
            เราเขียนสำหรับ SME, startup builders, investors และคนที่อยากเข้าใจธุรกิจผ่านกรณีศึกษา กลยุทธ์ ตัวเลข และมุมมองที่ต่อยอดได้จริง
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-10">
          {[
            ['Vision', 'เป็นคลังความรู้ธุรกิจที่ดีที่สุด ที่ทุกคนเข้าถึงได้และต่อยอดได้จริง'],
            ['Mission', 'ทดลอง วิเคราะห์ และแชร์ Insight ธุรกิจที่นำไปใช้ได้จริง เพื่อให้ทุกคนคิดแบบนักธุรกิจ'],
          ].map(([title, text]) => (
            <div key={title} className="rounded-xl border p-5" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(45,27,94,.25)' }}>
              <h2 className="font-heading text-lg font-bold text-white mb-2">{title}</h2>
              <p className="text-sm text-muted leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
