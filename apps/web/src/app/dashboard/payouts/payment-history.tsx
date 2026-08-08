// 受取履歴一覧（アーティスト側視点）: HELD / RELEASED / REFUNDED を新しい順に並べる
// 純サーバコンポーネント想定 — 状態管理なし・data はサーバから渡す

import Link from 'next/link'
import { PaymentBadge, type PaymentStatus } from '@/components/payments/payment-badge'

export interface PayoutHistoryRow {
  paymentId: string
  matchId: string
  status: PaymentStatus
  amountYen: number
  artistPayoutYen: number
  projectTitle: string | null // P2P の場合 null
  paidAt: string | null
  releasedAt: string | null
}

function formatDate(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function PaymentHistory({ rows }: { rows: PayoutHistoryRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-8 text-center border rounded-2xl bg-white">
        まだ受取実績はありません。
      </p>
    )
  }

  return (
    <div className="border rounded-2xl bg-white overflow-hidden">
      <div className="hidden sm:grid grid-cols-[1fr_120px_120px_130px_110px] gap-3 px-5 py-3 text-xs font-medium text-gray-500 bg-gray-50 border-b">
        <div>案件</div>
        <div>支払日</div>
        <div>送金日</div>
        <div className="text-right">受取額</div>
        <div className="text-right">状態</div>
      </div>
      <ul className="divide-y">
        {rows.map((row) => (
          <li key={row.paymentId} className="px-5 py-4">
            <div className="sm:grid sm:grid-cols-[1fr_120px_120px_130px_110px] sm:gap-3 sm:items-center">
              <div className="min-w-0">
                <Link
                  href={`/dashboard/chat/${row.matchId}`}
                  className="font-medium text-sm hover:text-purple-600 break-words"
                >
                  {row.projectTitle ?? '非公開マッチ'}
                </Link>
              </div>
              <div className="text-xs text-gray-500 mt-1 sm:mt-0">
                <span className="sm:hidden">支払: </span>
                {formatDate(row.paidAt)}
              </div>
              <div className="text-xs text-gray-500 mt-0.5 sm:mt-0">
                <span className="sm:hidden">送金: </span>
                {formatDate(row.releasedAt)}
              </div>
              <div className="text-sm font-bold text-purple-700 mt-1 sm:mt-0 sm:text-right">
                ¥{row.artistPayoutYen.toLocaleString()}
              </div>
              <div className="mt-1.5 sm:mt-0 sm:text-right">
                <PaymentBadge status={row.status} size="sm" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
