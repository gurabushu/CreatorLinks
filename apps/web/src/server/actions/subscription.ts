'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe, PRO_PRICE_ID, PLAN_AMOUNTS } from '@/lib/stripe'

const APP_URL = process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000'

export async function createProCheckoutAction(): Promise<
  { success: true; checkoutUrl: string } | { success: false; error: string }
> {
  if (!stripe) return { success: false, error: 'Stripe が設定されていません' }

  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }
  if (session.user.role === 'PRO') return { success: false, error: 'すでに PRO プランです' }

  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } })
  const checkout = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: dbUser?.stripeCustomerId ?? undefined,
    line_items: [{ price: PRO_PRICE_ID, quantity: 1 }],
    success_url: `${APP_URL}/pro/subscribe?success=1`,
    cancel_url: `${APP_URL}/pro/subscribe`,
    metadata: { userId: session.user.id, type: 'pro_upgrade' },
  })

  return { success: true, checkoutUrl: checkout.url! }
}

export async function createFanSubscriptionAction(
  targetId: string,
  plan: keyof typeof PLAN_AMOUNTS
): Promise<{ success: true; checkoutUrl: string } | { success: false; error: string }> {
  if (!stripe) return { success: false, error: 'Stripe が設定されていません' }

  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }

  const [dbUser, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.user.findUnique({ where: { id: targetId }, select: { name: true, role: true } }),
  ])

  if (!target) return { success: false, error: 'アーティストが見つかりません' }
  if (target.role !== 'PRO') return { success: false, error: 'PRO アーティストのみ支援できます' }

  const checkout = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: dbUser?.stripeCustomerId ?? undefined,
    line_items: [{
      price_data: {
        currency: 'jpy',
        product_data: { name: `${target.name} へのファン支援` },
        unit_amount: PLAN_AMOUNTS[plan],
        recurring: {
          interval: plan === 'YEARLY' ? 'year' : 'month',
          interval_count: plan === 'QUARTERLY' ? 3 : 1,
        },
      },
      quantity: 1,
    }],
    success_url: `${APP_URL}/fan/${targetId}?success=1`,
    cancel_url: `${APP_URL}/fan/${targetId}`,
    metadata: { subscriberId: session.user.id, targetId, plan },
  })

  return { success: true, checkoutUrl: checkout.url! }
}
