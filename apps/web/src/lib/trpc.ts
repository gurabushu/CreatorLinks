import { createTRPCReact } from '@trpc/react-query'
import { httpBatchLink } from '@trpc/client'
import superjson from 'superjson'
import { getSession } from 'next-auth/react'
import type { AppRouter } from '@creator-links/api'

// クライアントサイド tRPC フック
export const trpc = createTRPCReact<AppRouter>()

export function getBaseUrl() {
  // サーバーサイド: API サーバーに直接アクセス
  if (typeof window === 'undefined') {
    return process.env.API_URL ?? 'http://localhost:3001'
  }
  // クライアントサイド: Next.js の rewrites 経由でプロキシ
  return ''
}

export function getTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/trpc`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transformer: superjson as any,
        async headers() {
          // NextAuth セッションから JWT を取得して Bearer ヘッダーに付与
          const session = await getSession()
          const token = (session as { accessToken?: string } | null)?.accessToken
          return token ? { authorization: `Bearer ${token}` } : {}
        },
      }),
    ],
  })
}
