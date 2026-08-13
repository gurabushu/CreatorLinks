'use server'

// プロモコード redeem: 認証済みユーザーが code を入力 → 有効性チェック → 永年無料 PRO に昇格
// 現状の grant は「常に hasLifetimeFreePro=true + role=PRO」に固定。
// 将来「3ヶ月無料」等を追加するなら PromoCode に grantType を持たせて分岐する。

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'

// コード文字種: 大文字英数字とハイフン・アンダースコアのみ、4〜32 文字。
// 制御文字や空白入りの列挙攻撃を弾き、レート制限のバケット消費を実質意味あるものにする。
const PROMO_CODE_RE = /^[A-Z0-9_-]{4,32}$/

export type RedeemResult =
  | { success: true; label: string | null }
  | { success: false; error: string }

export async function redeemPromoCodeAction(rawCode: string): Promise<RedeemResult> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }

  const code = rawCode.trim().toUpperCase()
  if (!code) return { success: false, error: 'コードを入力してください' }
  if (!PROMO_CODE_RE.test(code)) {
    return { success: false, error: 'コードの形式が不正です（英数字と - _ のみ、4〜32 文字）' }
  }

  // ブルートフォース対策: ユーザー単位の低頻度制限
  const rl = await checkRateLimit('promo', `user:${session.user.id}`)
  if (!rl.ok) {
    return {
      success: false,
      error: `試行が多すぎます。${rl.retryAfterSec} 秒後にもう一度お試しください`,
    }
  }

  // ゲスト (isGuest=true) は 24h で消える匿名アカウント。作り直せば同じコードを事実上何度でも
  // 消費でき、maxRedemptions を食い潰されるため一律拒否。既に PRO 昇格済みならスキップ。
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isGuest: true, hasLifetimeFreePro: true },
  })
  if (!user) return { success: false, error: 'ユーザー情報を取得できませんでした' }
  if (user.isGuest) {
    return {
      success: false,
      error: 'ゲストアカウントではコードを使用できません。まずアカウント登録を完了してください。',
    }
  }
  if (user.hasLifetimeFreePro) {
    return { success: false, error: 'すでに PRO プランをご利用中です' }
  }

  const promo = await prisma.promoCode.findUnique({ where: { code } })
  if (!promo) return { success: false, error: 'コードが見つかりません' }

  const now = new Date()
  if (promo.expiresAt && promo.expiresAt.getTime() < now.getTime()) {
    return { success: false, error: 'このコードは有効期限が切れています' }
  }
  if (promo.maxRedemptions != null && promo.redemptionCount >= promo.maxRedemptions) {
    return { success: false, error: 'このコードは利用上限に達しています' }
  }

  // 重複 redeem チェック（トランザクション内でも @@unique が守るが、事前チェックで丁寧なエラーを返す）
  const existing = await prisma.promoRedemption.findUnique({
    where: { codeId_userId: { codeId: promo.id, userId: session.user.id } },
  })
  if (existing) return { success: false, error: 'このコードはすでに使用済みです' }

  try {
    await prisma.$transaction([
      prisma.promoRedemption.create({
        data: { codeId: promo.id, userId: session.user.id },
      }),
      // 上限を超えないよう where で redemptionCount を制約（同時実行対策）
      prisma.promoCode.update({
        where: {
          id: promo.id,
          ...(promo.maxRedemptions != null
            ? { redemptionCount: { lt: promo.maxRedemptions } }
            : {}),
        },
        data: { redemptionCount: { increment: 1 } },
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: { hasLifetimeFreePro: true, role: 'PRO' },
      }),
    ])
  } catch (e) {
    // 上限競合 (P2025 = record not found on where) or unique 制約競合
    const code = (e as { code?: string }).code
    if (code === 'P2025') {
      return { success: false, error: 'このコードは利用上限に達しています' }
    }
    if (code === 'P2002') {
      return { success: false, error: 'このコードはすでに使用済みです' }
    }
    return { success: false, error: '登録に失敗しました。しばらくしてお試しください' }
  }

  revalidatePath('/pro/subscribe')
  revalidatePath('/dashboard')
  return { success: true, label: promo.label }
}
