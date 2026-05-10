import { z } from 'zod'

// =============================================
// User Zod スキーマ
// =============================================

export const UpdateProfileSchema = z.object({
  name: z.string().min(1, '名前は1文字以上').max(50, '名前は50文字以内'),
  bio: z.string().max(500, '自己紹介は500文字以内').optional(),
  genres: z.array(z.string()).min(0).max(10, 'ジャンルは10個以内'),
})

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>

export const SignInSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上'),
})

export type SignInInput = z.infer<typeof SignInSchema>

export const SignUpSchema = z.object({
  name: z.string().min(1, '名前は1文字以上').max(50, '名前は50文字以内'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上'),
  genres: z.array(z.string()).optional().default([]),
})

export type SignUpInput = z.infer<typeof SignUpSchema>
