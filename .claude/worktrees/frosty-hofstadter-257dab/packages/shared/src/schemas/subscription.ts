import { z } from 'zod'

// =============================================
// Subscription Zod スキーマ
// =============================================

export const CreateSubSchema = z.object({
  targetId: z.string().cuid('有効なアーティストIDを指定してください'),
  plan: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']),
})

export type CreateSubInput = z.infer<typeof CreateSubSchema>

// =============================================
// Portfolio Zod スキーマ
// =============================================

export const CreatePortfolioSchema = z.object({
  title: z.string().min(1, 'タイトルは1文字以上').max(100, 'タイトルは100文字以内'),
  description: z.string().max(1000, '説明は1000文字以内').optional(),
  mediaType: z.enum(['IMAGE', 'AUDIO', 'VIDEO']),
  fileKey: z.string().min(1, 'ファイルキーは必須です'),
})

export type CreatePortfolioInput = z.infer<typeof CreatePortfolioSchema>
