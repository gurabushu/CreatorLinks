import { beforeEach, describe, expect, it, vi } from 'vitest'

// 2026-10-17 fee-only pivot: PRO 限定ガードが撤廃された。
// 認証ガードと、入力バリデーションのみを担保する。

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

describe('createProjectTemplateAction', () => {
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

  it('GENERAL ユーザーでも作成に進む（PRO ガード撤廃）', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'GENERAL' } })
    mockTemplateCreate.mockResolvedValue({ id: 't1' })
    const createProjectTemplateAction = await importAction()
    const result = await createProjectTemplateAction(validInput)
    expect(result).toEqual({ success: true, id: 't1' })
    expect(mockTemplateCreate).toHaveBeenCalled()
  })

  it('ADMIN も作成に進む', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockTemplateCreate.mockResolvedValue({ id: 't1' })
    const createProjectTemplateAction = await importAction()
    const result = await createProjectTemplateAction(validInput)
    expect(result).toEqual({ success: true, id: 't1' })
    expect(mockTemplateCreate).toHaveBeenCalled()
  })

  it('空のテンプレ名ならバリデーションエラー', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'GENERAL' } })
    const createProjectTemplateAction = await importAction()
    const result = await createProjectTemplateAction({ ...validInput, label: '' })
    expect(result).toEqual({ success: false, error: 'テンプレ名を入力してください' })
    expect(mockTemplateCreate).not.toHaveBeenCalled()
  })
})
