// 受取履歴一覧（アーティスト側視点）: HELD / RELEASED / REFUNDED を新しい順に並べる
// 純サーバコンポーネント想定 — 状態管理なし・data はサーバから渡す
//
// PRO 差額表示: viewer が Free（GENERAL）の時、各行に「PRO なら +¥X」を表示。
// PRO のときは (すでに 5% 適用済のため) 差額表示は不要。

import Link from 'next/link'
import { PaymentBadge, type PaymentStatus } from '@/components/payments/payment-badge'
import { PLATFORM_FEE_RATE_PRO } from '@/lib/stripe'

export interface PayoutHistoryRow {
  paymentId: string
  matchId: string
  status: PaymentStatus
  amountYen: number
  artistPayoutYen: number
  projectTitle: string | null // P2P の場合 null
  projectId: string | null // 帳票リンクの有効性判定に使う（P2P では帳票不可）
  paidAt: string | null
  releasedAt: string | null
}

// 「PRO なら受け取れた額」との差分。負や 0 は upsell 対象外（既に PRO or 免除で得している）。
export function calcProUpliftYen(row: { amountYen: number; artistPayoutYen: number }): number {
  const proPayout = row.amountYen - Math.round(row.amountYen * PLATFORM_FEE_RATE_PRO)
  const diff = proPayout - row.artistPayoutYen
  return diff > 0 ? diff : 0
}

function formatDate(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function PaymentHistory({
  rows,
  showProUpsell = false,
}: {
  rows: PayoutHistoryRow[]
  /** true のとき「PRO なら +¥X」列を表示（Free ユーザー向け upsell） */
  showProUpsell?: boolean
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-8 text-center border rounded-2xl bg-white">
        まだ受取実績はありません。
      </p>
    )
  }

  const gridCols = showProUpsell
    ? 'sm:grid-cols-[1fr_90px_90px_110px_90px_90px_120px]'
    : 'sm:grid-cols-[1fr_100px_100px_120px_100px_120px]'

  return (
    <div className="border rounded-2xl bg-white overflow-hidden">
      <div className={`hidden sm:grid ${gridCols} gap-3 px-5 py-3 text-xs font-medium text-gray-500 bg-gray-50 border-b`}>
        <div>案件</div>
        <div>支払日</div>
        <div>送金日</div>
        <div className="text-right">受取額</div>
        {showProUpsell && <div className="text-right text-purple-600">PRO なら</div>}
        <div className="text-right">状態</div>
        <div className="text-right">帳票</div>
      </div>
      <ul className="divide-y">
        {rows.map((row) => {
          const proUplift = showProUpsell ? calcProUpliftYen(row) : 0
          return (
          <li key={row.paymentId} className="px-5 py-4">
            <div className={`sm:grid ${gridCols} sm:gap-3 sm:items-center`}>
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
              {showProUpsell && (
                <div className="mt-1 sm:mt-0 sm:text-right">
                  {proUplift > 0 ? (
                    <span className="inline-block text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                      +¥{proUplift.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </div>
              )}
              <div className="mt-1.5 sm:mt-0 sm:text-right">
                <PaymentBadge status={row.status} size="sm" />
              </div>
              <div className="mt-2 sm:mt-0 sm:text-right">
                {row.projectId ? (
                  <div className="flex gap-1.5 sm:justify-end text-[11px]">
                    <Link
                      href={`/dashboard/matches/${row.matchId}/quote`}
                      target="_blank"
                      title="見積書"
                      className="px-1.5 py-0.5 rounded border border-gray-200 text-gray-600 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200"
                    >
                      見積
                    </Link>
                    <Link
                      href={`/dashboard/matches/${row.matchId}/contract`}
                      target="_blank"
                      title="契約書"
                      className="px-1.5 py-0.5 rounded border border-gray-200 text-gray-600 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200"
                    >
                      契約
                    </Link>
                    <Link
                      href={`/dashboard/matches/${row.matchId}/invoice`}
                      target="_blank"
                      title="請求書"
                      className="px-1.5 py-0.5 rounded border border-gray-200 text-gray-600 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200"
                    >
                      請求
                    </Link>
                    {/* 領収書は Stripe 側の Hosted Receipt に redirect。決済発生前は非表示 */}
                    {(['HELD', 'RELEASED', 'REFUNDED'] as const).includes(
                      row.status as 'HELD' | 'RELEASED' | 'REFUNDED',
                    ) && (
                      <Link
                        href={`/dashboard/matches/${row.matchId}/receipt`}
                        target="_blank"
                        title="領収書 (Stripe 発行)"
                        className="px-1.5 py-0.5 rounded border border-gray-200 text-gray-600 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200"
                      >
                        領収
                      </Link>
                    )}
                  </div>
                ) : (
                  <span className="text-[11px] text-gray-300">—</span>
                )}
              </div>
            </div>
          </li>
          )
        })}
      </ul>
    </div>
  )
}
