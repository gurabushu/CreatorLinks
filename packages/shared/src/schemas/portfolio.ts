import { z } from 'zod'

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

// 編集は title と description のみ (ファイル差し替えは「削除して追加」の明示フロー)
export const UpdatePortfolioSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1, 'タイトルは1文字以上').max(100, 'タイトルは100文字以内'),
  description: z.string().max(1000, '説明は1000文字以内').optional(),
})

export type UpdatePortfolioInput = z.infer<typeof UpdatePortfolioSchema>
