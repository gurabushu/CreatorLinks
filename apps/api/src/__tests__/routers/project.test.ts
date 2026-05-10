// __tests__/routers/project.test.ts — project ルーターのユニットテスト
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCaller, createAuthContext, createPublicContext } from '../helpers.js'
import { prisma } from '../../db/index.js'

const mockPrisma = prisma as any

const IDS = {
  project: 'cltest00000000000000000001',
  client:  'cltest00000000000000000002',
  user:    'cltest00000000000000000003',
}

// ---- project.list ----
describe('project.list', () => {
  beforeEach(() => vi.clearAllMocks())

  it('公開案件一覧を返す', async () => {
    const mockProjects = [
      {
        id: IDS.project,
        title: 'BGM楽曲制作',
        genres: ['音楽'],
        contractType: 'SPOT',
        status: 'OPEN',
        budget: 30000,
        client: { name: '株式会社サンプル' },
        _count: { matches: 2 },
      },
    ]
    mockPrisma.project.findMany.mockResolvedValue(mockProjects)

    const caller = createCaller(createPublicContext())
    const result = await caller.project.list({})

    expect(result.items).toHaveLength(1)
    expect(result.items[0].title).toBe('BGM楽曲制作')
  })

  it('ジャンルフィルタが適用される', async () => {
    mockPrisma.project.findMany.mockResolvedValue([])

    const caller = createCaller(createPublicContext())
    await caller.project.list({ genres: ['音楽'] })

    expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          genres: expect.objectContaining({ hasSome: ['音楽'] }),
        }),
      })
    )
  })

  it('ページネーションで次カーソルが設定される', async () => {
    const mockProjects = Array.from({ length: 11 }, (_, i) => ({
      id: `cltestproject${String(i).padStart(13, '0')}`,
      title: `案件${i}`,
      genres: [],
      contractType: 'SPOT',
      status: 'OPEN',
      client: { name: 'クライアント' },
      _count: { matches: 0 },
    }))
    mockPrisma.project.findMany.mockResolvedValue(mockProjects)

    const caller = createCaller(createPublicContext())
    const result = await caller.project.list({ limit: 10 })

    expect(result.items).toHaveLength(10)
    expect(result.nextCursor).not.toBeNull()
  })
})

// ---- project.create ----
describe('project.create', () => {
  beforeEach(() => vi.clearAllMocks())

  it('認証済みユーザーが案件を作成できる', async () => {
    const newProject = {
      id: IDS.project,
      title: '新規案件',
      genres: ['イラスト'],
      contractType: 'SPOT',
      status: 'OPEN',
      clientId: IDS.user,
    }
    mockPrisma.project.create.mockResolvedValue(newProject)

    const caller = createCaller(createAuthContext({ id: IDS.user }))
    const result = await caller.project.create({
      title: '新規案件',
      genres: ['イラスト'],
      contractType: 'SPOT',
    })

    expect(result.id).toBe(IDS.project)
    expect(mockPrisma.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: '新規案件',
          clientId: IDS.user,
        }),
      })
    )
  })

  it('未認証の場合は UNAUTHORIZED エラーを返す', async () => {
    const caller = createCaller(createPublicContext())
    await expect(
      caller.project.create({ title: 'テスト', genres: [], contractType: 'SPOT' })
    ).rejects.toThrow(expect.objectContaining({ code: 'UNAUTHORIZED' }))
  })
})

// ---- project.getById ----
describe('project.getById', () => {
  beforeEach(() => vi.clearAllMocks())

  it('存在する案件を返す', async () => {
    const mockProject = {
      id: IDS.project,
      title: 'BGM制作',
      status: 'OPEN',
      client: { id: IDS.client, name: 'クライアント' },
      matches: [],
      _count: { matches: 0 },
    }
    mockPrisma.project.findUnique.mockResolvedValue(mockProject)

    const caller = createCaller(createPublicContext())
    const result = await caller.project.getById({ id: IDS.project })

    expect(result.id).toBe(IDS.project)
    expect(result.title).toBe('BGM制作')
  })

  it('存在しない案件は NOT_FOUND エラーを返す', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null)

    const caller = createCaller(createPublicContext())
    await expect(
      caller.project.getById({ id: IDS.project })
    ).rejects.toThrow(expect.objectContaining({ code: 'NOT_FOUND' }))
  })
})

// ---- project.myProjects ----
describe('project.myProjects', () => {
  beforeEach(() => vi.clearAllMocks())

  it('自分が作成した案件一覧を返す', async () => {
    const myProjects = [
      { id: IDS.project, title: '自分の案件1', clientId: IDS.user },
    ]
    mockPrisma.project.findMany.mockResolvedValue(myProjects)

    const caller = createCaller(createAuthContext({ id: IDS.user }))
    const result = await caller.project.myProjects()

    expect(result).toHaveLength(1)
    expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clientId: IDS.user }),
      })
    )
  })

  it('未認証の場合は UNAUTHORIZED エラーを返す', async () => {
    const caller = createCaller(createPublicContext())
    await expect(caller.project.myProjects()).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' })
    )
  })
})
