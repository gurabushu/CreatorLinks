import { z } from 'zod'

// =============================================
// Story Zod スキーマ (24h で消える一言投稿)
// =============================================

export const StoryMediaTypeSchema = z.enum(['IMAGE', 'VIDEO', 'TEXT'])
export type StoryMediaType = z.infer<typeof StoryMediaTypeSchema>

const httpsUrl = z
  .string()
  .url('URL 形式で入力してください')
  .refine((u) => /^https?:\/\//i.test(u), 'http/https の URL を指定してください')

// 背景色は "#RRGGBB" 6桁 hex のみ許可 (UI カラーピッカーの出力形式)
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'カラーコードは #RRGGBB 形式で指定してください')

// IMAGE / VIDEO は mediaUrl 必須、TEXT は body 必須。
// body は IMAGE/VIDEO でもオーバーレイ用に使えるが 200 文字まで。TEXT のときは 500 文字まで。
export const CreateStorySchema = z.discriminatedUnion('mediaType', [
  z.object({
    mediaType: z.literal('IMAGE'),
    mediaUrl: httpsUrl,
    body: z.string().max(200, 'テキストは200文字以内').optional(),
  }),
  z.object({
    mediaType: z.literal('VIDEO'),
    mediaUrl: httpsUrl,
    body: z.string().max(200, 'テキストは200文字以内').optional(),
  }),
  z.object({
    mediaType: z.literal('TEXT'),
    body: z.string().min(1, '本文を入力してください').max(500, 'テキストは500文字以内'),
    backgroundColor: hexColor.optional(),
  }),
])
export type CreateStoryInput = z.infer<typeof CreateStorySchema>

// Story 表示側で使う共通型 (server action の返却型に流用)
export type StoryListItem = {
  id: string
  mediaType: StoryMediaType
  mediaUrl: string | null
  body: string | null
  backgroundColor: string | null
  createdAt: string // ISO
  expiresAt: string // ISO
  viewedByMe: boolean
}

// author ごとのグループ (バー表示用)
export type StoryAuthorGroup = {
  author: {
    id: string
    name: string
    displayName: string | null
    avatarUrl: string | null
  }
  hasUnviewed: boolean // リング色分け判定
  stories: StoryListItem[]
}

export const STORY_TTL_HOURS = 24
