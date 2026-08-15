import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { prisma } from './prisma'
import { assignEarlyBirdIfAvailable } from './early-bird'
import { SignInSchema } from '@creator-links/shared'
import type { UserRole } from '@creator-links/shared'

// NextAuth v5 (Auth.js) 設定
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),

  // JWT ストラテジー (stateless)
  session: { strategy: 'jwt' },

  providers: [
    // メール / パスワード認証（Credentials のみ）
    Credentials({
      async authorize(credentials) {
        const parsed = SignInSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        })

        if (!user || !user.passwordHash) return null
        // 退会済みユーザーはログイン不可
        if (user.deletedAt) return null

        const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as UserRole,
        }
      },
    }),
  ],

  callbacks: {
    // JWT にロール・ユーザーIDを追加
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: UserRole }).role ?? 'GENERAL'
      }
      return token
    },

    // Session にロール・ユーザーIDを追加。退会後 30 日以内のトークン持ち回りを弾く
    async session({ session, token }) {
      if (session.user) {
        // 退会検知 + 恩人枠フラグの最新値取得を同じクエリで済ませる。
        // JWT strategy のため mass invalidate 手段がなく、次アクセスで捕捉する方針。
        const id = token.id as string | undefined
        if (id) {
          const dbUser = await prisma.user
            .findUnique({
              where: { id },
              select: { deletedAt: true, isFounderExempt: true },
            })
            .catch(() => null)
          if (!dbUser || dbUser.deletedAt) {
            // Auth.js は callback から null を返すとログアウト扱い
            return null as unknown as typeof session
          }
          session.user.isFounderExempt = dbUser.isFounderExempt
        }
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
      }
      return session
    },
  },

  events: {
    // PrismaAdapter が新規ユーザーを作った直後（Google OAuth の初回サインイン）
    // 先着 30 名 PRO 永久無料スロットを割り当てる
    async createUser({ user }) {
      if (!user.id) return
      await assignEarlyBirdIfAvailable(user.id).catch(() => null)
      revalidatePath('/')
    },
  },

  pages: {
    signIn: '/auth',
    error: '/auth',
  },
})

// Next.js Session 型拡張
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: UserRole
      image?: string | null
      isFounderExempt?: boolean
    }
  }
}
