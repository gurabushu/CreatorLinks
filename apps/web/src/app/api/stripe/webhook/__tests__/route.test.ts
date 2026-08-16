import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockConstructEvent,
  mockPaymentUpdateMany,
  mockUserFindUnique,
  mockUserUpdate,
  mockCheckRateLimit,
  mockProcessedEventCreate,
  mockProcessedEventDelete,
} = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
  mockPaymentUpdateMany: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockUserUpdate: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockProcessedEventCreate: vi.fn(),
  mockProcessedEventDelete: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    payment: { updateMany: mockPaymentUpdateMany },
    user: { findUnique: mockUserFindUnique, update: mockUserUpdate },
    // 冪等性ガード用の ProcessedStripeEvent。route.ts 側で create → 失敗時に delete でロールバック。
    processedStripeEvent: {
      create: mockProcessedEventCreate,
      delete: mockProcessedEventDelete,
    },
  },
}))

vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({ webhooks: { constructEvent: mockConstructEvent } }),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mockCheckRateLimit,
  getClientIp: () => '127.0.0.1',
}))

import { POST } from '../route'

function makeRequest(body: string, sig: string | null = 'sig_valid'): Request {
  const headers = new Headers()
  headers.set('content-type', 'application/json')
  if (sig) headers.set('stripe-signature', sig)
  return new Request('http://test/api/stripe/webhook', { method: 'POST', headers, body })
}

describe('stripe webhook', () => {
  beforeEach(() => {
    mockConstructEvent.mockReset()
    mockPaymentUpdateMany.mockReset()
    mockUserFindUnique.mockReset()
    mockUserUpdate.mockReset()
    mockCheckRateLimit.mockReset()
    mockProcessedEventCreate.mockReset()
    mockProcessedEventDelete.mockReset()
    mockCheckRateLimit.mockResolvedValue({ ok: true })
    // 既定: 初出イベント（重複ではない）として通過させる
    mockProcessedEventCreate.mockResolvedValue({})
    mockProcessedEventDelete.mockResolvedValue({})
  })

  it('rate limit されたら 429（署名欠落時のみレート制限が発火）', async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ ok: false, retryAfterSec: 60 })
    // 署名なしのリクエストでレート制限パスに入る (route.ts の !signature ブロック)
    const res = await POST(makeRequest('{}', null) as never)
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('60')
  })

  it('署名ヘッダー欠落は 401', async () => {
    const res = await POST(makeRequest('{}', null) as never)
    expect(res.status).toBe(401)
  })

  it('constructEvent throw は 401', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('bad sig')
    })
    const res = await POST(makeRequest('{}') as never)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('invalid signature')
  })

  it('payment_intent.succeeded: AWAITING のみ HELD に遷移（冪等性）', async () => {
    mockConstructEvent.mockReturnValue({
      // event.id は ProcessedStripeEvent の冪等性ガードで参照される
      id: 'evt_1',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_1',
          metadata: { paymentId: 'pay_1' },
          latest_charge: 'ch_1',
        },
      },
    })
    mockPaymentUpdateMany.mockResolvedValue({ count: 1 })

    const res = await POST(makeRequest('{}') as never)
    expect(res.status).toBe(200)
    // 実装は 2 段の updateMany を撃つ:
    //   1. charge_id / pi_id を埋める（status 判定なし）
    //   2. status='AWAITING' のみを HELD に遷移
    expect(mockPaymentUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ stripeChargeId: 'ch_1', stripePaymentIntentId: 'pi_1' }),
      }),
    )
    expect(mockPaymentUpdateMany).toHaveBeenCalledWith({
      where: { id: 'pay_1', status: 'AWAITING' },
      data: expect.objectContaining({ status: 'HELD' }),
    })
  })

  it('payment_intent.succeeded: paymentId metadata なしは no-op', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { metadata: {} } },
    })

    const res = await POST(makeRequest('{}') as never)
    expect(res.status).toBe(200)
    expect(mockPaymentUpdateMany).not.toHaveBeenCalled()
  })

  it('payment_intent.payment_failed: AWAITING → FAILED', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'payment_intent.payment_failed',
      data: { object: { metadata: { paymentId: 'pay_1' } } },
    })
    mockPaymentUpdateMany.mockResolvedValue({ count: 1 })

    const res = await POST(makeRequest('{}') as never)
    expect(res.status).toBe(200)
    expect(mockPaymentUpdateMany).toHaveBeenCalledWith({
      where: { id: 'pay_1', status: 'AWAITING' },
      data: expect.objectContaining({ status: 'FAILED' }),
    })
  })

  it('account.updated: charges + payouts の両立で onboarding 完了時刻を記録', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'account.updated',
      data: {
        object: { id: 'acct_1', charges_enabled: true, payouts_enabled: true },
      },
    })
    mockUserFindUnique.mockResolvedValue({ id: 'u_1', stripeOnboardingCompletedAt: null })
    mockUserUpdate.mockResolvedValue({})

    const res = await POST(makeRequest('{}') as never)
    expect(res.status).toBe(200)
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'u_1' },
      data: expect.objectContaining({
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
        stripeOnboardingCompletedAt: expect.any(Date),
      }),
    })
  })

  it('account.updated: 一度 revoked されても完了時刻は上書きしない', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'account.updated',
      data: {
        object: { id: 'acct_1', charges_enabled: false, payouts_enabled: false },
      },
    })
    mockUserFindUnique.mockResolvedValue({
      id: 'u_1',
      stripeOnboardingCompletedAt: new Date('2026-01-01'),
    })
    mockUserUpdate.mockResolvedValue({})

    await POST(makeRequest('{}') as never)
    const call = mockUserUpdate.mock.calls[0][0]
    expect(call.data.stripeOnboardingCompletedAt).toBeUndefined()
    expect(call.data.stripeChargesEnabled).toBe(false)
    expect(call.data.stripePayoutsEnabled).toBe(false)
  })

  it('account.updated: 該当 user なしは no-op', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'account.updated',
      data: { object: { id: 'acct_unknown', charges_enabled: true, payouts_enabled: true } },
    })
    mockUserFindUnique.mockResolvedValue(null)

    const res = await POST(makeRequest('{}') as never)
    expect(res.status).toBe(200)
    expect(mockUserUpdate).not.toHaveBeenCalled()
  })

  it('charge.refunded: HELD の Payment だけ REFUNDED に', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_refund_1',
      type: 'charge.refunded',
      // 実装は `refunded === true` または amount 全額返金 のとき REFUNDED に遷移する
      data: { object: { payment_intent: 'pi_1', refunded: true, amount: 1000, amount_refunded: 1000 } },
    })
    mockPaymentUpdateMany.mockResolvedValue({ count: 1 })

    const res = await POST(makeRequest('{}') as never)
    expect(res.status).toBe(200)
    expect(mockPaymentUpdateMany).toHaveBeenCalledWith({
      where: { stripePaymentIntentId: 'pi_1', status: 'HELD' },
      data: expect.objectContaining({ status: 'REFUNDED' }),
    })
  })

  it('transfer.created は no-op で 200', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'transfer.created',
      data: { object: { id: 'tr_1' } },
    })

    const res = await POST(makeRequest('{}') as never)
    expect(res.status).toBe(200)
    expect(mockPaymentUpdateMany).not.toHaveBeenCalled()
  })

  it('未対応イベントは skipped で 200', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'invoice.created',
      data: { object: {} },
    })

    const res = await POST(makeRequest('{}') as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.skipped).toBe('invoice.created')
  })

  it('内部エラーは 500（Stripe に再送させる）', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { metadata: { paymentId: 'pay_1' } } },
    })
    mockPaymentUpdateMany.mockRejectedValueOnce(new Error('db down'))

    const res = await POST(makeRequest('{}') as never)
    expect(res.status).toBe(500)
  })
})
