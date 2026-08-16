// /admin/payments/[id] — Payment 個別詳細 + 操作 UI
//
// できること:
// - Stripe との強制同期（webhook 落ちで DB 古い時）
// - HELD → 手動 release（アーティストに送金確定）
// - HELD → 手動 refund（依頼者に返金）
// - Stripe Dashboard 直リンク

import { auth } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { PaymentAdminActions } from './actions-client'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: '決済詳細 (Admin)' }
export const dynamic = 'force-dynamic'

function fmtYen(n: number): string {
  return `¥${n.toLocaleString('ja-JP')}`
}

function fmtDate(d: Date | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
}

export default async function AdminPaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') redirect('/')

  const { id } = await params

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      match: {
        include: {
          artist: { select: { id: true, name: true, email: true, stripeConnectAccountId: true, stripePayoutsEnabled: true } },
          project: {
            include: {
              client: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
    },
  })
  if (!payment) notFound()

  const stripeDashboardBase = 'https://dashboard.stripe.com/test'

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <Link href="/admin/payments" className="text-sm text-purple-600 hover:underline mb-4 inline-block">
        ← 決済管理へ戻る
      </Link>

      <h1 className="text-2xl font-bold mb-6">決済詳細</h1>

      {/* 状態サマリ */}
      <div className="bg-white border rounded-2xl p-6 mb-6">
        <div className="flex items-baseline justify-between mb-4 flex-wrap gap-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Payment ID</p>
            <code className="text-sm font-mono">{payment.id}</code>
          </div>
          <span className={`text-sm font-bold px-3 py-1 rounded-full ${
            payment.status === 'HELD' ? 'bg-amber-100 text-amber-800' :
            payment.status === 'RELEASED' ? 'bg-emerald-100 text-emerald-700' :
            payment.status === 'REFUNDED' ? 'bg-blue-100 text-blue-700' :
            payment.status === 'FAILED' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {payment.status}
          </span>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-xs text-gray-500">支払額</dt>
            <dd className="font-mono font-bold">{fmtYen(payment.amountYen)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">手数料</dt>
            <dd className="font-mono">{fmtYen(payment.platformFeeYen)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">アーティスト受取</dt>
            <dd className="font-mono font-bold text-emerald-700">{fmtYen(payment.artistPayoutYen)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">作成日時</dt>
            <dd>{fmtDate(payment.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">paidAt</dt>
            <dd>{fmtDate(payment.paidAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">releasedAt / refundedAt</dt>
            <dd>{fmtDate(payment.releasedAt ?? payment.refundedAt)}</dd>
          </div>
        </dl>
      </div>

      {/* 案件・当事者 */}
      <div className="bg-white border rounded-2xl p-6 mb-6">
        <h2 className="font-bold mb-4">案件・当事者</h2>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">案件</dt>
            <dd>
              {payment.match.project ? (
                <Link href={`/projects/${payment.match.project.id}`} className="text-purple-700 hover:underline">
                  {payment.match.project.title}
                </Link>
              ) : (
                <span className="text-gray-400">P2P Match</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">依頼者</dt>
            <dd>{payment.match.project?.client?.name} ({payment.match.project?.client?.email})</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">アーティスト</dt>
            <dd>
              {payment.match.artist.name} ({payment.match.artist.email})
              {' '}
              <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${
                payment.match.artist.stripePayoutsEnabled
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                Stripe Connect {payment.match.artist.stripePayoutsEnabled ? '有効' : '未有効'}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">Match Status</dt>
            <dd className="text-xs">{payment.match.status}</dd>
          </div>
        </dl>
      </div>

      {/* Stripe 情報 */}
      <div className="bg-white border rounded-2xl p-6 mb-6">
        <h2 className="font-bold mb-4">Stripe 情報</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex items-baseline gap-3">
            <dt className="text-xs text-gray-500 min-w-[140px]">Checkout Session</dt>
            <dd className="font-mono text-xs truncate flex-1">
              {payment.stripeCheckoutSessionId ? (
                <a
                  href={`${stripeDashboardBase}/payments?checkout_session_id=${payment.stripeCheckoutSessionId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:underline"
                >
                  {payment.stripeCheckoutSessionId}
                </a>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </dd>
          </div>
          <div className="flex items-baseline gap-3">
            <dt className="text-xs text-gray-500 min-w-[140px]">Payment Intent</dt>
            <dd className="font-mono text-xs truncate flex-1">
              {payment.stripePaymentIntentId ? (
                <a
                  href={`${stripeDashboardBase}/payments/${payment.stripePaymentIntentId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:underline"
                >
                  {payment.stripePaymentIntentId}
                </a>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </dd>
          </div>
          <div className="flex items-baseline gap-3">
            <dt className="text-xs text-gray-500 min-w-[140px]">Charge</dt>
            <dd className="font-mono text-xs truncate flex-1">
              {payment.stripeChargeId ? (
                <a
                  href={`${stripeDashboardBase}/payments/${payment.stripeChargeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:underline"
                >
                  {payment.stripeChargeId}
                </a>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </dd>
          </div>
          <div className="flex items-baseline gap-3">
            <dt className="text-xs text-gray-500 min-w-[140px]">Transfer</dt>
            <dd className="font-mono text-xs truncate flex-1">
              {payment.stripeTransferId ? (
                <a
                  href={`${stripeDashboardBase}/connect/transfers/${payment.stripeTransferId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:underline"
                >
                  {payment.stripeTransferId}
                </a>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </dd>
          </div>
        </dl>
      </div>

      {/* 操作 UI (client) */}
      <PaymentAdminActions paymentId={payment.id} currentStatus={payment.status} />
    </div>
  )
}
