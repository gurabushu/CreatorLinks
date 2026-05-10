// __tests__/routers/schemas.test.ts — 共通 Zod スキーマのバリデーションテスト
import { describe, it, expect } from 'vitest'
import {
  SignUpSchema,
  SignInSchema,
  UpdateProfileSchema,
  CreateProjectSchema,
  ApplyMatchSchema,
  SendMessageSchema,
  CreateReviewSchema,
} from '@creator-links/shared'

// ---- SignUpSchema ----
describe('SignUpSchema', () => {
  it('正常な入力を受け入れる', () => {
    const result = SignUpSchema.safeParse({
      name: '山田太郎',
      email: 'yamada@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('メールアドレスが無効な場合は失敗する', () => {
    const result = SignUpSchema.safeParse({
      name: '山田太郎',
      email: 'not-an-email',
      password: 'password123',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toContain('email')
  })

  it('パスワードが8文字未満の場合は失敗する', () => {
    const result = SignUpSchema.safeParse({
      name: '山田太郎',
      email: 'yamada@example.com',
      password: 'short',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toContain('password')
  })

  it('名前が空の場合は失敗する', () => {
    const result = SignUpSchema.safeParse({
      name: '',
      email: 'yamada@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })
})

// ---- UpdateProfileSchema ----
describe('UpdateProfileSchema', () => {
  it('有効なプロフィールを受け入れる', () => {
    const result = UpdateProfileSchema.safeParse({
      name: '佐藤花',
      bio: 'フリーランスイラストレーター',
      genres: ['イラスト', 'デザイン'],
    })
    expect(result.success).toBe(true)
  })

  it('ジャンルが10個超の場合は失敗する', () => {
    const result = UpdateProfileSchema.safeParse({
      name: '佐藤花',
      genres: Array.from({ length: 11 }, (_, i) => `genre${i}`),
    })
    expect(result.success).toBe(false)
  })

  it('自己紹介が500文字超の場合は失敗する', () => {
    const result = UpdateProfileSchema.safeParse({
      name: '佐藤花',
      bio: 'あ'.repeat(501),
      genres: [],
    })
    expect(result.success).toBe(false)
  })
})

// ---- CreateProjectSchema ----
describe('CreateProjectSchema', () => {
  it('スポット案件を正常に作成できる', () => {
    const result = CreateProjectSchema.safeParse({
      title: 'BGM楽曲制作',
      genres: ['音楽'],
      contractType: 'SPOT',
      budget: 30000,
    })
    expect(result.success).toBe(true)
  })

  it('サブスクリプション案件を正常に作成できる', () => {
    const result = CreateProjectSchema.safeParse({
      title: 'SNSイラスト月次制作',
      genres: ['イラスト'],
      contractType: 'SUBSCRIPTION',
    })
    expect(result.success).toBe(true)
  })

  it('タイトルが空の場合は失敗する', () => {
    const result = CreateProjectSchema.safeParse({
      title: '',
      genres: ['音楽'],
      contractType: 'SPOT',
    })
    expect(result.success).toBe(false)
  })

  it('不正な契約タイプは失敗する', () => {
    const result = CreateProjectSchema.safeParse({
      title: 'テスト案件',
      genres: ['音楽'],
      contractType: 'INVALID',
    })
    expect(result.success).toBe(false)
  })

  it('予算が負数の場合は失敗する', () => {
    const result = CreateProjectSchema.safeParse({
      title: 'テスト案件',
      genres: ['音楽'],
      contractType: 'SPOT',
      budget: -1000,
    })
    expect(result.success).toBe(false)
  })
})

// ---- ApplyMatchSchema ----
describe('ApplyMatchSchema', () => {
  it('プロジェクトIDとメッセージで応募できる', () => {
    const result = ApplyMatchSchema.safeParse({
      projectId: 'project-abc',
      message: 'ぜひ担当させてください',
    })
    expect(result.success).toBe(true)
  })

  it('メッセージなしでも応募できる', () => {
    const result = ApplyMatchSchema.safeParse({
      projectId: 'project-abc',
    })
    expect(result.success).toBe(true)
  })

  it('プロジェクトIDが空の場合は失敗する', () => {
    const result = ApplyMatchSchema.safeParse({ projectId: '' })
    expect(result.success).toBe(false)
  })
})

// ---- CreateReviewSchema ----
describe('CreateReviewSchema', () => {
  it('1〜5の評価を受け入れる', () => {
    for (const score of [1, 2, 3, 4, 5]) {
      const result = CreateReviewSchema.safeParse({ matchId: 'match-1', score })
      expect(result.success).toBe(true)
    }
  })

  it('0以下の評価は失敗する', () => {
    const result = CreateReviewSchema.safeParse({ matchId: 'match-1', score: 0 })
    expect(result.success).toBe(false)
  })

  it('6以上の評価は失敗する', () => {
    const result = CreateReviewSchema.safeParse({ matchId: 'match-1', score: 6 })
    expect(result.success).toBe(false)
  })

  it('コメント付きのレビューを受け入れる', () => {
    const result = CreateReviewSchema.safeParse({
      matchId: 'match-1',
      score: 5,
      comment: '素晴らしい仕事でした',
    })
    expect(result.success).toBe(true)
  })
})

// ---- SendMessageSchema ----
describe('SendMessageSchema', () => {
  it('通常のメッセージを受け入れる', () => {
    const result = SendMessageSchema.safeParse({
      matchId: 'match-1',
      body: 'こんにちは！',
    })
    expect(result.success).toBe(true)
  })

  it('空のメッセージは失敗する', () => {
    const result = SendMessageSchema.safeParse({
      matchId: 'match-1',
      body: '',
    })
    expect(result.success).toBe(false)
  })

  it('5000文字超のメッセージは失敗する', () => {
    const result = SendMessageSchema.safeParse({
      matchId: 'match-1',
      body: 'あ'.repeat(5001),
    })
    expect(result.success).toBe(false)
  })
})
