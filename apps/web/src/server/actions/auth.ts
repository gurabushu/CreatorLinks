'use server'

import bcrypt from 'bcryptjs'
import { signIn } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SignUpSchema } from '@creator-links/shared'
import { AuthError } from 'next-auth'

export type SignUpResult =
  | { success: true }
  | { success: false; error: string; field?: 'email' | 'name' | 'password' | 'general' }

export async function signUpAction(formData: FormData): Promise<SignUpResult> {
  const raw = {
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  }

  // Zod バリデーション
  const parsed = SignUpSchema.safeParse(raw)
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]
    const field = firstError?.path[0] as 'email' | 'name' | 'password' | undefined
    return { success: false, error: firstError?.message ?? '入力内容を確認してください', field }
  }

  const { name, email, password } = parsed.data

  // メールアドレス重複チェック
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return { success: false, error: 'このメールアドレスはすでに登録されています', field: 'email' }
  }

  // パスワードハッシュ化
  const passwordHash = await bcrypt.hash(password, 12)

  // ユーザー作成
  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: 'GENERAL',
      genres: [],
    },
  })

  // 作成後そのままサインイン
  try {
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    })
    return { success: true }
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: 'アカウントは作成されましたが、ログインに失敗しました。再度ログインしてください。', field: 'general' }
    }
    throw err
  }
}
