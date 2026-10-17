'use client'

// Phase G (2026-10-17): RevenueCat 連携を削除。
// このファイルは Phase C で /verify ページ (¥3,000 認証バッジ買切) に置き換え予定。
// 一時的な stub として残す（直接遷移してきた場合の fallback UI）。
import Link from 'next/link'

type Props = {
  userId: string
}

export function ProCheckoutClient(_props: Props) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center">
      <p className="text-sm text-zinc-700 mb-3">
        PRO サブスクリプションは廃止されました。
      </p>
      <p className="text-xs text-zinc-500 mb-5">
        EncoreCue は全機能無料で利用できます。案件決済使用時のみ手数料 7% が
        かかります。運営を応援したい場合は認証バッジをご検討ください。
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-xl transition-colors"
      >
        トップへ戻る
      </Link>
    </div>
  )
}
