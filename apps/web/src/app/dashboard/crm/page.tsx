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
import Link from 'next/link'
import Image from 'next/image'
import { getDisplayName } from '@/lib/user'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'CRM 顧客一覧' }
export const dynamic = 'force-dynamic'

const FREE_TIER_LIMIT = 3

function relTime(d: Date | null): string {
  if (!d) return '—'
  const diffMs = Date.now() - new Date(d).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 60) return `${min} 分前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 時間前`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} 日前`
  const month = Math.floor(day / 30)
  return `${month} ヶ月前`
}

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
  const isPro = session.user.role === 'PRO'

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

  const visible = isPro ? stats : stats.slice(0, FREE_TIER_LIMIT)
  const hiddenCount = isPro ? 0 : Math.max(0, stats.length - FREE_TIER_LIMIT)
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
        <>
          <ul className="space-y-3">
            {visible.map((c) => (
              <li key={c.id}>
                <CounterpartyCard c={c} meId={meId} />
              </li>
            ))}
          </ul>

          {/* Free ユーザー向け PRO upsell */}
          {!isPro && hiddenCount > 0 && (
            <div className="mt-6 rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50/70 p-6 sm:p-8 text-center">
              <p className="text-2xl mb-2">🔒</p>
              <h2 className="text-lg sm:text-xl font-bold text-purple-900 mb-2">
                残り <span className="text-purple-700">{hiddenCount}</span> 名の顧客カードは PRO で解放
              </h2>
              <p className="text-sm text-purple-800/80 leading-relaxed mb-5">
                PRO プラン（¥980/月）にすると、過去に取引した全相手の集計と再依頼ワンタップが使えます。
                <br className="hidden sm:block" />
                手数料も 5% に減額。月に案件が動く方はすぐ元が取れます。
              </p>
              <Link
                href="/pro/subscribe"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg hover:opacity-95 transition"
              >
                PRO の詳細を見る →
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ---- 顧客カード ----
function CounterpartyCard({ c, meId: _meId }: { c: CounterpartyStats; meId: string }) {
  const displayName = c.displayName || c.name
  return (
    <Link
      href={`/artists/${c.id}`}
      className="block bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 hover:shadow-sm hover:border-purple-300 transition group"
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 overflow-hidden flex items-center justify-center text-white font-bold shrink-0">
          {c.avatarUrl ? (
            <Image src={c.avatarUrl} alt={displayName} width={56} height={56} className="w-full h-full object-cover" />
          ) : (
            displayName.charAt(0)
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* 名前 + Encore バッジ */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <p className="font-bold text-base sm:text-lg text-gray-900 group-hover:text-purple-700 transition truncate">
              {displayName}
            </p>
            {c.mutualEncore && (
              <span className="text-[10px] font-bold bg-pink-100 text-pink-700 border border-pink-200 px-2 py-0.5 rounded-full">
                🎵 Encore 相性
              </span>
            )}
          </div>

          {/* 統計 */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-2 text-xs">
            <div>
              <div className="text-gray-400">取引件数</div>
              <div className="font-bold text-gray-800">
                {c.matchCount}
                {c.completedCount < c.matchCount && (
                  <span className="text-[10px] text-gray-400 font-normal ml-0.5">
                    ({c.completedCount} 完了)
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="text-gray-400">累計取引額</div>
              <div className="font-bold text-purple-700">¥{c.totalYen.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-400">最終取引</div>
              <div className="font-bold text-gray-800">{relTime(c.lastMatchAt)}</div>
            </div>
          </div>

          {/* 最新メッセージ */}
          {c.latestMessage && (
            <div className="text-xs text-gray-500 line-clamp-1 border-l-2 border-gray-200 pl-2">
              <span className="text-[10px] font-medium mr-1">
                {c.latestMessage.senderIsMe ? '自分' : displayName}:
              </span>
              {c.latestMessage.body}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
