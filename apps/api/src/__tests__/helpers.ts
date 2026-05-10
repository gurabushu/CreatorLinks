// __tests__/helpers.ts — tRPC テスト用ヘルパー
import { appRouter } from '../server/routers/index.js'
import { prisma } from '../db/index.js'

// 認証済みコンテキストを生成
export function createAuthContext(overrides?: Partial<{
  id: string
  email: string
  name: string
  role: 'GENERAL' | 'PRO' | 'ADMIN'
}>) {
  return {
    prisma,
    user: {
      id: overrides?.id ?? 'user-1',
      email: overrides?.email ?? 'test@example.com',
      name: overrides?.name ?? 'テストユーザー',
      role: overrides?.role ?? 'GENERAL' as const,
    },
    session: {
      user: {
        id: overrides?.id ?? 'user-1',
        email: overrides?.email ?? 'test@example.com',
        name: overrides?.name ?? 'テストユーザー',
        role: overrides?.role ?? 'GENERAL' as const,
      },
    },
  }
}

// 未認証コンテキスト
export function createPublicContext() {
  return { prisma, user: null, session: null }
}

// tRPC caller（単体テスト用）
export function createCaller(ctx: ReturnType<typeof createAuthContext> | ReturnType<typeof createPublicContext>): ReturnType<typeof appRouter.createCaller> {
  return appRouter.createCaller(ctx as any)
}
