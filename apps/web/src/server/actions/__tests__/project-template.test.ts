import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockAuth,
  mockTemplateCreate,
  mockRevalidatePath,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockTemplateCreate: vi.fn(),
  mockRevalidatePath: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    projectTemplate: { create: mockTemplateCreate },
  },
}))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))

const validInput = {
  label: '定番ミックス案件',
  title: 'ミックス 1 曲',
  description: 'wav 書き出し',
  genres: ['ロック'],
  budget: 50000,
  contractType: 'SPOT' as const,
  commitmentLevel: 'SEMI_PRO' as const,
}

async function importAction() {
  return (await import('../project-template')).createProjectTemplateAction
}

describe('createProjectTemplateAction — role guard', () => {
  beforeEach(() => {
    mockAuth.mockReset()
    mockTemplateCreate.mockReset()
    mockRevalidatePath.mockReset()
  })

  it('未認証はエラー', async () => {
    mockAuth.mockResolvedValue(null)
    const createProjectTemplateAction = await importAction()
    const result = await createProjectTemplateAction(validInput)
    expect(result).toEqual({ success: false, error: '認証が必要です' })
    expect(mockTemplateCreate).not.toHaveBeenCalled()
  })

  it('GENERAL (Free) は PRO_REQUIRED で拒否', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'GENERAL' } })
    const createProjectTemplateAction = await importAction()
    const result = await createProjectTemplateAction(validInput)
    expect(result.success).toBe(false)
    expect(result).toMatchObject({ code: 'PRO_REQUIRED' })
    expect(mockTemplateCreate).not.toHaveBeenCalled()
  })

  it('ADMIN は PRO ではないので拒否される（role === PRO が厳密）', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    const createProjectTemplateAction = await importAction()
    const result = await createProjectTemplateAction(validInput)
    expect(result).toMatchObject({ code: 'PRO_REQUIRED' })
    expect(mockTemplateCreate).not.toHaveBeenCalled()
  })

  it('PRO は作成に進む', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'PRO' } })
    mockTemplateCreate.mockResolvedValue({ id: 't1' })
    const createProjectTemplateAction = await importAction()
    const result = await createProjectTemplateAction(validInput)
    expect(result).toEqual({ success: true, id: 't1' })
    expect(mockTemplateCreate).toHaveBeenCalled()
  })

  it('空のテンプレ名ならバリデーションエラー（role は PRO）', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'PRO' } })
    const createProjectTemplateAction = await importAction()
    const result = await createProjectTemplateAction({ ...validInput, label: '' })
    expect(result).toEqual({ success: false, error: 'テンプレ名を入力してください' })
    expect(mockTemplateCreate).not.toHaveBeenCalled()
  })
})
