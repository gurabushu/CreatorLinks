// アーティストのイベント一覧: Phase A.6
// - 主催・出演・スタッフなど関与したイベントを visibility に応じて表示
// - viewer が本人なら全部、フォロワーなら FOLLOWERS 含む、それ以外は PUBLIC のみ

import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getDisplayName } from '@/lib/user'
import {
  EVENT_TYPE_LABELS,
  EVENT_VISIBILITY_ICONS,
} from '@creator-links/shared'
import type { EventType, EventVisibility, EventStatus } from '@creator-links/shared'
import { jstDatetime } from '@/lib/jst-date'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ scope?: 'upcoming' | 'past'; as?: 'organizer' | 'performer' | 'all' }>
}

// Vercel Node runtime は UTC 動作。JST 表示に統一。
const fmt = jstDatetime

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const user = await prisma.user.findUnique({
    where: { id },
    select: { name: true, displayName: true },
  })
  if (!user) return { title: 'アーティスト' }
  return { title: `${getDisplayName(user)} のイベント` }
}

export default async function ArtistEventsPage({ params, searchParams }: Props) {
  const { id } = await params
  const { scope = 'upcoming', as = 'all' } = await searchParams
  const session = await auth()

  const artist = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, displayName: true, avatarUrl: true },
  })
  if (!artist) notFound()

  const viewerId = session?.user?.id ?? null
  const isSelf = viewerId === id

  // viewer が artist をフォローしているか
  const follows = viewerId && !isSelf
    ? await prisma.follow.findUnique({
        where: {
          followerId_followingId: { followerId: viewerId, followingId: id },
        },
        select: { id: true },
      })
    : null
  const isFollower = !!follows

  // visibility フィルタ構築
  const visibilityOr: Prisma.EventWhereInput[] = [{ visibility: 'PUBLIC' }]
  if (isFollower || isSelf) visibilityOr.push({ visibility: 'FOLLOWERS' })
  if (viewerId) {
    // 参加者として招待されているイベントも見える
    visibilityOr.push({
      visibility: 'PARTICIPANTS_ONLY',
      participants: {
        some: {
          userId: viewerId,
          status: { in: ['INVITED', 'CONFIRMED'] },
        },
      },
    })
  }
  if (isSelf) visibilityOr.push({ visibility: 'PRIVATE' })

  const now = new Date()
  const dateFilter = scope === 'upcoming' ? { gte: now } : { lt: now }

  // アーティストが主催 or 参加者として関与しているイベント
  const roleFilter: Prisma.EventWhereInput =
    as === 'organizer'
      ? { creatorId: id }
      : as === 'performer'
        ? {
            participants: {
              some: {
                userId: id,
                status: { in: ['INVITED', 'CONFIRMED'] },
              },
            },
          }
        : {
            OR: [
              { creatorId: id },
              {
                participants: {
                  some: {
                    userId: id,
                    status: { in: ['INVITED', 'CONFIRMED'] },
                  },
                },
              },
            ],
          }

  const where: Prisma.EventWhereInput = {
    AND: [
      roleFilter,
      { status: { in: ['PUBLISHED', 'COMPLETED'] } },
      { startAt: dateFilter },
      { OR: visibilityOr },
    ],
  }

  const events = await prisma.event.findMany({
    where,
    take: 50,
    orderBy: { startAt: scope === 'upcoming' ? 'asc' : 'desc' },
    include: {
      creator: {
        select: { id: true, name: true, displayName: true, avatarUrl: true },
      },
      participants: {
        where: { userId: id },
        select: { role: true, status: true },
      },
      _count: { select: { openRoles: true, interests: true } },
    },
  })

  const tabLink = (target: 'upcoming' | 'past') => {
    const params = new URLSearchParams()
    params.set('scope', target)
    if (as !== 'all') params.set('as', as)
    return `?${params.toString()}`
  }

  const asLink = (target: 'all' | 'organizer' | 'performer') => {
    const params = new URLSearchParams()
    params.set('scope', scope)
    if (target !== 'all') params.set('as', target)
    return `?${params.toString()}`
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <Link
        href={`/artists/${id}`}
        className="inline-flex items-center gap-2 mb-4 text-sm text-purple-700 hover:underline"
      >
        ← {getDisplayName(artist)} のプロフィール
      </Link>
      <h1 className="text-2xl font-bold mb-1">{getDisplayName(artist)} のイベント</h1>
      <p className="text-sm text-gray-500 mb-6">
        {isSelf
          ? '自分の主催・出演イベント（すべての公開範囲を表示）'
          : isFollower
            ? 'PUBLIC + フォロワー限定 + 招待済み'
            : 'PUBLIC イベントのみ表示'}
      </p>

      {/* タブ: 今後 / 過去 */}
      <div className="flex items-center gap-2 mb-3 border-b border-gray-200">
        <Link
          href={tabLink('upcoming')}
          className={`px-3 py-2 text-sm ${
            scope === 'upcoming'
              ? 'text-purple-700 border-b-2 border-purple-600 font-medium -mb-px'
              : 'text-gray-500 hover:text-purple-700'
          }`}
        >
          今後
        </Link>
        <Link
          href={tabLink('past')}
          className={`px-3 py-2 text-sm ${
            scope === 'past'
              ? 'text-purple-700 border-b-2 border-purple-600 font-medium -mb-px'
              : 'text-gray-500 hover:text-purple-700'
          }`}
        >
          過去
        </Link>
      </div>

      {/* サブフィルタ: 主催 / 出演 / 全部 */}
      <div className="flex items-center gap-2 mb-6 text-xs">
        <Link
          href={asLink('all')}
          className={`px-2.5 py-1 rounded-full border ${
            as === 'all'
              ? 'bg-purple-50 border-purple-300 text-purple-700'
              : 'bg-white border-gray-200 text-gray-600 hover:border-purple-300'
          }`}
        >
          すべて
        </Link>
        <Link
          href={asLink('organizer')}
          className={`px-2.5 py-1 rounded-full border ${
            as === 'organizer'
              ? 'bg-purple-50 border-purple-300 text-purple-700'
              : 'bg-white border-gray-200 text-gray-600 hover:border-purple-300'
          }`}
        >
          主催
        </Link>
        <Link
          href={asLink('performer')}
          className={`px-2.5 py-1 rounded-full border ${
            as === 'performer'
              ? 'bg-purple-50 border-purple-300 text-purple-700'
              : 'bg-white border-gray-200 text-gray-600 hover:border-purple-300'
          }`}
        >
          出演・参加
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-600">
          該当するイベントはありません。
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map((e) => {
            const artistRole =
              e.creatorId === id
                ? '主催'
                : e.participants[0]?.role
                  ? `参加 (${e.participants[0].role})`
                  : ''
            return (
              <li key={e.id}>
                <Link
                  href={`/events/${e.id}`}
                  className="block rounded-xl border border-gray-200 bg-white hover:shadow-sm transition p-4"
                >
                  <div className="flex items-center gap-2 text-xs text-purple-700 mb-1 flex-wrap">
                    <span>{EVENT_TYPE_LABELS[e.type as EventType]}</span>
                    <span>·</span>
                    <span>{fmt(e.startAt)}</span>
                    {e.venueName && (
                      <>
                        <span>·</span>
                        <span>{e.venueName}</span>
                      </>
                    )}
                    <span className="ml-auto text-gray-500" title={String(e.visibility)}>
                      {EVENT_VISIBILITY_ICONS[e.visibility as EventVisibility]}
                    </span>
                  </div>
                  <div className="font-semibold text-gray-900 line-clamp-1">{e.title}</div>
                  {artistRole && (
                    <div className="text-[11px] text-gray-500 mt-1">{artistRole}</div>
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
