// __tests__/routers/user.test.ts — user ルーターのユニットテスト
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TRPCError } from '@trpc/server'
import { createCaller, createAuthContext, createPublicContext } from '../helpers.js'
import { prisma } from '../../db/index.js'

const mockPrisma = prisma as any

// ---- user.getProfile ----
describe('user.getProfile', () => {
  beforeEach(() => vi.clearAllMocks())

  it('存在するユーザーのプロフィールを返す', async () => {
    const mockUser = {
      id: 'user-1',
      name: '山田太郎',
      email: 'yamada@example.com',
      role: 'PRO',
      genres: ['音楽', '動画'],
      bio: 'シンガーソングライター',
      avatarUrl: null,
      averageRating: 4.8,
      portfolios: [],
    }
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)

    const caller = createCaller(createPublicContext())
    const result = await caller.user.getProfile({ userId: 'user-1' })

    expect(result.name).toBe('山田太郎')
    expect(result.role).toBe('PRO')
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-1' } })
    )
  })

  it('存在しないユーザーは NOT_FOUND エラーを返す', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)

    const caller = createCaller(createPublicContext())
    await expect(caller.user.getProfile({ userId: 'nonexistent' })).rejects.toThrow(
      expect.objectContaining({ code: 'NOT_FOUND' })
    )
  })
})

// ---- user.me ----
describe('user.me', () => {
  beforeEach(() => vi.clearAllMocks())

  it('認証済みユーザーの自分の情報を返す', async () => {
    const mockUser = {
      id: 'user-1',
      name: 'テストユーザー',
      email: 'test@example.com',
      role: 'GENERAL',
      genres: [],
      bio: null,
      avatarUrl: null,
      averageRating: 0,
      portfolios: [],
    }
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue(mockUser)

    const caller = createCaller(createAuthContext())
    const result = await caller.user.me()

    expect(result.id).toBe('user-1')
    expect(result.email).toBe('test@example.com')
  })

  it('未認証の場合は UNAUTHORIZED エラーを返す', async () => {
    const caller = createCaller(createPublicContext())
    await expect(caller.user.me()).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' })
    )
  })
})

// ---- user.updateProfile ----
describe('user.updateProfile', () => {
  beforeEach(() => vi.clearAllMocks())

  it('プロフィールを更新できる', async () => {
    const updatedUser = {
      id: 'user-1',
      name: '更新後の名前',
      bio: '更新後の自己紹介',
      genres: ['音楽'],
    }
    mockPrisma.user.update.mockResolvedValue(updatedUser)

    const caller = createCaller(createAuthContext())
    const result = await caller.user.updateProfile({
      name: '更新後の名前',
      bio: '更新後の自己紹介',
      genres: ['音楽'],
    })

    expect(result.name).toBe('更新後の名前')
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({ name: '更新後の名前' }),
      })
    )
  })

  it('未認証の場合は UNAUTHORIZED エラーを返す', async () => {
    const caller = createCaller(createPublicContext())
    await expect(
      caller.user.updateProfile({ name: 'テスト', genres: [] })
    ).rejects.toThrow(expect.objectContaining({ code: 'UNAUTHORIZED' }))
  })
})

// ---- user.listArtists ----
describe('user.listArtists', () => {
  beforeEach(() => vi.clearAllMocks())

  it('アーティスト一覧を返す', async () => {
    const mockArtists = [
      { id: 'a1', name: 'アーティスト1', role: 'PRO', genres: ['音楽'] },
      { id: 'a2', name: 'アーティスト2', role: 'GENERAL', genres: ['イラスト'] },
    ]
    mockPrisma.user.findMany.mockResolvedValue(mockArtists)

    const caller = createCaller(createPublicContext())
    const result = await caller.user.listArtists({ limit: 20 })

    expect(result.items).toHaveLength(2)
    expect(result.nextCursor).toBeNull()
  })

  it('limit+1件取得してカーソルを設定する', async () => {
    const mockArtists = Array.from({ length: 21 }, (_, i) => ({
      id: `a${i}`, name: `アーティスト${i}`, role: 'GENERAL', genres: [],
    }))
    mockPrisma.user.findMany.mockResolvedValue(mockArtists)

    const caller = createCaller(createPublicContext())
    const result = await caller.user.listArtists({ limit: 20 })

    expect(result.items).toHaveLength(20)
    expect(result.nextCursor).toBe('a20')
  })
})
