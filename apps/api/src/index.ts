import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { trpcServer } from '@hono/trpc-server'
import { appRouter } from './server/routers'
import { createContext } from './server/context'
import { stripe } from './lib/stripe'
import { prisma } from './db'

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

// Stripe Webhook
app.post('/api/webhooks/stripe', async (c) => {
  const body = await c.req.text()
  const sig = c.req.header('stripe-signature')

  if (!sig) {
    return c.json({ error: 'Missing stripe signature' }, 400)
  }

  let event: ReturnType<typeof stripe.webhooks.constructEvent>
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return c.json({ error: 'Invalid signature' }, 400)
  }

  switch (event.type) {
    case 'invoice.payment_succeeded': {
      // PRO昇格処理
      const invoice = event.data.object
      if (invoice.customer) {
        await prisma.user.update({
          where: { stripeCustomerId: invoice.customer as string },
          data: { role: 'PRO' },
        })
      }
      break
    }

    case 'customer.subscription.deleted': {
      // PRO降格処理
      const subscription = event.data.object
      if (subscription.customer) {
        await prisma.user.update({
          where: { stripeCustomerId: subscription.customer as string },
          data: { role: 'GENERAL' },
        })
      }
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: { status: 'CANCELLED' },
      })
      break
    }

    case 'checkout.session.completed': {
      const session = event.data.object
      const meta = session.metadata ?? {}

      if (meta.type === 'pro_upgrade' && meta.userId && session.customer) {
        // PRO プラン登録完了 → stripeCustomerId 保存 + ロール昇格
        await prisma.user.update({
          where: { id: meta.userId },
          data: {
            role: 'PRO',
            stripeCustomerId: session.customer as string,
          },
        })
      } else if (meta.subscriberId && meta.targetId && session.subscription) {
        // ファン支援サブスク作成
        await prisma.subscription.create({
          data: {
            subscriberId: meta.subscriberId,
            targetId: meta.targetId,
            stripeSubscriptionId: session.subscription as string,
            plan: meta.plan as 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
            status: 'ACTIVE',
          },
        })
      }
      break
    }
  }

  return c.json({ received: true })
})

// サーバー起動
const PORT = parseInt(process.env.PORT ?? '3001', 10)
serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`🚀 API server running at http://localhost:${PORT}`)
})

export default app
export type { AppRouter } from './server/routers'
