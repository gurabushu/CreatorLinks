// カレンダー: Phase A 最小 UI（リスト形式）
// 自分が主催・参加確定・興味ありのイベントを日付昇順で一覧表示。
// 月別グループに分けて表示。ビジュアルなカレンダー UI は後続で追加。

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { EVENT_TYPE_LABELS } from '@creator-links/shared'
import type { EventType } from '@creator-links/shared'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'カレンダー' }

type EventSummary = {
  id: string
  title: string
  startAt: Date
  type: string
  venueName: string | null
  city: string | null
}

type Entry = { event: EventSummary; role: 'ORGANIZER' | 'PERFORMER' | 'STAFF' | 'GUEST' | 'AUDIENCE' }

const ROLE_LABELS: Record<Entry['role'], string> = {
  ORGANIZER: '主催',
  PERFORMER: '出演',
  STAFF: 'スタッフ',
  GUEST: 'ゲスト',
  AUDIENCE: '観覧予定',
}

const ROLE_COLORS: Record<Entry['role'], string> = {
  ORGANIZER: 'bg-purple-100 text-purple-700',
  PERFORMER: 'bg-emerald-100 text-emerald-700',
  STAFF: 'bg-blue-100 text-blue-700',
  GUEST: 'bg-yellow-100 text-yellow-700',
  AUDIENCE: 'bg-pink-100 text-pink-700',
}

function monthKey(d: Date) {
  return `${d.getFullYear()}年${d.getMonth() + 1}月`
}

function fmtDate(d: Date) {
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} (${['日', '月', '火', '水', '木', '金', '土'][d.getDay()]}) ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default async function CalendarPage() {
  const session = await auth()
  if (!session) redirect('/auth')

  const now = new Date()
  const twoMonthsFromNow = new Date()
  twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 3)

  const [created, participations, interests] = await Promise.all([
    prisma.event.findMany({
      where: {
        creatorId: session.user.id,
        startAt: { gte: now, lte: twoMonthsFromNow },
        status: { in: ['PUBLISHED', 'DRAFT'] },
      },
      select: {
        id: true, title: true, startAt: true, type: true,
        venueName: true, city: true,
      },
    }),
    prisma.eventParticipant.findMany({
      where: {
        userId: session.user.id,
        status: 'CONFIRMED',
        event: { startAt: { gte: now, lte: twoMonthsFromNow } },
      },
      include: {
        event: {
          select: {
            id: true, title: true, startAt: true, type: true,
            venueName: true, city: true,
          },
        },
      },
    }),
    prisma.eventInterest.findMany({
      where: {
        userId: session.user.id,
        isAttending: true,
        event: { startAt: { gte: now, lte: twoMonthsFromNow }, status: 'PUBLISHED' },
      },
      include: {
        event: {
          select: {
            id: true, title: true, startAt: true, type: true,
            venueName: true, city: true,
          },
        },
      },
    }),
  ])

  const merged: Entry[] = [
    ...created.map((e) => ({ event: e, role: 'ORGANIZER' as const })),
    ...participations.map((p) => ({
      event: p.event,
      role: p.role as Entry['role'],
    })),
    ...interests.map((i) => ({ event: i.event, role: 'AUDIENCE' as const })),
  ]

  // 同じイベントは主催 > 出演 > その他 の優先度で1件に絞る
  const priority: Record<Entry['role'], number> = {
    ORGANIZER: 0, PERFORMER: 1, STAFF: 2, GUEST: 3, AUDIENCE: 4,
  }
  const dedup = new Map<string, Entry>()
  for (const entry of merged) {
    const existing = dedup.get(entry.event.id)
    if (!existing || priority[entry.role] < priority[existing.role]) {
      dedup.set(entry.event.id, entry)
    }
  }
  const entries = Array.from(dedup.values()).sort(
    (a, b) => a.event.startAt.getTime() - b.event.startAt.getTime(),
  )

  // 月ごとにグループ化
  const byMonth = new Map<string, Entry[]>()
  for (const entry of entries) {
    const key = monthKey(entry.event.startAt)
    if (!byMonth.has(key)) byMonth.set(key, [])
    byMonth.get(key)!.push(entry)
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">カレンダー</h1>
          <p className="text-sm text-gray-500 mt-1">今後 3ヶ月のイベント（主催・参加・興味あり）</p>
        </div>
        <Link
          href="/events"
          className="text-sm text-purple-700 hover:underline"
        >
          全イベント一覧 →
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-600">
          今後のイベントはまだありません。
          <p className="mt-2">
            <Link href="/events" className="text-purple-700 hover:underline">
              イベントを探す →
            </Link>
            <span className="mx-2 text-gray-400">|</span>
            <Link href="/events/new" className="text-purple-700 hover:underline">
              新規作成 →
            </Link>
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(byMonth.entries()).map(([month, list]) => (
            <div key={month}>
              <h2 className="text-sm font-semibold text-gray-500 mb-2">{month}</h2>
              <ul className="space-y-2">
                {list.map((entry) => (
                  <li key={entry.event.id}>
                    <Link
                      href={`/events/${entry.event.id}`}
                      className="block rounded-xl border border-gray-200 bg-white hover:shadow-sm transition p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[entry.role]}`}>
                          {ROLE_LABELS[entry.role]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-500 mb-1">
                            {fmtDate(entry.event.startAt)}
                            <span className="mx-1">·</span>
                            {EVENT_TYPE_LABELS[entry.event.type as EventType]}
                            {entry.event.venueName && (
                              <>
                                <span className="mx-1">·</span>
                                <span>{entry.event.venueName}</span>
                              </>
                            )}
                          </div>
                          <div className="font-medium text-gray-900 line-clamp-1">
                            {entry.event.title}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
