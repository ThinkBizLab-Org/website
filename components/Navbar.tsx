import Link from 'next/link'

const FlaskIcon = () => (
  <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
    <rect x="14" y="2" width="8" height="2.5" rx="1.2" fill="#2D1B5E" stroke="#6D28D9" strokeWidth=".8"/>
    <rect x="15" y="4.5" width="6" height="8" rx="1" fill="#1E1030" stroke="#6D28D9" strokeWidth=".9"/>
    <polygon points="11,12.5 25,12.5 29.5,30 6.5,30" fill="#1E1030" stroke="#6D28D9" strokeWidth="1.1"/>
    <polygon points="11,20.5 25,20.5 29.5,30 6.5,30" fill="#5B21B6" opacity=".85"/>
    <circle cx="13.5" cy="24.5" r="2.2" fill="#A78BFA" opacity=".7"/>
    <circle cx="19.5" cy="22.5" r="1.6" fill="#C4B5FD" opacity=".65"/>
    <circle cx="24" cy="26" r="1.6" fill="#A78BFA" opacity=".6"/>
  </svg>
)

export function Navbar() {
  return (
    <>
      {/* Desktop top navbar */}
      <nav className="hidden lg:flex fixed top-0 left-0 right-0 z-50 items-center justify-between px-10 py-4 bg-dark/90 backdrop-blur-lg border-b border-purple/15">
        <Link href="/" className="flex items-center gap-2">
          <FlaskIcon />
          <span className="font-heading text-xl font-700 text-white tracking-tight">Think<span className="text-accent">Biz</span></span>
          <span className="font-mono text-[10px] font-bold tracking-[.25em] text-accent bg-dim border border-purple/40 px-2 py-0.5 rounded ml-1">LAB</span>
        </Link>
        <div className="flex items-center gap-8">
          {[['บทความ','/articles'],['หมวดหมู่','/categories'],['บริการ','/services'],['เกี่ยวกับ','/about']].map(([label, href]) => (
            <Link key={href} href={href} className="text-muted hover:text-accent text-sm transition-colors">{label}</Link>
          ))}
          <Link href="/search" aria-label="ค้นหา" className="text-muted hover:text-accent text-sm transition-colors">🔍</Link>
          <Link href="/contact" className="bg-purple text-white px-4 py-2 rounded-lg text-sm font-600 hover:bg-midp transition-colors">ติดต่อเรา</Link>
        </div>
      </nav>

      {/* Mobile bottom navbar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-dark/95 backdrop-blur-lg border-t border-purple/15">
        <div className="flex items-center justify-around h-16">
          {[
            ['🏠','หน้าหลัก','/'],
            ['📄','บทความ','/articles'],
            ['🔍','ค้นหา','/search'],
            ['🔧','บริการ','/services'],
            ['👤','เกี่ยวกับ','/about'],
          ].map(([icon, label, href]) => (
            <Link key={href} href={href} className="flex flex-col items-center gap-0.5 min-h-[44px] min-w-[44px] justify-center text-muted hover:text-accent transition-colors">
              <span className="text-lg">{icon}</span>
              <span className="font-body text-[10px]">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}
