import { z } from 'zod'

// =============================================
// Like Zod スキーマ
// =============================================

export const ToggleLikeSchema = z.object({
  targetId: z.string().cuid('有効なユーザーIDを指定してください'),
})

export type ToggleLikeInput = z.infer<typeof ToggleLikeSchema>
