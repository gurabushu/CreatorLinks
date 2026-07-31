import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { trpcServer } from '@hono/trpc-server'
import { appRouter } from './server/routers'
import { createContext } from './server/context'

const app = new Hono()

// ミドルウェア
app.use('*', logger())
app.use(
  '/trpc/*',
  cors({
    origin: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    credentials: true,
  })
)

// tRPC ルーター
app.use(
  '/trpc/*',
  trpcServer({
    router: appRouter,
    createContext: async (opts, _c) => {
      const authHeader = opts.req.headers.get('authorization')
      return createContext(authHeader) as any
    },
  })
)

// ヘルスチェック
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// 決済 Webhook は apps/web/src/app/api/revenuecat/webhook/route.ts で受ける

// サーバー起動
const PORT = parseInt(process.env.PORT ?? '3001', 10)
serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`🚀 API server running at http://localhost:${PORT}`)
})

export default app
export type { AppRouter } from './server/routers'
