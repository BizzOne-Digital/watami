import type { NextAuthConfig } from 'next-auth'

// Edge-compatible auth config — no Node.js modules here
export const authConfig: NextAuthConfig = {
  providers: [], // providers with DB calls are added in auth.ts only
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: '/admin/login',
  },
  session: {
    strategy: 'jwt',
  },
}
