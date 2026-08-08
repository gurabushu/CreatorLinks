// 入金設定ページ: RevenueCat 全面移行に伴い機能終了 (2026-08-09)
// 旧 Stripe Connect ベースの受取フローは廃止。物理削除は Task 3 Phase 5 で実施予定。

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function PayoutsPage() {
  const session = await auth()
  if (!session) redirect('/auth')

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-4">入金設定は終了しました</h1>
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-700 leading-relaxed space-y-3">
        <p>
          プラットフォーム側での案件報酬の預かり・送金機能（旧 Stripe Connect
          エスクロー）は、サービス設計の見直しにより終了しました。
        </p>
        <p>
          今後の案件対価のやり取りは、当事者間で直接（銀行振込等）行っていただく形になります。
          プラットフォームは案件のマッチング・進行管理・レビュー記録を提供します。
        </p>
        <p className="pt-2">
          <Link href="/dashboard" className="text-purple-700 hover:underline">
            マイページに戻る
          </Link>
        </p>
      </div>
    </div>
  )
}
