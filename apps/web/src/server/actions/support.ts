'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureSupportMatchId } from '@/lib/support'
import { checkRateLimit } from '@/lib/rate-limit'

export type SupportCategory =
  | 'BUG'
  | 'FEATURE'
  | 'PAYMENT'
  | 'ACCOUNT'
  | 'USAGE'
  | 'OTHER'

const CATEGORY_LABELS: Record<SupportCategory, string> = {
  BUG: 'バグ報告',
  FEATURE: '機能要望',
  PAYMENT: '支払い・返金',
  ACCOUNT: 'アカウント',
  USAGE: '利用方法',
  OTHER: 'その他',
}

const VALID_CATEGORIES = new Set<SupportCategory>([
  'BUG', 'FEATURE', 'PAYMENT', 'ACCOUNT', 'USAGE', 'OTHER',
])

export async function sendSupportInquiryAction(
  formData: FormData,
): Promise<{ success: true; matchId: string } | { success: false; error: string; needsLogin?: boolean }> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です', needsLogin: true }

  const category = String(formData.get('category') ?? '') as SupportCategory
  const subject = String(formData.get('subject') ?? '').trim()
  const body = String(formData.get('body') ?? '').trim()

  if (!VALID_CATEGORIES.has(category)) {
    return { success: false, error: 'カテゴリを選択してください' }
  }
  if (!subject) return { success: false, error: '件名を入力してください' }
  if (subject.length > 120) return { success: false, error: '件名は 120 文字以内で入力してください' }
  if (!body) return { success: false, error: '本文を入力してください' }
  if (body.length > 4000) return { success: false, error: '本文は 4000 文字以内で入力してください' }

  const rl = await checkRateLimit('message', `user:${session.user.id}`)
  if (!rl.ok) {
    return {
      success: false,
      error: `送信が速すぎます。${rl.retryAfterSec} 秒後に再試行してください`,
    }
  }

  const matchId = await ensureSupportMatchId(session.user.id)
  if (!matchId) {
    return {
      success: false,
      error: 'サポート窓口が利用できません（ゲストアカウントまたは公式アカウント未設定）',
    }
  }

  const formatted =
    `【カテゴリ】${CATEGORY_LABELS[category]}\n` +
    `【件名】${subject}\n\n${body}`

  await prisma.message.create({
    data: {
      matchId,
      senderId: session.user.id,
      body: formatted,
    },
  })

  return { success: true, matchId }
}
