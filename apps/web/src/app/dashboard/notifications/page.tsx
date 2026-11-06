// app/dashboard/notifications/page.tsx — 通知履歴 (SSR)
//
// アクセス時点で未読を全て既読化してから表示。
// bell 側の未読バッジは next revalidate で消える。

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { listNotifications, markAllNotificationsRead } from '@/lib/notifications'
import { formatRelative } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const KIND_ICON: Record<string, string> = {
  FOLLOW: '👤',
  EVENT_RSVP: '🎉',
  EVENT_APPLY: '📨',
  EVENT_ACCEPTED: '✅',
  EVENT_REJECTED: '✖️',
  MATCH_APPLIED: '📨',
  MATCH_ACCEPTED: '✅',
  MATCH_REJECTED: '✖️',
  MATCH_COMPLETED: '🎁',
  MATCH_MESSAGE: '💬',
  SCOUT: '🎯',
  SUPPORT_MESSAGE: '🎧',
  PROMO_GRANTED: '🎖',
}

export default async function NotificationsPage() {
  const session = await auth()
  if (!session) redirect('/auth?next=/dashboard/notifications')

  const userId = session.user.id

  // 表示タイミングで未読を全既読化
  await markAllNotificationsRead(userId)
  const notifications = await listNotifications(userId, 100)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">通知</h1>
        <span className="text-xs text-gray-400">直近 100 件</span>
      </div>

      {notifications.length === 0 ? (
        <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          まだ通知はありません。
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg bg-white">
          {notifications.map((n) => {
            const icon = KIND_ICON[n.kind] ?? '🔔'
            const content = (
              <div className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50/40 transition">
                <span className="text-xl shrink-0 w-8 text-center">{icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{n.title}</p>
                  {n.body && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{n.body}</p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1">{formatRelative(n.createdAt)}</p>
                </div>
              </div>
            )
            return (
              <li key={n.id}>
                {n.href ? (
                  <Link href={n.href} className="block">{content}</Link>
                ) : (
                  content
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
