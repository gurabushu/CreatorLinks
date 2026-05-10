// __tests__/setup.ts — Vitest グローバルセットアップ
import { vi } from 'vitest'

// Prisma Client をモック
vi.mock('../db/index.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    match: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    message: {
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    review: {
      findFirst: vi.fn(),
      create: vi.fn(),
      aggregate: vi.fn(),
    },
    portfolio: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

// stripe をモック
vi.mock('../lib/stripe.js', () => ({
  stripe: {
    checkout: { sessions: { create: vi.fn() } },
    subscriptions: { cancel: vi.fn() },
  },
  PRO_PRICE_ID: 'price_test_pro',
  PLAN_AMOUNTS: { MONTHLY: 500, QUARTERLY: 1425, YEARLY: 5400 },
  SPOT_FEE_RATE: 0.1,
}))
