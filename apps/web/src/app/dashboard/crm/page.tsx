// /dashboard/crm — 顧客別 CRM ビュー
//
// 「一元管理の付加価値」PRO 特典の中核。
// 過去に取引した相手を「顧客カード」として集約し、累計取引額・件数・
// 最終取引日・Encore 相性・直近メッセージを 1 画面で見られる。
//
// 商用文脈:
// - 副業ミュージシャン: 「山田さんは今年 5 回、¥250k / 平均 ¥50k」→ 来年の値付け参考
// - バンドリーダー: 「サポート常連の DTM トラックメイカー田中さんに再依頼」→ ワンタップ
//
// PRO 課金導線:
// - Free: 上位 3 件だけ表示、残りは blur + upsell CTA
// - PRO: 全件表示

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import { CrmList } from './crm-list'

export const metadata: Metadata = { title: 'CRM 顧客一覧' }
export const dynamic = 'force-dynamic'

type CounterpartyStats = {
  id: string
  name: string
  displayName: string | null
  avatarUrl: string | null
  matchCount: number
  completedCount: number
  totalYen: number
  lastMatchAt: Date
  mutualEncore: boolean // 双方が wantAgain=true の Match が 1 件以上あるか
  latestMessage: { body: string; createdAt: Date; senderIsMe: boolean } | null
}

export default async function CrmPage() {
  const session = await auth()
  if (!session) redirect('/auth')

  const meId = session.user.id

  // 自分が関わる全 Match を取得
  const matches = await prisma.match.findMany({
    where: {
      OR: [
        { artistId: meId },
        { partnerUserId: meId },
        { project: { clientId: meId } },
      ],
    },
    include: {
      artist: { select: { id: true, name: true, displayName: true, avatarUrl: true } },
      partner: { select: { id: true, name: true, displayName: true, avatarUrl: true } },
      project: {
        select: {
          client: { select: { id: true, name: true, displayName: true, avatarUrl: true } },
        },
      },
      payment: { select: { amountYen: true, status: true } },
      reviews: { select: { reviewerId: true, wantAgain: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { body: true, createdAt: true, senderId: true },
      },
    },
  })

  // 相手ごとに集約
  const map = new Map<string, CounterpartyStats>()
  for (const m of matches) {
    // 相手を判定: 自分以外の当事者
    let counterparty: { id: string; name: string; displayName: string | null; avatarUrl: string | null } | null = null
    if (m.artistId !== meId) counterparty = m.artist
    else if (m.partnerUserId && m.partnerUserId !== meId) counterparty = m.partner
    else if (m.project?.client && m.project.client.id !== meId) counterparty = m.project.client
    if (!counterparty) continue

    const key = counterparty.id
    const existing = map.get(key)
    const payment = m.payment
    const paymentAmount =
      payment && (payment.status === 'HELD' || payment.status === 'RELEASED')
        ? payment.amountYen
        : 0
    const isCompleted = m.status === 'COMPLETED'
    // 双方 wantAgain の Match かチェック
    const myReview = m.reviews.find((r) => r.reviewerId === meId)
    const theirReview = m.reviews.find((r) => r.reviewerId === counterparty!.id)
    const mutualEncoreThisMatch = !!(myReview?.wantAgain && theirReview?.wantAgain)
    const latest = m.messages[0]

    if (!existing) {
      map.set(key, {
        id: counterparty.id,
        name: counterparty.name,
        displayName: counterparty.displayName,
        avatarUrl: counterparty.avatarUrl,
        matchCount: 1,
        completedCount: isCompleted ? 1 : 0,
        totalYen: paymentAmount,
        lastMatchAt: m.createdAt,
        mutualEncore: mutualEncoreThisMatch,
        latestMessage: latest
          ? { body: latest.body, createdAt: latest.createdAt, senderIsMe: latest.senderId === meId }
          : null,
      })
    } else {
      existing.matchCount += 1
      if (isCompleted) existing.completedCount += 1
      existing.totalYen += paymentAmount
      if (m.createdAt > existing.lastMatchAt) existing.lastMatchAt = m.createdAt
      if (mutualEncoreThisMatch) existing.mutualEncore = true
      if (latest && (!existing.latestMessage || latest.createdAt > existing.latestMessage.createdAt)) {
        existing.latestMessage = {
          body: latest.body,
          createdAt: latest.createdAt,
          senderIsMe: latest.senderId === meId,
        }
      }
    }
  }

  const stats = Array.from(map.values()).sort((a, b) => {
    // 累計取引額が多い順、次に取引件数、次に最終取引日
    if (b.totalYen !== a.totalYen) return b.totalYen - a.totalYen
    if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount
    return b.lastMatchAt.getTime() - a.lastMatchAt.getTime()
  })

  // 2026-10-17 fee-only pivot: Free/PRO 分岐撤廃、全員全件表示。
  const visible = stats
  const totalYen = stats.reduce((s, c) => s + c.totalYen, 0)

  return (
    <div className="max-w-5xl mx-auto py-8 sm:py-12 px-4">
      <div className="flex items-baseline justify-between flex-wrap gap-3 mb-6">
        {/* min-w-0 + flex-1: 右の統計バッジと同じ行に来た時に説明文が押し出されて見切れないよう
            左側を伸縮可能にし、テキストを自然に折り返させる */}
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold">CRM 顧客一覧</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">
            過去に取引した相手を集約。値付け参考・再依頼にお使いください。
          </p>
        </div>
        {stats.length > 0 && (
          <div className="text-xs text-gray-600 text-right shrink-0">
            <div>
              取引相手 <span className="font-bold text-purple-700">{stats.length}</span> 名
            </div>
            <div>
              累計 <span className="font-bold text-purple-700">¥{totalYen.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {stats.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center text-sm text-gray-600">
          まだ取引履歴はありません。案件のマッチが成立すると、ここに顧客カードが並びます。
        </div>
      ) : (
        <CrmList stats={visible} meId={meId} />
      )}
    </div>
  )
}
