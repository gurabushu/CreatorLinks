import { z } from 'zod'

// =============================================
// Project Zod スキーマ
// =============================================

export const CreateProjectSchema = z.object({
  title: z.string().min(1, 'タイトルは1文字以上').max(100, 'タイトルは100文字以内'),
  description: z.string().max(2000, '説明は2000文字以内').optional(),
  genres: z.array(z.string()).min(1, 'ジャンルを1つ以上選択してください'),
  budget: z.number().int().positive('予算は正の整数で入力してください').optional(),
  contractType: z.enum(['SPOT', 'SUBSCRIPTION']),
})

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>

export const UpdateProjectSchema = CreateProjectSchema.partial().extend({
  status: z.enum(['OPEN', 'MATCHING', 'CLOSED']).optional(),
})

export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>

export const ProjectFilterSchema = z.object({
  genres: z.array(z.string()).optional(),
  contractType: z.enum(['SPOT', 'SUBSCRIPTION']).optional(),
  status: z.enum(['OPEN', 'MATCHING', 'CLOSED']).optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
})

export type ProjectFilterInput = z.infer<typeof ProjectFilterSchema>
