import type { Metadata } from 'next'
import { Prompt, Sarabun } from 'next/font/google'
import { SessionProvider } from '@/components/SessionProvider'
import { ClientErrorReporter } from '@/components/ClientErrorReporter'
import { db } from '@/lib/db'
import { settings } from '@/lib/schema'
import './globals.css'

const prompt = Prompt({
  subsets: ['thai', 'latin'],
  weight: ['600', '700', '800'],
  variable: '--font-prompt',
  display: 'swap',
})

const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '600'],
  variable: '--font-sarabun',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'ThinkBiz Lab — ห้องทดลองความคิดธุรกิจ', template: '%s | ThinkBiz Lab' },
  description: 'ThinkBiz Lab คลังความรู้ธุรกิจภาษาไทย วิเคราะห์และแชร์ Business Insight สำหรับ SME เจ้าของธุรกิจ นักลงทุน และผู้ที่อยากคิดแบบนักธุรกิจ',
  keywords: ['ธุรกิจ', 'SME', 'Startup', 'Business Insight', 'การลงทุน', 'ThinkBiz Lab'],
  authors: [{ name: 'ThinkBiz Lab', url: 'https://thinkbizlab.com' }],
  creator: 'ThinkBiz Lab',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thinkbizlab.com'),
  alternates: {
    types: {
      'application/rss+xml': '/rss.xml',
      'application/feed+json': '/feed.json',
    },
  },
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-64x64.png', sizes: '64x64', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    siteName: 'ThinkBiz Lab',
    locale: 'th_TH',
    type: 'website',
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
}

const orgSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'ThinkBiz Lab',
  url: 'https://thinkbizlab.com',
  logo: 'https://thinkbizlab.com/brand/logo-light.svg',
  description: 'ห้องทดลองความคิดธุรกิจ — คลังความรู้ธุรกิจภาษาไทย',
  contactPoint: { '@type': 'ContactPoint', email: 'thinkbizlab@gmail.com', contactType: 'customer service' },
  sameAs: ['https://www.facebook.com/thinkbizlab', 'https://www.instagram.com/thinkbizlab'],
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Load analytics IDs from DB settings
  let gaId = '', fbPixelId = '', ttPixelId = ''
  try {
    const rows = await db.select().from(settings)
    const map = Object.fromEntries(rows.map(r => [r.key, r.value]))
    gaId = map['ga_measurement_id'] ?? ''
    fbPixelId = map['fb_pixel_id'] ?? ''
    ttPixelId = map['tiktok_pixel_id'] ?? ''
  } catch { /* ignore — analytics optional */ }

  return (
    <html lang="th" className={`${prompt.variable} ${sarabun.variable}`}>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />

        {/* Google Analytics */}
        {gaId && <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
          <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${gaId}');` }} />
        </>}

        {/* Facebook Pixel */}
        {fbPixelId && <script dangerouslySetInnerHTML={{ __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${fbPixelId}');fbq('track','PageView');` }} />}

        {/* TikTok Pixel */}
        {ttPixelId && <script dangerouslySetInnerHTML={{ __html: `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._d=ttq._d||{};ttq._d[e]=n||{};var o=document.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${ttPixelId}');ttq.page()}(window,document,'ttq');` }} />}
      </head>
      <body className="font-body antialiased">
        <SessionProvider>
          <ClientErrorReporter />
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
