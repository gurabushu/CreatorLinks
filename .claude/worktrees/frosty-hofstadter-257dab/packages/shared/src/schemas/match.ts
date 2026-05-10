import { z } from 'zod'

// =============================================
// Match Zod スキーマ
// =============================================

export const ApplyMatchSchema = z.object({
  projectId: z.string().cuid('有効なプロジェクトIDを指定してください'),
  message: z.string().min(1).max(1000, 'メッセージは1000文字以内').optional(),
})

export type ApplyMatchInput = z.infer<typeof ApplyMatchSchema>

export const UpdateMatchStatusSchema = z.object({
  id: z.string().cuid(),
  status: z.enum(['ACCEPTED', 'REJECTED', 'COMPLETED']),
})

export type UpdateMatchStatusInput = z.infer<typeof UpdateMatchStatusSchema>

// =============================================
// Message Zod スキーマ
// =============================================

export const SendMessageSchema = z.object({
  matchId: z.string().cuid(),
  body: z.string().min(1, 'メッセージを入力してください').max(5000, 'メッセージは5000文字以内'),
})

export type SendMessageInput = z.infer<typeof SendMessageSchema>

// =============================================
// Review Zod スキーマ
// =============================================

export const CreateReviewSchema = z.object({
  matchId: z.string().cuid(),
  score: z.number().int().min(1, '評価は1以上').max(5, '評価は5以下'),
  comment: z.string().max(1000, 'コメントは1000文字以内').optional(),
})

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>
