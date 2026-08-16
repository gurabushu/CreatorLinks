// /admin/support — 公式アカウント宛サポート問い合わせ集約
//
// 一般ユーザーが /support から送信した問い合わせは、公式アカウントとの Match に
// message として届く。この画面では:
// - 公式が受信した全 message を新着順で一覧
// - Match 単位でグルーピング（1 ユーザー = 1 スレッド）
// - 未対応（公式からの返信がまだない）フラグ
// - 各スレッドから /dashboard/chat/[matchId] へ飛んで返信

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getOfficialUser } from '@/lib/official-account'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'サポート受信箱 (Admin)' }
export const dynamic = 'force-dynamic'

function relTime(d: Date): string {
  const diffMs = Date.now() - new Date(d).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'たった今'
  if (min < 60) return `${min} 分前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 時間前`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} 日前`
  return new Date(d).toLocaleDateString('ja-JP')
}

// 【カテゴリ】XXX プレフィックスから、カテゴリを抽出（サポートフォーム側で自動付与している）
function extractCategory(body: string): { category: string | null; subject: string; body: string } {
  const catMatch = body.match(/^【カテゴリ】(.+?)\n/)
  const subjMatch = body.match(/【件名】(.+?)\n\n/)
  const category = catMatch?.[1] ?? null
  const subject = subjMatch?.[1] ?? ''
  // カテゴリ行 + 件名行 + 空行を落とした本文
  const cleaned = body.replace(/^【カテゴリ】.+?\n【件名】.+?\n\n/, '').trim()
  return { category, subject, body: cleaned }
}

export default async function AdminSupportPage() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') redirect('/')

  const official = await getOfficialUser()
  if (!official) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <h1 className="text-2xl font-bold mb-4">サポート受信箱</h1>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-6 text-sm">
          公式アカウントがシード未実行です。`apps/api/scripts/seed-official-account.ts` を実行してください。
        </div>
      </div>
    )
  }

  // 公式アカウントが artistId のすべての Match を取得（＝一般ユーザーとのサポートスレッド）
  const threads = await prisma.match.findMany({
    where: { artistId: official.id, partnerUserId: { not: null } },
    take: 100,
    orderBy: { createdAt: 'desc' },
    include: {
      partner: {
        select: { id: true, name: true, email: true, isGuest: true, avatarUrl: true },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1, // 最新 1 件だけプレビュー用
        select: { id: true, body: true, senderId: true, createdAt: true, readAt: true },
      },
      _count: {
        select: { messages: true },
      },
    },
  })

  // 各 Match について「最後の message が partner (ユーザー) 側なら未対応」判定
  const enriched = threads.map((t) => {
    const lastMsg = t.messages[0]
    const isUnhandled = lastMsg && lastMsg.senderId !== official.id
    return { ...t, lastMsg, isUnhandled }
  })

  const unhandledCount = enriched.filter((e) => e.isUnhandled).length
  const totalCount = enriched.length

  // カテゴリ集計（最新 message から抽出）
  const categoryCount = new Map<string, number>()
  for (const t of enriched) {
    if (!t.lastMsg) continue
    const { category } = extractCategory(t.lastMsg.body)
    if (category) categoryCount.set(category, (categoryCount.get(category) ?? 0) + 1)
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <div className="flex items-baseline justify-between flex-wrap gap-3 mb-6">
        <h1 className="text-2xl font-bold">サポート受信箱</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500">
            全 {totalCount} スレッド
          </span>
          {unhandledCount > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 px-3 py-1 rounded-full font-semibold">
              🔴 未対応 {unhandledCount}
            </span>
          )}
        </div>
      </div>

      {/* カテゴリ集計 */}
      {categoryCount.size > 0 && (
        <div className="bg-white border rounded-xl p-4 mb-6">
          <p className="text-xs text-gray-500 mb-2">カテゴリ内訳（最新メッセージ基準）</p>
          <div className="flex flex-wrap gap-2">
            {Array.from(categoryCount.entries()).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
              <span key={cat} className="inline-flex items-center gap-1 bg-purple-50 border border-purple-200/70 text-purple-700 text-xs px-3 py-1 rounded-full font-medium">
                {cat}
                <span className="text-purple-900 font-bold">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* スレッド一覧 */}
      {enriched.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-600">
          サポート問い合わせはまだありません。
        </div>
      ) : (
        <ul className="space-y-2">
          {enriched.map((t) => {
            const preview = t.lastMsg ? extractCategory(t.lastMsg.body) : null
            const partnerName = t.partner?.name ?? '(削除済ユーザー)'
            return (
              <li key={t.id}>
                <Link
                  href={`/dashboard/chat/${t.id}`}
                  className={`block bg-white border rounded-xl p-4 hover:shadow-sm transition ${
                    t.isUnhandled ? 'border-red-200 bg-red-50/30' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-gray-900 truncate">{partnerName}</span>
                      {t.partner?.isGuest && (
                        <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded shrink-0">
                          ゲスト
                        </span>
                      )}
                      {t.isUnhandled && (
                        <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded font-bold shrink-0">
                          未対応
                        </span>
                      )}
                      {preview?.category && (
                        <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded shrink-0">
                          {preview.category}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 shrink-0">
                      {t.lastMsg ? relTime(t.lastMsg.createdAt) : relTime(t.createdAt)}
                      <span className="text-gray-400 ml-2">/ 累計 {t._count.messages}</span>
                    </span>
                  </div>
                  {preview?.subject && (
                    <p className="text-sm font-medium text-gray-800 mb-1">
                      件名: {preview.subject}
                    </p>
                  )}
                  {t.lastMsg && (
                    <p className="text-xs text-gray-600 line-clamp-2 whitespace-pre-wrap">
                      {preview?.body || t.lastMsg.body}
                    </p>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
