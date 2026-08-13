import { beforeEach, describe, expect, it, vi } from 'vitest'

// vi.mock は hoist されるため、参照する mock 関数も vi.hoisted で先に立てる
const { mockPaymentFindUnique, mockPaymentUpdate, mockTransfersCreate } = vi.hoisted(() => ({
  mockPaymentFindUnique: vi.fn(),
  mockPaymentUpdate: vi.fn(),
  mockTransfersCreate: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    payment: {
      findUnique: mockPaymentFindUnique,
      update: mockPaymentUpdate,
    },
  },
}))

vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    transfers: { create: mockTransfersCreate },
  }),
}))

import { releasePayment } from '../payment-release'

const heldPayment = {
  id: 'pay_1',
  matchId: 'match_1',
  status: 'HELD',
  artistPayoutYen: 9300,
  currency: 'jpy',
  stripeChargeId: 'ch_1',
  match: {
    artist: {
      stripeConnectAccountId: 'acct_1',
      stripePayoutsEnabled: true,
    },
  },
}

describe('releasePayment', () => {
  beforeEach(() => {
    mockPaymentFindUnique.mockReset()
    mockPaymentUpdate.mockReset()
    mockTransfersCreate.mockReset()
  })

  it('正常系: Transfer 作成 → Payment を RELEASED に更新', async () => {
    mockPaymentFindUnique.mockResolvedValue(heldPayment)
    mockTransfersCreate.mockResolvedValue({ id: 'tr_1' })
    mockPaymentUpdate.mockResolvedValue({})

    const result = await releasePayment('pay_1')

    expect(result).toEqual({ ok: true, transferId: 'tr_1', paymentId: 'pay_1' })
    expect(mockTransfersCreate).toHaveBeenCalledWith({
      amount: 9300,
      currency: 'jpy',
      destination: 'acct_1',
      transfer_group: 'match_match_1',
      source_transaction: 'ch_1',
      metadata: { paymentId: 'pay_1', matchId: 'match_1' },
    })
    expect(mockPaymentUpdate).toHaveBeenCalledWith({
      where: { id: 'pay_1' },
      data: expect.objectContaining({
        status: 'RELEASED',
        stripeTransferId: 'tr_1',
      }),
    })
  })

  it('payment_not_found: DB に存在しない', async () => {
    mockPaymentFindUnique.mockResolvedValue(null)
    const result = await releasePayment('missing')
    expect(result).toEqual({ ok: false, reason: 'payment_not_found', paymentId: 'missing' })
    expect(mockTransfersCreate).not.toHaveBeenCalled()
  })

  it('not_held: 既に RELEASED（冪等性 = 二重送金しない）', async () => {
    mockPaymentFindUnique.mockResolvedValue({ ...heldPayment, status: 'RELEASED' })
    const result = await releasePayment('pay_1')
    expect(result).toMatchObject({ ok: false, reason: 'not_held', detail: 'RELEASED' })
    expect(mockTransfersCreate).not.toHaveBeenCalled()
    expect(mockPaymentUpdate).not.toHaveBeenCalled()
  })

  it('no_charge: stripeChargeId が null', async () => {
    mockPaymentFindUnique.mockResolvedValue({ ...heldPayment, stripeChargeId: null })
    const result = await releasePayment('pay_1')
    expect(result).toMatchObject({ ok: false, reason: 'no_charge' })
    expect(mockTransfersCreate).not.toHaveBeenCalled()
  })

  it('artist_not_connected: payoutsEnabled=false', async () => {
    mockPaymentFindUnique.mockResolvedValue({
      ...heldPayment,
      match: {
        artist: { stripeConnectAccountId: 'acct_1', stripePayoutsEnabled: false },
      },
    })
    const result = await releasePayment('pay_1')
    expect(result).toMatchObject({ ok: false, reason: 'artist_not_connected' })
    expect(mockTransfersCreate).not.toHaveBeenCalled()
  })

  it('artist_not_connected: stripeConnectAccountId が null', async () => {
    mockPaymentFindUnique.mockResolvedValue({
      ...heldPayment,
      match: {
        artist: { stripeConnectAccountId: null, stripePayoutsEnabled: true },
      },
    })
    const result = await releasePayment('pay_1')
    expect(result).toMatchObject({ ok: false, reason: 'artist_not_connected' })
  })

  it('stripe_error: Transfer 作成が例外', async () => {
    mockPaymentFindUnique.mockResolvedValue(heldPayment)
    mockTransfersCreate.mockRejectedValue(new Error('insufficient funds'))
    const result = await releasePayment('pay_1')
    expect(result).toMatchObject({
      ok: false,
      reason: 'stripe_error',
      detail: 'insufficient funds',
    })
    expect(mockPaymentUpdate).not.toHaveBeenCalled()
  })
})
