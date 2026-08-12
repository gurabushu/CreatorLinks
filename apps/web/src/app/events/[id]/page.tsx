// イベント詳細: Phase A 最小 UI
// 主催者・出演者・公募枠・参加ボタンを表示。応募・興味表明は client island で。

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getDisplayName } from '@/lib/user'
import {
  EVENT_TYPE_LABELS,
  EVENT_PARTICIPANT_ROLE_LABELS,
  EVENT_STATUS_LABELS,
  EVENT_VISIBILITY_LABELS,
  EVENT_VISIBILITY_ICONS,
} from '@creator-links/shared'
import type {
  EventType,
  EventParticipantRole,
  EventStatus,
  EventVisibility,
} from '@creator-links/shared'
import { EventInterestButton, ApplyToRoleButton } from './client-actions'
import { jstDatetime } from '@/lib/jst-date'

export const dynamic = 'force-dynamic'

// Vercel Node runtime は UTC 動作。JST で表示するため jst-date ヘルパー経由に統一。
const fmt = jstDatetime

// 既存レコードに javascript: 等が混ざっていても <a href> を発火させないための防衛層。
// スキーマ側でも http/https のみを受け付けているが、旧データや直接 DB 経由を想定して二重で弾く。
function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

type Params = { params: Promise<{ id: string }> }

export default async function EventDetailPage({ params }: Params) {
  const { id } = await params
  const session = await auth()

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      creator: {
        select: { id: true, name: true, displayName: true, avatarUrl: true, averageRating: true },
      },
      participants: {
        include: {
          user: { select: { id: true, name: true, displayName: true, avatarUrl: true } },
        },
        orderBy: { invitedAt: 'asc' },
      },
      openRoles: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!event) notFound()

  // Phase A.5: visibility チェック
  const viewerId = session?.user?.id ?? null
  const isCreator = viewerId && viewerId === event.creatorId
  const isParticipant = viewerId
    ? event.participants.some((p) => p.userId === viewerId)
    : false

  const canView = await (async () => {
    if (isCreator || isParticipant) return true
    if (event.visibility === 'PUBLIC') return true
    if (event.visibility === 'FOLLOWERS' && viewerId) {
      // Phase A.6: Follow モデルで判定（EventFollow は通知購読専用）
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: viewerId,
            followingId: event.creatorId,
          },
        },
        select: { id: true },
      })
      return !!follow
    }
    return false
  })()

  if (!canView) notFound()

  const myInterest = session
    ? await prisma.eventInterest.findUnique({
        where: { userId_eventId: { userId: session.user.id, eventId: id } },
      })
    : null

  const isPublished = event.status === 'PUBLISHED'

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-purple-700 mb-2 flex-wrap">
          <span className="font-medium">
            {EVENT_TYPE_LABELS[event.type as EventType]}
          </span>
          <span>·</span>
          <span>{EVENT_STATUS_LABELS[event.status as EventStatus]}</span>
          <span>·</span>
          <span title={EVENT_VISIBILITY_LABELS[event.visibility as EventVisibility]}>
            {EVENT_VISIBILITY_ICONS[event.visibility as EventVisibility]}{' '}
            {EVENT_VISIBILITY_LABELS[event.visibility as EventVisibility]}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          {event.title}
        </h1>
        <p className="text-sm text-gray-500">
          主催 <Link href={`/artists/${event.creator.id}`} className="text-purple-700 hover:underline">
            {getDisplayName(event.creator)}
          </Link>
        </p>
      </div>

      {event.coverUrl && (
        <img
          src={event.coverUrl}
          alt=""
          className="w-full aspect-video object-cover rounded-xl mb-6"
        />
      )}

      {/* 基本情報 */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-6 space-y-2 text-sm">
        <div>
          <span className="text-gray-500 mr-2">開始</span>
          <span className="font-medium">{fmt(event.startAt)}</span>
        </div>
        {event.endAt && (
          <div>
            <span className="text-gray-500 mr-2">終了</span>
            <span className="font-medium">{fmt(event.endAt)}</span>
          </div>
        )}
        {event.venueName && (
          <div>
            <span className="text-gray-500 mr-2">会場</span>
            <span className="font-medium">{event.venueName}</span>
            {event.venueAddress && <span className="text-gray-500 ml-2">{event.venueAddress}</span>}
          </div>
        )}
        {event.city && (
          <div>
            <span className="text-gray-500 mr-2">エリア</span>
            <span>{event.city}</span>
          </div>
        )}
        {event.genres.length > 0 && (
          <div>
            <span className="text-gray-500 mr-2">ジャンル</span>
            <span>{event.genres.join(' · ')}</span>
          </div>
        )}
        {(() => {
          const href = safeHttpUrl(event.ticketUrl)
          if (!href) return null
          return (
            <div>
              <span className="text-gray-500 mr-2">チケット</span>
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-purple-700 hover:underline">
                {event.isFree ? '無料' : event.ticketPriceYen ? `¥${event.ticketPriceYen.toLocaleString()}` : 'チケット情報'}
              </a>
            </div>
          )
        })()}
      </div>

      {/* 参加表明ボタン（ログインユーザーのみ、非主催者） */}
      {session && !isCreator && isPublished && (
        <div className="mb-6">
          <EventInterestButton
            eventId={event.id}
            currentIsAttending={myInterest?.isAttending ?? null}
          />
        </div>
      )}

      {/* 説明 */}
      {event.description && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">詳細</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {event.description}
          </p>
        </div>
      )}

      {/* 公募枠 */}
      {event.openRoles.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">出演・スタッフ募集</h2>
          <ul className="space-y-2">
            {event.openRoles.map((role) => (
              <li key={role.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="text-xs text-emerald-700 mb-1">
                      {EVENT_PARTICIPANT_ROLE_LABELS[role.roleType as EventParticipantRole]}
                    </div>
                    <div className="font-medium text-gray-900">{role.title}</div>
                    {role.description && (
                      <p className="text-xs text-gray-600 mt-1">{role.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500">
                      <span>募集 {role.filledCount} / {role.requiredCount}</span>
                      {role.compensation !== null && (
                        <span className="text-purple-700">
                          ¥{role.compensation.toLocaleString()}
                        </span>
                      )}
                      {!role.isPaid && <span>ボランティア</span>}
                      <span>{role.status === 'OPEN' ? '募集中' : role.status === 'FILLED' ? '定員到達' : '締切'}</span>
                    </div>
                  </div>
                  {session && !isCreator && role.status === 'OPEN' && (
                    <ApplyToRoleButton openRoleId={role.id} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 参加者 */}
      {event.participants.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">
            出演者・スタッフ ({event.participants.filter(p => p.status === 'CONFIRMED').length})
          </h2>
          <ul className="grid sm:grid-cols-2 gap-2">
            {event.participants
              .filter((p) => p.status === 'CONFIRMED')
              .map((p) => (
                <li key={p.id} className="rounded-lg border border-gray-200 bg-white p-3 flex items-center gap-3">
                  {p.user.avatarUrl ? (
                    <img src={p.user.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gray-200" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{getDisplayName(p.user)}</div>
                    <div className="text-[11px] text-gray-500">
                      {EVENT_PARTICIPANT_ROLE_LABELS[p.role as EventParticipantRole]}
                      {p.note && ` · ${p.note}`}
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* 主催者操作 */}
      {isCreator && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-sm font-semibold text-gray-500 mb-3">主催者操作</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/events/${event.id}/edit`}
              className="text-sm bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition"
            >
              編集
            </Link>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            公募枠追加・招待送信・公開/中止 は近日追加予定
          </p>
        </div>
      )}
    </div>
  )
}
