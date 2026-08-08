// Payment 自動リリース Cron: 停止済み (2026-08-09)
// RevenueCat Web Billing への全面移行に伴い、Stripe Connect エスクローの自動送金処理を停止。
// vercel.json の cron エントリからも除去済み。物理削除はデータ保管期間後に実施予定。

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(
    {
      error: 'Stripe auto-release has been retired.',
      migratedTo: 'RevenueCat Web Billing',
    },
    { status: 501 },
  )
}
