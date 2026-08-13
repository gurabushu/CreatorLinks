import { z } from 'zod'

// パスワードリセット要求（メアドのみ）
export const RequestPasswordResetSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
})
export type RequestPasswordResetInput = z.infer<typeof RequestPasswordResetSchema>

// 新パスワード設定
export const ResetPasswordSchema = z.object({
  token: z.string().min(8, 'トークンが不正です'),
  newPassword: z.string().min(8, 'パスワードは8文字以上で入力してください').max(72, 'パスワードは72文字以内'),
})
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>

// メールアドレス変更要求
export const RequestEmailChangeSchema = z.object({
  newEmail: z.string().email('有効なメールアドレスを入力してください'),
})
export type RequestEmailChangeInput = z.infer<typeof RequestEmailChangeSchema>

// メールアドレス変更確認
export const ConfirmEmailChangeSchema = z.object({
  token: z.string().min(8, 'トークンが不正です'),
})
export type ConfirmEmailChangeInput = z.infer<typeof ConfirmEmailChangeSchema>

// 設定画面からのパスワード変更（ログイン中）
// currentPassword は passwordHash 未設定ユーザー（OAuth のみ経由等）向けに任意にしてある。
// 「currentPassword 必須かどうか」の最終判定はサーバー側で行う。
export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().max(72).optional(),
    newPassword: z.string().min(8, 'パスワードは8文字以上で入力してください').max(72, 'パスワードは72文字以内'),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: '確認用パスワードが一致しません',
      })
    }
  })
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>
