'use server'

// 認証バッジ買切 (¥3,000) の Stripe Checkout 作成。2026-10-17 fee-only pivot で導入。
// PaymentIntent metadata に { purpose: 'verify_badge', userId } を入れ、webhook 側で
// User.isVerified=true に反映する。Payment レコードは作らない（案件決済とは別フロー）。

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CURRENCY, getStripe } from '@/lib/stripe'
import { resolveAppUrl } from '@/lib/app-url'
import { VERIFY_BADGE_PRICE_YEN } from '@/lib/verify-badge'

export async function startVerifyBadgeCheckoutAction(): Promise<never> {
  const session = await auth()
  if (!session) throw new Error('unauthorized')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, isVerified: true, isFounderExempt: true },
  })
  if (!user) throw new Error('user not found')
  if (user.isVerified) throw new Error('already verified')
  // 恩人枠はバッジが無償付与される前提。有料フローからは排除。
  if (user.isFounderExempt) throw new Error('founding supporter is exempt')

  const stripe = getStripe()
  const appUrl = resolveAppUrl()
  const checkout = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: CURRENCY,
          product_data: {
            name: 'EncoreCue 認証バッジ',
            description: '¥3,000（買切・永年）',
          },
          unit_amount: VERIFY_BADGE_PRICE_YEN,
        },
      },
    ],
    customer_email: user.email,
    payment_intent_data: {
      // webhook 側は payment_intent.metadata.purpose で分岐するので
      // PaymentIntent にも必ずコピーする（Session.metadata は PI には自動反映されない）
      metadata: { purpose: 'verify_badge', userId: session.user.id },
      receipt_email: user.email,
    },
    metadata: { purpose: 'verify_badge', userId: session.user.id },
    success_url: `${appUrl}/verify?success=1`,
    cancel_url: `${appUrl}/verify?canceled=1`,
  })

  if (!checkout.url) throw new Error('checkout url missing')
  redirect(checkout.url)
}
