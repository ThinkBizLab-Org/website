const r2PublicBase = process.env.R2_PUBLIC_BASE_URL
let r2RemotePattern = null
if (r2PublicBase) {
  try {
    const parsed = new URL(r2PublicBase)
    r2RemotePattern = { protocol: parsed.protocol.replace(':', ''), hostname: parsed.hostname }
  } catch {
    r2RemotePattern = null
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: '**.unsplash.com' },
      { protocol: 'https', hostname: '**.cloudinary.com' },
      ...(r2RemotePattern ? [r2RemotePattern] : []),
    ],
    formats: ['image/avif', 'image/webp'],
  },
  // Silence dynamic server usage warnings for pages that fall back gracefully
  experimental: {},
}

export default nextConfig
