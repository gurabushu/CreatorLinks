// __tests__/routers/match.test.ts — match ルーターのユニットテスト
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCaller, createAuthContext, createPublicContext } from '../helpers.js'
import { prisma } from '../../db/index.js'

const mockPrisma = prisma as any

// テスト用 CUID（形式: c + 24文字）
const IDS = {
  project: 'cltest00000000000000000001',
  match:   'cltest00000000000000000002',
  artist:  'cltest00000000000000000003',
  client:  'cltest00000000000000000004',
  user:    'cltest00000000000000000005',
  review:  'cltest00000000000000000006',
}

// ---- match.apply ----
describe('match.apply', () => {
  beforeEach(() => vi.clearAllMocks())

  it('OPEN な案件に応募できる', async () => {
    const mockProject = { id: IDS.project, clientId: IDS.client, status: 'OPEN' }
    const newMatch = { id: IDS.match, projectId: IDS.project, artistId: IDS.user, status: 'APPLIED' }

    mockPrisma.project.findUnique.mockResolvedValue(mockProject)
    mockPrisma.match.findFirst.mockResolvedValue(null) // 重複なし
    mockPrisma.match.create.mockResolvedValue(newMatch)

    const caller = createCaller(createAuthContext({ id: IDS.user }))
    const result = await caller.match.apply({
      projectId: IDS.project,
      message: '担当させてください',
    })

    expect(result.status).toBe('APPLIED')
    expect(result.artistId).toBe(IDS.user)
  })

  it('自分の案件には応募できない', async () => {
    const mockProject = { id: IDS.project, clientId: IDS.user, status: 'OPEN' }
    mockPrisma.project.findUnique.mockResolvedValue(mockProject)

    const caller = createCaller(createAuthContext({ id: IDS.user }))
    await expect(
      caller.match.apply({ projectId: IDS.project })
    ).rejects.toThrow(expect.objectContaining({ code: 'BAD_REQUEST' }))
  })

  it('OPEN でない案件には応募できない', async () => {
    const mockProject = { id: IDS.project, clientId: IDS.client, status: 'CLOSED' }
    mockPrisma.project.findUnique.mockResolvedValue(mockProject)

    const caller = createCaller(createAuthContext({ id: IDS.user }))
    await expect(
      caller.match.apply({ projectId: IDS.project })
    ).rejects.toThrow(expect.objectContaining({ code: 'BAD_REQUEST' }))
  })

  it('重複応募を拒否する（CONFLICT）', async () => {
    const mockProject = { id: IDS.project, clientId: IDS.client, status: 'OPEN' }
    const existingMatch = { id: IDS.match, projectId: IDS.project, artistId: IDS.user }

    mockPrisma.project.findUnique.mockResolvedValue(mockProject)
    mockPrisma.match.findFirst.mockResolvedValue(existingMatch)

    const caller = createCaller(createAuthContext({ id: IDS.user }))
    await expect(
      caller.match.apply({ projectId: IDS.project })
    ).rejects.toThrow(expect.objectContaining({ code: 'CONFLICT' }))
  })

  it('未認証の場合は UNAUTHORIZED エラーを返す', async () => {
    const caller = createCaller(createPublicContext())
    await expect(
      caller.match.apply({ projectId: IDS.project })
    ).rejects.toThrow(expect.objectContaining({ code: 'UNAUTHORIZED' }))
  })
})

// ---- match.updateStatus ----
describe('match.updateStatus', () => {
  beforeEach(() => vi.clearAllMocks())

  it('発注者がマッチングを承認できる', async () => {
    const mockMatch = {
      id: IDS.match,
      projectId: IDS.project,
      artistId: IDS.artist,
      status: 'APPLIED',
      project: { clientId: IDS.user },
    }
    const updatedMatch = { ...mockMatch, status: 'ACCEPTED' }

    mockPrisma.match.findUnique.mockResolvedValue(mockMatch)
    mockPrisma.match.update.mockResolvedValue(updatedMatch)
    mockPrisma.project.update.mockResolvedValue({})

    const caller = createCaller(createAuthContext({ id: IDS.user }))
    const result = await caller.match.updateStatus({
      id: IDS.match,          // UpdateMatchStatusSchema は `id` フィールドを使用
      status: 'ACCEPTED',
    })

    expect(result.status).toBe('ACCEPTED')
  })

  it('他人のマッチングは承認できない', async () => {
    const mockMatch = {
      id: IDS.match,
      status: 'APPLIED',
      project: { clientId: IDS.client }, // 別ユーザーの案件
    }
    mockPrisma.match.findUnique.mockResolvedValue(mockMatch)

    const caller = createCaller(createAuthContext({ id: IDS.user }))
    await expect(
      caller.match.updateStatus({ id: IDS.match, status: 'ACCEPTED' })
    ).rejects.toThrow(expect.objectContaining({ code: 'FORBIDDEN' }))
  })

  it('APPLIED 以外のマッチングは更新できない', async () => {
    const mockMatch = {
      id: IDS.match,
      status: 'ACCEPTED', // すでに承認済み
      project: { clientId: IDS.user },
    }
    mockPrisma.match.findUnique.mockResolvedValue(mockMatch)

    const caller = createCaller(createAuthContext({ id: IDS.user }))
    await expect(
      caller.match.updateStatus({ id: IDS.match, status: 'REJECTED' })
    ).rejects.toThrow(expect.objectContaining({ code: 'BAD_REQUEST' }))
  })
})

// ---- review.create ----
describe('review.create', () => {
  beforeEach(() => vi.clearAllMocks())

  it('完了済みマッチングにレビューを投稿できる', async () => {
    const mockMatch = {
      id: IDS.match,
      status: 'COMPLETED',
      artistId: IDS.artist,
      project: { clientId: IDS.user },
    }
    mockPrisma.match.findUnique.mockResolvedValue(mockMatch)
    mockPrisma.review.findFirst.mockResolvedValue(null)
    mockPrisma.review.create.mockResolvedValue({ id: IDS.review, score: 5 })
    mockPrisma.review.aggregate.mockResolvedValue({ _avg: { score: 4.5 } })
    mockPrisma.user.update.mockResolvedValue({})

    const caller = createCaller(createAuthContext({ id: IDS.user }))
    const result = await caller.review.create({
      matchId: IDS.match,
      score: 5,
      comment: '素晴らしい仕事でした',
    })

    expect(result.score).toBe(5)
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: IDS.artist },
        data: { averageRating: 4.5 },
      })
    )
  })

  it('未完了のマッチングにはレビューできない', async () => {
    const mockMatch = {
      id: IDS.match,
      status: 'ACCEPTED',
      artistId: IDS.artist,
      project: { clientId: IDS.user },
    }
    mockPrisma.match.findUnique.mockResolvedValue(mockMatch)

    const caller = createCaller(createAuthContext({ id: IDS.user }))
    await expect(
      caller.review.create({ matchId: IDS.match, score: 5 })
    ).rejects.toThrow(expect.objectContaining({ code: 'BAD_REQUEST' }))
  })

  it('重複レビューを拒否する（CONFLICT）', async () => {
    const mockMatch = {
      id: IDS.match,
      status: 'COMPLETED',
      artistId: IDS.artist,
      project: { clientId: IDS.user },
    }
    const existingReview = { id: IDS.review, score: 4 }

    mockPrisma.match.findUnique.mockResolvedValue(mockMatch)
    mockPrisma.review.findFirst.mockResolvedValue(existingReview)

    const caller = createCaller(createAuthContext({ id: IDS.user }))
    await expect(
      caller.review.create({ matchId: IDS.match, score: 5 })
    ).rejects.toThrow(expect.objectContaining({ code: 'CONFLICT' }))
  })

  it('参加者以外はレビューできない', async () => {
    const mockMatch = {
      id: IDS.match,
      status: 'COMPLETED',
      artistId: IDS.artist,
      project: { clientId: IDS.client }, // user は参加者でない
    }
    mockPrisma.match.findUnique.mockResolvedValue(mockMatch)
    mockPrisma.review.findFirst.mockResolvedValue(null)

    const caller = createCaller(createAuthContext({ id: IDS.user }))
    await expect(
      caller.review.create({ matchId: IDS.match, score: 5 })
    ).rejects.toThrow(expect.objectContaining({ code: 'FORBIDDEN' }))
  })
})
