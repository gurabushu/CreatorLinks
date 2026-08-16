// /admin/promo — プロモコード発行 + 一覧 + 使用状況
// 恩人向け永久 PRO 発行を UI で完結。従来は docs/pro_gift_runbook.md の SQL 実行。

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { NewPromoCodeForm, PromoCodeActions } from './actions-client'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'プロモコード管理 (Admin)' }
export const dynamic = 'force-dynamic'

function fmtDate(d: Date | null): string {
  if (!d) return '無期限'
  return new Date(d).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', dateStyle: 'short', timeStyle: 'short' })
}

export default async function AdminPromoPage() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') redirect('/')

  const promos = await prisma.promoCode.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { redemptions: true } },
    },
  })

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-6">プロモコード管理</h1>
      <p className="text-sm text-gray-500 mb-8">
        コード発行と使用状況の確認。redeem すると該当ユーザーが永年無料 PRO
        (hasLifetimeFreePro=true) になります。恩人向け発行の運用手順は
        <code className="mx-1 text-xs bg-gray-100 px-1.5 py-0.5 rounded">docs/pro_gift_runbook.md</code>
        を参照。
      </p>

      {/* 新規発行フォーム */}
      <section className="bg-white border rounded-2xl p-6 mb-8">
        <h2 className="font-bold mb-4">新規発行</h2>
        <NewPromoCodeForm />
      </section>

      {/* 一覧 */}
      <section>
        <h2 className="font-bold mb-4">発行済コード（{promos.length} 件）</h2>
        {promos.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-600">
            発行済コードはありません。
          </div>
        ) : (
          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-3">コード</th>
                    <th className="text-left px-3 py-3">ラベル</th>
                    <th className="text-right px-3 py-3">使用/上限</th>
                    <th className="text-left px-3 py-3 whitespace-nowrap">有効期限</th>
                    <th className="text-left px-3 py-3 whitespace-nowrap">発行者</th>
                    <th className="text-center px-3 py-3">状態</th>
                    <th className="text-center px-3 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {promos.map((p) => {
                    const isExpired = p.expiresAt && p.expiresAt.getTime() < Date.now()
                    const isMaxed = p.maxRedemptions !== null && p.redemptionCount >= p.maxRedemptions
                    const status: 'active' | 'expired' | 'maxed' = isExpired ? 'expired' : isMaxed ? 'maxed' : 'active'
                    return (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 font-mono text-xs">{p.code}</td>
                        <td className="px-3 py-3 max-w-[180px] truncate text-gray-700">
                          {p.label ?? <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-xs">
                          {p.redemptionCount} / {p.maxRedemptions ?? '∞'}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {fmtDate(p.expiresAt)}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {p.createdBy?.name ?? '—'}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {status === 'active' && (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                              有効
                            </span>
                          )}
                          {status === 'expired' && (
                            <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                              期限切れ
                            </span>
                          )}
                          {status === 'maxed' && (
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                              上限到達
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <PromoCodeActions codeId={p.id} redemptionCount={p.redemptionCount} isActive={status === 'active'} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
