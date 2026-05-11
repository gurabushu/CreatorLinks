import Stripe from 'stripe'

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia', typescript: true })
  : null

export const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID ?? ''

export const PLAN_AMOUNTS = {
  MONTHLY: 500,
  QUARTERLY: 1425,
  YEARLY: 5400,
} as const
