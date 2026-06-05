import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

// Comma-separated Gmail addresses allowed to access /admin
const ALLOWED_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)

export function isAllowedAdminEmail(email: string | null | undefined): boolean {
  if (ALLOWED_EMAILS.length === 0) return true
  return ALLOWED_EMAILS.includes(email ?? '')
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login',
    error:  '/login',
  },
  callbacks: {
    async signIn({ user }) {
      // If no allowlist is configured, allow any Google account (useful for dev)
      return isAllowedAdminEmail(user.email)
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        // Pass Google's token sub as the user id
        (session.user as typeof session.user & { id: string }).id = token.sub
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
