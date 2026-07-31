// app/dashboard/page.tsx — マイページ (SSR)

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'マイページ' }

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/auth')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let myMatches: any[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let myProjects: any[] = []
  let notifications = 0
  let isGuest = false
  let guestExpiresAt: Date | null = null
  try {
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isGuest: true, createdAt: true },
    })
    isGuest = me?.isGuest ?? false
    if (me?.isGuest) {
      guestExpiresAt = new Date(me.createdAt.getTime() + 24 * 60 * 60 * 1000)
    }
    ;[myMatches, myProjects, notifications] = await Promise.all([
      prisma.match.findMany({
        where: { artistId: session.user.id },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { project: { select: { title: true, budget: true } } },
      }),
      prisma.project.findMany({
        where: { clientId: session.user.id },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { matches: true } } },
      }),
      prisma.message.count({
        where: {
          match: { artistId: session.user.id },
          readAt: null,
          NOT: { senderId: session.user.id },
        },
      }),
    ])
  } catch {
    // DB unreachable — show empty state
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      {isGuest && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-bold">ゲストモード</span>
          <span className="ml-2">
            このアカウントは{guestExpiresAt ? ` ${guestExpiresAt.toLocaleString('ja-JP')} ` : 'まもなく'}に自動削除されます。引き続き利用するには
            <Link href="/auth" className="ml-1 underline font-medium hover:text-amber-900">
              正式登録
            </Link>
            をお願いします。
          </span>
        </div>
      )}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold">マイページ</h1>
          <p className="text-gray-500 mt-1">
            こんにちは、{session.user.name} さん
            {session.user.role === 'PRO' && (
              <span className="ml-2 bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full">PRO</span>
            )}
          </p>
        </div>
        {session.user.role !== 'PRO' && (
          <Link
            href="/pro/subscribe"
            className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition"
          >
            PRO にアップグレード
          </Link>
        )}
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-white border rounded-xl p-5 text-center">
          <p className="text-gray-500 text-sm">応募中の案件</p>
          <p className="text-2xl font-bold text-purple-600">{myMatches.length}</p>
        </div>
        <div className="bg-white border rounded-xl p-5 text-center">
          <p className="text-gray-500 text-sm">掲載中の案件</p>
          <p className="text-2xl font-bold text-purple-600">{myProjects.length}</p>
        </div>
        <div className="bg-white border rounded-xl p-5 text-center">
          <p className="text-gray-500 text-sm">未読メッセージ</p>
          <p className="text-2xl font-bold text-red-500">{notifications}</p>
        </div>
        <div className="bg-white border rounded-xl p-5 text-center">
          <Link href="/dashboard/profile" className="text-gray-500 text-sm hover:text-purple-600">
            プロフィール編集 →
          </Link>
        </div>
      </div>

      {/* クイックアクション */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <Link
          href="/dashboard/profile"
          className="bg-white border rounded-xl p-5 hover:border-purple-300 hover:shadow-sm transition flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900">プロフィール編集</p>
            <p className="text-xs text-gray-500 mt-0.5">トプ画・ジャケット画像・自己紹介</p>
          </div>
          <span className="text-gray-300">→</span>
        </Link>
        <Link
          href="/dashboard/portfolio"
          className="bg-white border rounded-xl p-5 hover:border-purple-300 hover:shadow-sm transition flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 15l5-5 4 4 3-3 6 6" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900">ポートフォリオ管理</p>
            <p className="text-xs text-gray-500 mt-0.5">作品の登録・編集・削除</p>
          </div>
          <span className="text-gray-300">→</span>
        </Link>
      </div>

      {/* 受注案件 */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">応募した案件</h2>
          <Link href="/dashboard/matches" className="text-purple-600 text-sm hover:underline">
            すべて見る →
          </Link>
        </div>
        <div className="space-y-3">
          {myMatches.map((match) => (
            <div key={match.id} className="bg-white border rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="font-medium">{match.project.title}</p>
                {match.project.budget && (
                  <p className="text-sm text-gray-500">¥{match.project.budget.toLocaleString()}</p>
                )}
              </div>
              <span
                className={`text-xs px-3 py-1 rounded-full ${
                  match.status === 'ACCEPTED'
                    ? 'bg-green-100 text-green-700'
                    : match.status === 'REJECTED'
                    ? 'bg-red-100 text-red-700'
                    : match.status === 'COMPLETED'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {match.status === 'APPLIED' ? '応募中' : match.status === 'ACCEPTED' ? '承認済み' : match.status === 'REJECTED' ? '却下' : '完了'}
              </span>
            </div>
          ))}
          {myMatches.length === 0 && (
            <p className="text-gray-500 text-sm">まだ案件に応募していません</p>
          )}
        </div>
      </section>
    </div>
  )
}
