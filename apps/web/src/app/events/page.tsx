// イベント一覧（公開）: Phase A 最小 UI
// 公開中の未来イベントを新しい順に表示。詳細ページ・作成ページへの導線。

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { EVENT_TYPE_LABELS } from '@creator-links/shared'
import type { EventType } from '@creator-links/shared'
import { getDisplayName } from '@/lib/user'
import { jstDatetime } from '@/lib/jst-date'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'イベント一覧' }

// Vercel Node runtime は UTC 動作。JST 表示に統一。
const formatDate = jstDatetime

export default async function EventsPage() {
  const session = await auth()
  const now = new Date()

  const events = await prisma.event.findMany({
    where: {
      status: 'PUBLISHED',
      visibility: 'PUBLIC', // Phase A.5: 公開一覧は PUBLIC のみ
      startAt: { gte: now },
    },
    take: 30,
    orderBy: { startAt: 'asc' },
    include: {
      creator: {
        select: { id: true, name: true, displayName: true, avatarUrl: true },
      },
      _count: { select: { openRoles: true, participants: true, interests: true } },
    },
  })

  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-12 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">イベント一覧</h1>
          <p className="text-sm text-gray-500 mt-1">
            音楽業界のライブ・セッション・レコーディング等を告知
          </p>
        </div>
        {session && (
          <Link
            href="/events/new"
            className="text-sm bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition"
          >
            + 新規作成
          </Link>
        )}
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-600">
          公開中のイベントはまだありません。
          {session && (
            <p className="mt-2">
              <Link href="/events/new" className="text-purple-700 hover:underline">
                最初のイベントを作成する →
              </Link>
            </p>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map((e) => (
            <li
              key={e.id}
              className="rounded-xl border border-gray-200 bg-white hover:shadow-sm transition"
            >
              <Link href={`/events/${e.id}`} className="block p-4 sm:p-5">
                <div className="flex items-start gap-4">
                  {e.coverUrl && (
                    <img
                      src={e.coverUrl}
                      alt=""
                      className="w-20 h-20 rounded-lg object-cover shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 text-xs text-purple-700">
                      <span className="font-medium">
                        {EVENT_TYPE_LABELS[e.type as EventType]}
                      </span>
                      <span>·</span>
                      <span>{formatDate(e.startAt)}</span>
                      {e.venueName && (
                        <>
                          <span>·</span>
                          <span className="truncate">{e.venueName}</span>
                        </>
                      )}
                    </div>
                    <h2 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                      {e.title}
                    </h2>
                    <p className="text-xs text-gray-500 line-clamp-1">
                      主催 {getDisplayName(e.creator)}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-500">
                      {e._count.openRoles > 0 && (
                        <span className="text-emerald-700">
                          出演・スタッフ募集 {e._count.openRoles}件
                        </span>
                      )}
                      {e._count.participants > 0 && (
                        <span>出演者 {e._count.participants}名</span>
                      )}
                      {e._count.interests > 0 && (
                        <span>行きたい {e._count.interests}名</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
