import { beforeEach, describe, expect, it, vi } from 'vitest'

// 2026-10-17 fee-only pivot: PRO 限定の上限ガードが撤廃された。
// 認証ガードと全ユーザー無制限であることを担保する。

const {
  mockAuth,
  mockPortfolioCount,
  mockPortfolioCreate,
  mockRevalidatePath,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPortfolioCount: vi.fn(),
  mockPortfolioCreate: vi.fn(),
  mockRevalidatePath: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    portfolio: {
      count: mockPortfolioCount,
      create: mockPortfolioCreate,
    },
  },
}))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))

const validInput = {
  title: 'テスト作品',
  description: 'desc',
  mediaType: 'IMAGE' as const,
  fileKey: 'uploads/x.jpg',
}

async function importAction() {
  return (await import('../portfolio')).createPortfolioAction
}

describe('createPortfolioAction', () => {
  beforeEach(() => {
    mockAuth.mockReset()
    mockPortfolioCount.mockReset()
    mockPortfolioCreate.mockReset()
    mockRevalidatePath.mockReset()
  })

  it('未認証はエラー', async () => {
    mockAuth.mockResolvedValue(null)
    const createPortfolioAction = await importAction()
    const result = await createPortfolioAction(validInput)
    expect(result).toEqual({ success: false, error: '認証が必要です' })
    expect(mockPortfolioCreate).not.toHaveBeenCalled()
  })

  it('GENERAL ユーザーでも count を呼ばず作成に進む（上限ガード撤廃）', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'GENERAL' } })
    mockPortfolioCreate.mockResolvedValue({ id: 'p1' })
    const createPortfolioAction = await importAction()
    const result = await createPortfolioAction(validInput)
    expect(result).toEqual({ success: true })
    expect(mockPortfolioCount).not.toHaveBeenCalled()
    expect(mockPortfolioCreate).toHaveBeenCalled()
  })

  it('ADMIN も作成に進む', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockPortfolioCreate.mockResolvedValue({ id: 'p1' })
    const createPortfolioAction = await importAction()
    const result = await createPortfolioAction(validInput)
    expect(result).toEqual({ success: true })
    expect(mockPortfolioCreate).toHaveBeenCalled()
  })

  it('無効な入力はバリデーションエラー', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'GENERAL' } })
    const createPortfolioAction = await importAction()
    const result = await createPortfolioAction({
      ...validInput,
      title: '', // タイトル必須
    })
    expect(result).toEqual({
      success: false,
      error: '入力内容が正しくありません',
    })
    expect(mockPortfolioCreate).not.toHaveBeenCalled()
  })
})
