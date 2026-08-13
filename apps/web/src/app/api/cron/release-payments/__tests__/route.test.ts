import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPaymentFindMany, mockReleasePayment } = vi.hoisted(() => ({
  mockPaymentFindMany: vi.fn(),
  mockReleasePayment: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    payment: { findMany: mockPaymentFindMany },
  },
}))

vi.mock('@/lib/payment-release', () => ({
  releasePayment: mockReleasePayment,
}))

import { GET } from '../route'
import { AUTO_RELEASE_DAYS } from '@/lib/stripe'

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://test/api/cron/release-payments', { method: 'GET', headers })
}

describe('cron/release-payments', () => {
  const originalSecret = process.env.CRON_SECRET

  beforeEach(() => {
    mockPaymentFindMany.mockReset()
    mockReleasePayment.mockReset()
  })

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = originalSecret
  })

  it('CRON_SECRET 未設定時は認証不要で走る', async () => {
    delete process.env.CRON_SECRET
    mockPaymentFindMany.mockResolvedValue([])

    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ ok: true, candidates: 0, released: 0, failures: [] })
  })

  it('CRON_SECRET 設定時は Bearer 一致必須', async () => {
    process.env.CRON_SECRET = 'super-secret'

    const bad = await GET(makeRequest({ authorization: 'Bearer wrong' }))
    expect(bad.status).toBe(401)

    const missing = await GET(makeRequest())
    expect(missing.status).toBe(401)

    mockPaymentFindMany.mockResolvedValue([])
    const ok = await GET(makeRequest({ authorization: 'Bearer super-secret' }))
    expect(ok.status).toBe(200)
  })

  it('cutoff は AUTO_RELEASE_DAYS 日前で HELD + Match COMPLETED を絞る', async () => {
    delete process.env.CRON_SECRET
    mockPaymentFindMany.mockResolvedValue([])

    await GET(makeRequest())

    expect(mockPaymentFindMany).toHaveBeenCalledTimes(1)
    const call = mockPaymentFindMany.mock.calls[0][0]
    expect(call.where.status).toBe('HELD')
    expect(call.where.match.status).toBe('COMPLETED')
    expect(call.where.match.completedAt.lte).toBeInstanceOf(Date)
    // cutoff は「今」から AUTO_RELEASE_DAYS 日前後（数百 ms 誤差許容）
    const cutoffMs = (call.where.match.completedAt.lte as Date).getTime()
    const expectedMs = Date.now() - AUTO_RELEASE_DAYS * 24 * 60 * 60 * 1000
    expect(Math.abs(cutoffMs - expectedMs)).toBeLessThan(2000)
    expect(call.take).toBe(200)
  })

  it('成功・失敗を集計して返す', async () => {
    delete process.env.CRON_SECRET
    mockPaymentFindMany.mockResolvedValue([{ id: 'pay_1' }, { id: 'pay_2' }, { id: 'pay_3' }])
    mockReleasePayment
      .mockResolvedValueOnce({ ok: true, transferId: 'tr_1', paymentId: 'pay_1' })
      .mockResolvedValueOnce({
        ok: false,
        reason: 'artist_not_connected',
        paymentId: 'pay_2',
      })
      .mockResolvedValueOnce({
        ok: false,
        reason: 'stripe_error',
        paymentId: 'pay_3',
        detail: 'network timeout',
      })

    const res = await GET(makeRequest())
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.candidates).toBe(3)
    expect(body.released).toBe(1)
    expect(body.failures).toEqual([
      { paymentId: 'pay_2', reason: 'artist_not_connected', detail: undefined },
      { paymentId: 'pay_3', reason: 'stripe_error', detail: 'network timeout' },
    ])
    expect(mockReleasePayment).toHaveBeenCalledTimes(3)
  })
})
