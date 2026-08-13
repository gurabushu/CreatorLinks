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

// 制御文字（改行・タブは残す）を除去。DM 本文が意図しない文字列で汚染されるのを防ぐ。
function stripControl(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
}

function readString(formData: FormData, key: string): string | null {
  const v = formData.get(key)
  if (v === null) return ''
  if (typeof v !== 'string') return null // File が飛んできたら reject
  return v
}

export async function sendSupportInquiryAction(
  formData: FormData,
): Promise<{ success: true; matchId: string } | { success: false; error: string; needsLogin?: boolean }> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です', needsLogin: true }

  const rawCategory = readString(formData, 'category')
  const rawSubject = readString(formData, 'subject')
  const rawBody = readString(formData, 'body')
  if (rawCategory === null || rawSubject === null || rawBody === null) {
    return { success: false, error: '入力形式が不正です' }
  }

  const category = rawCategory as SupportCategory
  const subject = stripControl(rawSubject).trim()
  const body = stripControl(rawBody).trim()

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
