'use server'

import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { assignEarlyBirdIfAvailable } from '@/lib/early-bird'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { sendEmail, SITE_NAME, APP_URL } from '@/lib/resend'
import {
  SignUpSchema,
  RequestPasswordResetSchema,
  ResetPasswordSchema,
  RequestEmailChangeSchema,
  ConfirmEmailChangeSchema,
} from '@creator-links/shared'

export type SignUpResult =
  | { success: true }
  | { success: false; error: string; field?: 'email' | 'name' | 'password' | 'general' }

// ===========================================
// テスト用ゲストアカウント
// ===========================================
// サービス展開前に、登録なしでアーティストに触ってもらうための一時アカウント。
// 24 時間後に cron で自動削除される。課金 / メール送信 / メアド変更は制限。
const GUEST_EMAIL_DOMAIN = 'demo.local'

export async function signUpAsGuestAction(): Promise<
  { success: true; email: string; password: string } | { success: false; error: string }
> {
  // 衝突しないランダム ID（cuid 風）と表示名
  const shortId = crypto.randomBytes(4).toString('hex') // 8 chars
  const email = `guest_${crypto.randomBytes(8).toString('hex')}@${GUEST_EMAIL_DOMAIN}`
  const password = crypto.randomBytes(16).toString('hex') // 32 chars, クライアントへ返して signIn に使う
  const name = `ゲストアーティスト#${shortId}`

  const passwordHash = await bcrypt.hash(password, 12)

  try {
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'GENERAL',
        genres: [],
        isGuest: true,
      },
    })
  } catch {
    return { success: false, error: 'ゲストアカウントの作成に失敗しました。しばらく後で再試行してください。' }
  }

  return { success: true, email, password }
}

export async function signUpAction(formData: FormData): Promise<SignUpResult> {
  const ip = getClientIp(await headers())
  const rl = await checkRateLimit('auth', ip)
  if (!rl.ok) {
    return {
      success: false,
      error: `試行回数が多すぎます。${rl.retryAfterSec} 秒後に再試行してください`,
      field: 'general',
    }
  }

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
  let existing
  try {
    existing = await prisma.user.findUnique({ where: { email } })
  } catch {
    return { success: false, error: 'データベースに接続できません。しばらく後で再試行してください。', field: 'general' }
  }
  if (existing) {
    return { success: false, error: 'このメールアドレスはすでに登録されています', field: 'email' }
  }

  // パスワードハッシュ化
  const passwordHash = await bcrypt.hash(password, 12)

  // ユーザー作成
  let createdUserId: string
  try {
    const created = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'GENERAL',
        genres: [],
      },
      select: { id: true },
    })
    createdUserId = created.id
  } catch {
    return { success: false, error: 'アカウント作成に失敗しました。しばらく後で再試行してください。', field: 'general' }
  }

  // 先着 30 名 PRO 永久無料スロットの割当（失敗しても登録自体は成功扱い）
  await assignEarlyBirdIfAvailable(createdUserId).catch(() => null)
  // トップページの残数バナーの ISR を無効化
  revalidatePath('/')

  return { success: true }
}

// ===========================================
// パスワードリセット
// ===========================================

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24 時間

function generateToken(): { plain: string; hash: string } {
  // 32 byte = 64 hex chars
  const plain = crypto.randomBytes(32).toString('hex')
  const hash = crypto.createHash('sha256').update(plain).digest('hex')
  return { plain, hash }
}

export async function requestPasswordResetAction(
  data: { email: string },
): Promise<{ success: true }> {
  // レート制限（エニュメレーション対策と同様、成功レスポンスに揃える）
  const ip = getClientIp(await headers())
  const rl = await checkRateLimit('auth', ip)
  if (!rl.ok) return { success: true }

  // 入力検証は緩めにし、メアド存在の有無にかかわらず常に同じレスポンスを返す（エニュメレーション防止）
  const parsed = RequestPasswordResetSchema.safeParse(data)
  if (!parsed.success) return { success: true }

  const { email } = parsed.data

  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return { success: true }
    if (user.isGuest) return { success: true } // ゲストには送らない（demo.local 宛は配信不能なので Resend で失敗するため）

    const { plain, hash } = generateToken()
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS)

    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hash, expiresAt },
    })

    const link = `${APP_URL}/auth/reset?token=${encodeURIComponent(plain)}`
    await sendEmail({
      to: email,
      subject: `【${SITE_NAME}】パスワード再設定のご案内`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h1 style="color: #7c3aed; font-size: 22px; margin-bottom: 16px;">パスワード再設定</h1>
          <p>${user.name} さん、こんにちは。</p>
          <p>下記のボタンから 24 時間以内に新しいパスワードを設定してください。</p>
          <div style="margin: 24px 0;">
            <a
              href="${link}"
              style="background: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;"
            >
              パスワードを再設定する
            </a>
          </div>
          <p style="color: #6b7280; font-size: 12px;">心当たりがない場合はこのメールを破棄してください。</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">
            ${SITE_NAME} — 個人アーティストのための営業プラットフォーム
          </p>
        </div>
      `,
    })
  } catch {
    // 失敗してもレスポンスは同じ
  }

  return { success: true }
}

export async function resetPasswordAction(
  data: { token: string; newPassword: string },
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = ResetPasswordSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? '入力内容を確認してください' }
  }
  const { token, newPassword } = parsed.data

  const hash = crypto.createHash('sha256').update(token).digest('hex')

  try {
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hash },
    })
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return { success: false, error: 'トークンが無効または期限切れです' }
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // 同じユーザーの他のアクティブトークンも無効化
      prisma.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null, id: { not: record.id } },
        data: { usedAt: new Date() },
      }),
    ])

    return { success: true }
  } catch {
    return { success: false, error: 'パスワードの更新に失敗しました' }
  }
}

// ===========================================
// メールアドレス変更
// ===========================================

export async function requestEmailChangeAction(
  data: { newEmail: string },
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await auth()
  if (!session) return { success: false, error: '認証が必要です' }

  // ゲストアカウントはメアド変更不可
  const sessionUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isGuest: true },
  })
  if (sessionUser?.isGuest) {
    return { success: false, error: 'ゲストアカウントではメールアドレスを変更できません' }
  }

  const parsed = RequestEmailChangeSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? '入力内容を確認してください' }
  }
  const { newEmail } = parsed.data

  try {
    // 既存ユーザーチェック（自分自身でないか + 他人に使われていないか）
    const existing = await prisma.user.findUnique({ where: { email: newEmail } })
    if (existing) {
      if (existing.id === session.user.id) {
        return { success: false, error: '現在のメールアドレスと同じです' }
      }
      return { success: false, error: 'このメールアドレスはすでに使われています' }
    }

    const { plain, hash } = generateToken()
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS)

    await prisma.emailChangeRequest.create({
      data: {
        userId: session.user.id,
        newEmail,
        tokenHash: hash,
        expiresAt,
      },
    })

    const link = `${APP_URL}/dashboard/email/confirm?token=${encodeURIComponent(plain)}`
    await sendEmail({
      to: newEmail,
      subject: `【${SITE_NAME}】メールアドレス変更の確認`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h1 style="color: #7c3aed; font-size: 22px; margin-bottom: 16px;">メールアドレス変更</h1>
          <p>${session.user.name} さん、こんにちは。</p>
          <p>このメールアドレスへの変更を確定するには、下記のボタンから 24 時間以内にご確認ください。</p>
          <div style="margin: 24px 0;">
            <a
              href="${link}"
              style="background: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;"
            >
              メールアドレスを変更する
            </a>
          </div>
          <p style="color: #6b7280; font-size: 12px;">心当たりがない場合はこのメールを破棄してください。</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">${SITE_NAME}</p>
        </div>
      `,
    })

    return { success: true }
  } catch {
    return { success: false, error: 'メールアドレス変更の処理に失敗しました' }
  }
}

export async function confirmEmailChangeAction(
  data: { token: string },
): Promise<{ success: true; newEmail: string } | { success: false; error: string }> {
  const session = await auth()
  if (!session) return { success: false, error: '認証が必要です' }

  const parsed = ConfirmEmailChangeSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: 'トークンが不正です' }
  const { token } = parsed.data

  const hash = crypto.createHash('sha256').update(token).digest('hex')

  try {
    const record = await prisma.emailChangeRequest.findUnique({
      where: { tokenHash: hash },
    })
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return { success: false, error: 'トークンが無効または期限切れです' }
    }
    if (record.userId !== session.user.id) {
      return { success: false, error: 'このリンクは別のアカウント用です' }
    }

    // 競合チェック（送信後に第三者が同じメアドで登録した可能性）
    const conflict = await prisma.user.findUnique({ where: { email: record.newEmail } })
    if (conflict && conflict.id !== session.user.id) {
      return { success: false, error: 'このメールアドレスはすでに使われています' }
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: { email: record.newEmail },
      }),
      prisma.emailChangeRequest.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ])

    return { success: true, newEmail: record.newEmail }
  } catch {
    return { success: false, error: 'メールアドレス更新に失敗しました' }
  }
}
