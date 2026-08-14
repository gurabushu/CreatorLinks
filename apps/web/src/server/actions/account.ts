'use server'

// アカウント削除（退会）Server Action
// 方針: soft-delete + anonymize。
// - User の row は残す（Payment / Match / Message / Review の FK 整合と会計証跡のため）
// - PII フィールドを null 化 or 匿名化して、他ユーザー・検索エンジンからは識別不能に
// - パスワードハッシュを消して以後ログイン不可
// - deletedAt に現在時刻を入れる（公開クエリ側で filter）
// - cron で保存期間経過後（プライバシーポリシー 7 節参照）に hard delete する運用も可能

import bcrypt from 'bcryptjs'
import { auth, signOut } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export type DeleteAccountResult =
  | { success: true }
  | { success: false; error: string }

export async function deleteAccountAction(input: {
  currentPassword?: string
}): Promise<DeleteAccountResult> {
  const session = await auth()
  if (!session) return { success: false, error: '認証が必要です' }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      passwordHash: true,
      isGuest: true,
      isOfficial: true,
      deletedAt: true,
    },
  })
  if (!user) return { success: false, error: 'ユーザーが見つかりません' }
  if (user.deletedAt) return { success: false, error: 'すでに削除済みです' }
  if (user.isOfficial) {
    return { success: false, error: '公式アカウントは削除できません' }
  }

  // Guest 以外はパスワード再確認を必須にする（他人が同席端末で削除実行するのを防ぐ）
  if (!user.isGuest && user.passwordHash) {
    if (!input.currentPassword) {
      return { success: false, error: '確認のため現在のパスワードを入力してください' }
    }
    const ok = await bcrypt.compare(input.currentPassword, user.passwordHash)
    if (!ok) {
      return { success: false, error: '現在のパスワードが正しくありません' }
    }
  }

  // 匿名化 email は unique 制約と共存できるよう userId 混みで生成する
  const anonymizedEmail = `deleted-${session.user.id}@deleted.local`

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      email: anonymizedEmail,
      name: '削除済みユーザー',
      displayName: null,
      passwordHash: null,
      bio: null,
      avatarUrl: null,
      coverUrl: null,
      gender: null,
      heightCm: null,
      activityYears: null,
      instruments: [],
      genres: [],
      // 表示上の順位・レコメンドから外す
      role: 'GENERAL',
      hasLifetimeFreePro: false,
      hasPaidSubscription: false,
      // Stripe Connect は本人主導で解除する運用（当事業者では触らない）
      // Stripe 側 KYC 情報は Stripe が保持しており、当事業者はキャンセルの権限がある実装後に扱う
      deletedAt: new Date(),
    },
  })

  // 個人特定に繋がる補助テーブル（未使用のリセット / メール変更トークン）はハード削除
  await prisma.passwordResetToken.deleteMany({ where: { userId: session.user.id } })
  await prisma.emailChangeRequest.deleteMany({ where: { userId: session.user.id } })

  // セッション破棄（JWT はサーバー側 store がないので実際には次回リクエストの callback で
  // deletedAt を検知して弾く。ここではクライアント cookie を消すだけ）
  await signOut({ redirect: false })

  revalidatePath('/', 'layout')
  return { success: true }
}
