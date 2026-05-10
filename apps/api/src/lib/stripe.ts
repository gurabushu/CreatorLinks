import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

// Stripe TypeScript SDK 完全対応
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
})

// プロ垢月額プランID
export const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID!

// プラン金額定義 (円)
export const PLAN_AMOUNTS = {
  MONTHLY: 500,    // 最低¥500
  QUARTERLY: 1425, // 5%割引
  YEARLY: 5400,    // 10%割引
} as const

// スポット案件 手数料率
export const SPOT_FEE_RATE = 0.10 // 10%
