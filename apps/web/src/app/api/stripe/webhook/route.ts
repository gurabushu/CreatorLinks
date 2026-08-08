// Stripe Webhook: 停止済み (2026-08-09)
// RevenueCat Web Billing への全面移行に伴い、Stripe Connect エスクロー処理を停止。
// 万一の受信に備えて 501 で明示的に応答する。物理削除はデータ保管期間後に実施予定。
//
// 復旧が必要になった場合は git 履歴を参照:
//   git log --all -- apps/web/src/app/api/stripe/webhook/route.ts

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST() {
  return NextResponse.json(
    {
      error: 'Stripe integration has been retired.',
      migratedTo: 'RevenueCat Web Billing',
    },
    { status: 501 },
  )
}
