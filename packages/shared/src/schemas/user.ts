import { z } from 'zod'

// =============================================
// User Zod スキーマ
// =============================================

export const GenderSchema = z.enum(['MALE', 'FEMALE', 'NOT_SPECIFIED'])
export const SkillLevelSchema = z.enum(['HOBBY', 'SEMI_PRO', 'PRO'])
export const HeightBucketSchema = z.enum([
  'UNDER_150',
  'H150_160',
  'H160_170',
  'H170_180',
  'OVER_180',
])

export const UpdateProfileSchema = z.object({
  displayName: z
    .string()
    .max(40, 'アーティスト表示名は40文字以内')
    .transform((v) => v.trim())
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional(),
  bio: z.string().max(500, '自己紹介は500文字以内').optional(),
  genres: z.array(z.string()).min(0).max(10, 'ジャンルは10個以内'),
  gender: GenderSchema.nullable().optional(),
  heightCm: z
    .number()
    .int('身長は整数で入力してください')
    .min(100, '身長は 100〜250 cm で入力してください')
    .max(250, '身長は 100〜250 cm で入力してください')
    .nullable()
    .optional(),
  activityYears: z
    .number()
    .int('活動年数は整数で入力してください')
    .min(0, '活動年数は 0 以上で入力してください')
    .max(80, '活動年数は 80 以下で入力してください')
    .nullable()
    .optional(),
  skillLevel: SkillLevelSchema.nullable().optional(),
  instruments: z
    .array(z.string().min(1).max(30))
    .max(15, '楽器は15個以内')
    .optional()
    .default([]),
})

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>

// アカウント設定画面での名前（アカウント名）更新
export const UpdateAccountSchema = z.object({
  name: z.string().min(1, '名前は1文字以上').max(50, '名前は50文字以内'),
})
export type UpdateAccountInput = z.infer<typeof UpdateAccountSchema>

// アーティスト検索フィルタ（listArtistsAction で使用）
export const ArtistFilterSchema = z.object({
  genres: z.array(z.string()).optional(),
  q: z.string().optional(),
  gender: GenderSchema.optional(),
  skillLevel: SkillLevelSchema.optional(),
  heightBuckets: z.array(HeightBucketSchema).optional(),
  instruments: z.array(z.string()).optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(12),
})

export type ArtistFilterInput = z.infer<typeof ArtistFilterSchema>

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
