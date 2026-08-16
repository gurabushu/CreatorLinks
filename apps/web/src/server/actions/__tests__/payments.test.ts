import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockAuth,
  mockMatchFindUnique,
  mockPaymentUpsert,
  mockPaymentUpdate,
  mockPaymentUpdateMany,
  mockCreateCheckout,
  mockRetrieveCheckout,
  mockRetrievePI,
  mockReleasePayment,
  mockRedirect,
  mockRevalidatePath,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockMatchFindUnique: vi.fn(),
  mockPaymentUpsert: vi.fn(),
  mockPaymentUpdate: vi.fn(),
  mockPaymentUpdateMany: vi.fn(),
  mockCreateCheckout: vi.fn(),
  mockRetrieveCheckout: vi.fn(),
  mockRetrievePI: vi.fn(),
  mockReleasePayment: vi.fn(),
  mockRedirect: vi.fn((url: string) => {
    // Next.js の redirect と同様に throw で制御を戻す
    throw new Error(`__REDIRECT__:${url}`)
  }),
  mockRevalidatePath: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    match: { findUnique: mockMatchFindUnique },
    payment: {
      upsert: mockPaymentUpsert,
      update: mockPaymentUpdate,
      updateMany: mockPaymentUpdateMany,
    },
  },
}))

vi.mock('@/lib/stripe', async () => {
  const actual = await vi.importActual<typeof import('@/lib/stripe')>('@/lib/stripe')
  return {
    ...actual,
    getStripe: () => ({
      checkout: { sessions: { create: mockCreateCheckout, retrieve: mockRetrieveCheckout } },
      paymentIntents: { retrieve: mockRetrievePI },
    }),
  }
})

vi.mock('@/lib/payment-release', () => ({ releasePayment: mockReleasePayment }))

vi.mock('next/navigation', () => ({ redirect: mockRedirect }))

vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))

import {
  checkPaymentStatusAction,
  createCheckoutSessionAction,
  releasePaymentAction,
} from '../payments'

const authedSession = { user: { id: 'client_1' } }

const acceptedMatch = {
  id: 'match_1',
  status: 'ACCEPTED',
  project: {
    id: 'proj_1',
    clientId: 'client_1',
    title: 'ライブ演奏依頼',
    budget: 10000,
    client: { email: 'client@example.com' },
  },
  artist: { stripePayoutsEnabled: true, stripeConnectAccountId: 'acct_1' },
  payment: null,
}

describe('createCheckoutSessionAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRedirect.mockImplementation((url: string) => {
      throw new Error(`__REDIRECT__:${url}`)
    })
  })

  it('未認証は unauthorized', async () => {
    mockAuth.mockResolvedValue(null)
    await expect(createCheckoutSessionAction('match_1')).rejects.toThrow('unauthorized')
  })

  it('Match 不存在', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockMatchFindUnique.mockResolvedValue(null)
    await expect(createCheckoutSessionAction('match_1')).rejects.toThrow('match not found')
  })

  it('P2P マッチは決済不可', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockMatchFindUnique.mockResolvedValue({ ...acceptedMatch, project: null })
    await expect(createCheckoutSessionAction('match_1')).rejects.toThrow('P2P')
  })

  it('発注者本人でない → forbidden', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'someone_else' } })
    mockMatchFindUnique.mockResolvedValue(acceptedMatch)
    await expect(createCheckoutSessionAction('match_1')).rejects.toThrow('forbidden')
  })

  it('Match ACCEPTED でない場合は不可', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockMatchFindUnique.mockResolvedValue({ ...acceptedMatch, status: 'APPLIED' })
    await expect(createCheckoutSessionAction('match_1')).rejects.toThrow('支払い可能な状態')
  })

  it('budget が 0 以下は不可', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockMatchFindUnique.mockResolvedValue({
      ...acceptedMatch,
      project: { ...acceptedMatch.project, budget: 0 },
    })
    await expect(createCheckoutSessionAction('match_1')).rejects.toThrow('金額')
  })

  it('相手アーティストの Connect 未完了はブロック', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockMatchFindUnique.mockResolvedValue({
      ...acceptedMatch,
      artist: { stripePayoutsEnabled: false, stripeConnectAccountId: 'acct_1' },
    })
    await expect(createCheckoutSessionAction('match_1')).rejects.toThrow('入金設定が未完了')
  })

  it('既に HELD は二重支払い禁止', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockMatchFindUnique.mockResolvedValue({
      ...acceptedMatch,
      payment: { id: 'pay_1', status: 'HELD' },
    })
    await expect(createCheckoutSessionAction('match_1')).rejects.toThrow('既に支払い済み')
  })

  it('正常系: Payment upsert(AWAITING) + Checkout create + redirect', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockMatchFindUnique.mockResolvedValue(acceptedMatch)
    mockPaymentUpsert.mockResolvedValue({ id: 'pay_1' })
    mockCreateCheckout.mockResolvedValue({ url: 'https://checkout.stripe.com/pay/cs_1' })

    await expect(createCheckoutSessionAction('match_1')).rejects.toThrow(
      '__REDIRECT__:https://checkout.stripe.com/pay/cs_1',
    )

    expect(mockPaymentUpsert).toHaveBeenCalledWith({
      where: { matchId: 'match_1' },
      create: expect.objectContaining({
        matchId: 'match_1',
        amountYen: 10000,
        platformFeeYen: 700,
        artistPayoutYen: 9300,
        currency: 'jpy',
        status: 'AWAITING',
      }),
      update: expect.objectContaining({ status: 'AWAITING', failedAt: null }),
      select: { id: true },
    })

    const checkoutCall = mockCreateCheckout.mock.calls[0][0]
    expect(checkoutCall.mode).toBe('payment')
    expect(checkoutCall.line_items[0].price_data.unit_amount).toBe(10000)
    expect(checkoutCall.customer_email).toBe('client@example.com')
    expect(checkoutCall.payment_intent_data).toEqual({
      transfer_group: 'match_match_1',
      metadata: { paymentId: 'pay_1', matchId: 'match_1' },
      receipt_email: 'client@example.com',
    })
    expect(checkoutCall.success_url).toBe(
      'http://localhost:3000/dashboard/chat/match_1?paid=1',
    )
  })

  it('Stripe が checkout.url を返さない場合はエラー', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockMatchFindUnique.mockResolvedValue(acceptedMatch)
    mockPaymentUpsert.mockResolvedValue({ id: 'pay_1' })
    mockCreateCheckout.mockResolvedValue({ url: null })

    await expect(createCheckoutSessionAction('match_1')).rejects.toThrow('checkout url missing')
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})

describe('checkPaymentStatusAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('未認証は静かに return', async () => {
    mockAuth.mockResolvedValue(null)
    await expect(checkPaymentStatusAction('match_1')).resolves.toBeUndefined()
    expect(mockMatchFindUnique).not.toHaveBeenCalled()
  })

  it('payment なしは no-op', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockMatchFindUnique.mockResolvedValue({
      project: { clientId: 'client_1' },
      payment: null,
    })
    await checkPaymentStatusAction('match_1')
    expect(mockRetrieveCheckout).not.toHaveBeenCalled()
  })

  it('他ユーザーは no-op（情報漏洩防止）', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'someone_else' } })
    mockMatchFindUnique.mockResolvedValue({
      project: { clientId: 'client_1' },
      payment: { id: 'pay_1', status: 'AWAITING', stripeCheckoutSessionId: 'cs_1' },
    })
    await checkPaymentStatusAction('match_1')
    expect(mockRetrieveCheckout).not.toHaveBeenCalled()
  })

  it('既に HELD なら no-op', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockMatchFindUnique.mockResolvedValue({
      project: { clientId: 'client_1' },
      payment: { id: 'pay_1', status: 'HELD', stripeCheckoutSessionId: 'cs_1' },
    })
    await checkPaymentStatusAction('match_1')
    expect(mockRetrieveCheckout).not.toHaveBeenCalled()
  })

  it('stripeCheckoutSessionId が未保存なら no-op', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockMatchFindUnique.mockResolvedValue({
      project: { clientId: 'client_1' },
      payment: { id: 'pay_1', status: 'AWAITING', stripeCheckoutSessionId: null },
    })
    await checkPaymentStatusAction('match_1')
    expect(mockRetrieveCheckout).not.toHaveBeenCalled()
    expect(mockPaymentUpdateMany).not.toHaveBeenCalled()
  })

  it('PI succeeded なら HELD に更新 + revalidate', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockMatchFindUnique.mockResolvedValue({
      project: { clientId: 'client_1' },
      payment: { id: 'pay_1', status: 'AWAITING', stripeCheckoutSessionId: 'cs_1' },
    })
    // 実装は sessions.retrieve(stripeCheckoutSessionId) → paymentIntents.retrieve(piId) の順で呼ぶ
    mockRetrieveCheckout.mockResolvedValue({ payment_intent: 'pi_1' })
    mockRetrievePI.mockResolvedValue({ status: 'succeeded', latest_charge: 'ch_1', id: 'pi_1' })
    mockPaymentUpdateMany.mockResolvedValue({ count: 1 })
    mockPaymentUpdate.mockResolvedValue({})

    await checkPaymentStatusAction('match_1')

    expect(mockRetrieveCheckout).toHaveBeenCalledWith('cs_1')
    expect(mockRetrievePI).toHaveBeenCalledWith('pi_1')
    expect(mockPaymentUpdateMany).toHaveBeenCalledWith({
      where: { id: 'pay_1', status: 'AWAITING' },
      data: expect.objectContaining({ status: 'HELD' }),
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/chat/match_1')
  })

  it('PI がまだ succeeded でないなら更新しない', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockMatchFindUnique.mockResolvedValue({
      project: { clientId: 'client_1' },
      payment: { id: 'pay_1', status: 'AWAITING', stripeCheckoutSessionId: 'cs_1' },
    })
    mockRetrieveCheckout.mockResolvedValue({ payment_intent: 'pi_1' })
    mockRetrievePI.mockResolvedValue({ status: 'processing', id: 'pi_1' })

    await checkPaymentStatusAction('match_1')
    expect(mockPaymentUpdateMany).not.toHaveBeenCalled()
  })
})

describe('releasePaymentAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const heldCompletedMatch = {
    status: 'COMPLETED',
    project: { clientId: 'client_1' },
    payment: { id: 'pay_1', status: 'HELD' },
  }

  it('未認証は unauthorized 結果', async () => {
    mockAuth.mockResolvedValue(null)
    await expect(releasePaymentAction('match_1')).resolves.toEqual({
      success: false,
      error: 'unauthorized',
    })
  })

  it('他ユーザーは forbidden', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'someone_else' } })
    mockMatchFindUnique.mockResolvedValue(heldCompletedMatch)
    await expect(releasePaymentAction('match_1')).resolves.toEqual({
      success: false,
      error: 'forbidden',
    })
  })

  it('Match COMPLETED でない場合はエラー', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockMatchFindUnique.mockResolvedValue({ ...heldCompletedMatch, status: 'ACCEPTED' })
    const result = await releasePaymentAction('match_1')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch('納品完了後')
  })

  it('Payment HELD でない場合はエラー', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockMatchFindUnique.mockResolvedValue({
      ...heldCompletedMatch,
      payment: { id: 'pay_1', status: 'RELEASED' },
    })
    const result = await releasePaymentAction('match_1')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch('RELEASED')
  })

  it('正常系: releasePayment 成功 + revalidate', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockMatchFindUnique.mockResolvedValue(heldCompletedMatch)
    mockReleasePayment.mockResolvedValue({ ok: true, transferId: 'tr_1', paymentId: 'pay_1' })

    await expect(releasePaymentAction('match_1')).resolves.toEqual({ success: true })
    expect(mockReleasePayment).toHaveBeenCalledWith('pay_1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/chat/match_1')
  })

  it('releasePayment 失敗の reason はユーザー向けメッセージにマップ', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockMatchFindUnique.mockResolvedValue(heldCompletedMatch)

    mockReleasePayment.mockResolvedValueOnce({
      ok: false,
      reason: 'artist_not_connected',
      paymentId: 'pay_1',
    })
    let r = await releasePaymentAction('match_1')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error).toMatch('入金設定')

    mockReleasePayment.mockResolvedValueOnce({
      ok: false,
      reason: 'stripe_error',
      paymentId: 'pay_1',
      detail: 'card_declined',
    })
    r = await releasePaymentAction('match_1')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error).toMatch('Stripe エラー')
    if (!r.success) expect(r.error).toMatch('card_declined')

    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })
})
