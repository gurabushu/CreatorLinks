import { beforeEach, describe, expect, it, vi } from 'vitest'

// Prisma / auth / revalidatePath を mock。Server Action の role guard だけを
// 検証したいので DB アクセスは全てスタブ化する。
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

describe('createPortfolioAction — role guard', () => {
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
    expect(mockPortfolioCount).not.toHaveBeenCalled()
    expect(mockPortfolioCreate).not.toHaveBeenCalled()
  })

  it('Free ユーザーが上限未満ならそのまま作成に進む', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'GENERAL' } })
    mockPortfolioCount.mockResolvedValue(5)
    mockPortfolioCreate.mockResolvedValue({ id: 'p1' })
    const createPortfolioAction = await importAction()
    const result = await createPortfolioAction(validInput)
    expect(result).toEqual({ success: true })
    expect(mockPortfolioCount).toHaveBeenCalledWith({ where: { userId: 'u1' } })
    expect(mockPortfolioCreate).toHaveBeenCalled()
  })

  it('Free ユーザーが上限に達していたら PORTFOLIO_LIMIT で拒否', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'GENERAL' } })
    mockPortfolioCount.mockResolvedValue(10) // 既定 FREE_PORTFOLIO_LIMIT = 10
    const createPortfolioAction = await importAction()
    const result = await createPortfolioAction(validInput)
    expect(result.success).toBe(false)
    expect(result).toMatchObject({ code: 'PORTFOLIO_LIMIT' })
    expect(mockPortfolioCreate).not.toHaveBeenCalled()
  })

  it('PRO ユーザーは上限 check 自体スキップする（count を呼ばない）', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'PRO' } })
    mockPortfolioCreate.mockResolvedValue({ id: 'p1' })
    const createPortfolioAction = await importAction()
    const result = await createPortfolioAction(validInput)
    expect(result).toEqual({ success: true })
    expect(mockPortfolioCount).not.toHaveBeenCalled()
    expect(mockPortfolioCreate).toHaveBeenCalled()
  })

  it('無効な入力はバリデーションエラー', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'PRO' } })
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
