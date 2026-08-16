// /admin/payments — Payment 一覧 + status 別フィルタ + Stripe Dashboard 直リンク
//
// トラブル対応の一次窓口:
// - AWAITING が長時間居座る → Checkout Session 発行後の未完了、放置か cancel
// - HELD が古すぎる → 検収遅延、依頼者フォロー必要
// - FAILED → 依頼者に別カードで再挑戦を促す
// - Stripe 側で refund したが REFUNDED になってない → 「Stripe sync」で解消

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import type { PaymentStatus } from '@prisma/client'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: '決済管理 (Admin)' }
export const dynamic = 'force-dynamic'

type Search = { status?: string }

const STATUS_META: Record<PaymentStatus, { label: string; className: string; hint: string }> = {
  AWAITING: { label: '支払い待ち', className: 'bg-gray-100 text-gray-700', hint: 'Checkout 未完了。長時間残るなら cancel 候補' },
  HELD: { label: 'エスクロー保管中', className: 'bg-amber-100 text-amber-800', hint: '検収待ち。7日後 auto release' },
  RELEASED: { label: '送金済', className: 'bg-emerald-100 text-emerald-700', hint: 'アーティスト着金完了' },
  REFUNDED: { label: '返金済', className: 'bg-blue-100 text-blue-700', hint: '依頼者へ返金完了' },
  FAILED: { label: '失敗', className: 'bg-red-100 text-red-700', hint: 'Payment Intent 失敗。再挑戦を促す' },
}

function fmtYen(n: number): string {
  return `¥${n.toLocaleString('ja-JP')}`
}

function relTime(d: Date | null): string {
  if (!d) return '—'
  const diffMs = Date.now() - new Date(d).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.floor(hr / 24)
  return `${day}d`
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') redirect('/')

  const { status: rawStatus } = await searchParams
  const validStatuses: PaymentStatus[] = ['AWAITING', 'HELD', 'RELEASED', 'REFUNDED', 'FAILED']
  const filterStatus = validStatuses.includes(rawStatus as PaymentStatus)
    ? (rawStatus as PaymentStatus)
    : null

  const [payments, counts] = await Promise.all([
    prisma.payment.findMany({
      where: filterStatus ? { status: filterStatus } : {},
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        match: {
          include: {
            artist: { select: { id: true, name: true, email: true } },
            project: { select: { id: true, title: true, clientId: true, client: { select: { name: true, email: true } } } },
          },
        },
      },
    }),
    prisma.payment.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ])

  const countMap = new Map<PaymentStatus, number>()
  for (const c of counts) countMap.set(c.status as PaymentStatus, c._count._all)
  const totalCount = counts.reduce((sum, c) => sum + c._count._all, 0)

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-6">決済管理</h1>

      {/* status フィルタ */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href="/admin/payments"
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
            !filterStatus ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          全て ({totalCount})
        </Link>
        {validStatuses.map((s) => {
          const count = countMap.get(s) ?? 0
          const meta = STATUS_META[s]
          const active = filterStatus === s
          return (
            <Link
              key={s}
              href={`/admin/payments?status=${s}`}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                active ? 'bg-purple-600 text-white' : `${meta.className} hover:opacity-80`
              }`}
              title={meta.hint}
            >
              {meta.label} ({count})
            </Link>
          )
        })}
      </div>

      {/* 一覧 */}
      {payments.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-600">
          該当する Payment はありません。
        </div>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-3">状態</th>
                  <th className="text-left px-3 py-3">案件</th>
                  <th className="text-left px-3 py-3">依頼者</th>
                  <th className="text-left px-3 py-3">アーティスト</th>
                  <th className="text-right px-3 py-3">金額</th>
                  <th className="text-left px-3 py-3 whitespace-nowrap">経過</th>
                  <th className="text-center px-3 py-3">Stripe</th>
                  <th className="text-center px-3 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((p) => {
                  const meta = STATUS_META[p.status as PaymentStatus]
                  const stripeDashboardUrl = p.stripePaymentIntentId
                    ? `https://dashboard.stripe.com/test/payments/${p.stripePaymentIntentId}`
                    : null
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${meta.className}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 max-w-[180px]">
                        {p.match.project ? (
                          <Link href={`/projects/${p.match.project.id}`} className="text-purple-700 hover:underline truncate block" title={p.match.project.title}>
                            {p.match.project.title}
                          </Link>
                        ) : (
                          <span className="text-gray-400">P2P</span>
                        )}
                      </td>
                      <td className="px-3 py-3 max-w-[140px] truncate text-gray-700">
                        {p.match.project?.client?.name ?? '—'}
                      </td>
                      <td className="px-3 py-3 max-w-[140px] truncate text-gray-700">
                        {p.match.artist?.name ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-right font-mono">
                        <div>{fmtYen(p.amountYen)}</div>
                        <div className="text-[10px] text-gray-500">→ {fmtYen(p.artistPayoutYen)}</div>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {relTime(p.createdAt)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {stripeDashboardUrl ? (
                          <a
                            href={stripeDashboardUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-purple-600 hover:underline"
                          >
                            🔗
                          </a>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <Link
                          href={`/admin/payments/${p.id}`}
                          className="text-xs bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 px-3 py-1 rounded-lg transition"
                        >
                          操作
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">
        最新 100 件を表示。Stripe Dashboard リンクは test mode 前提。
      </p>
    </div>
  )
}
