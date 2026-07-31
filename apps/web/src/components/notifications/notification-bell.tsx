'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { getPusherClient } from '@/lib/pusher-client'

type MatchNotification = {
  id: string
  kind: 'applied' | 'accepted' | 'rejected' | 'completed'
  title: string
  body: string
  href: string
}

type IncomingPayload = {
  matchId: string
  projectId: string | null
  projectTitle: string
  counterpartName: string
  createdAt: string
}

const KIND_TO_LABEL: Record<MatchNotification['kind'], { title: string; verb: string }> = {
  applied: { title: '新しい応募', verb: 'があなたの案件に応募しました' },
  accepted: { title: '応募が承認されました', verb: 'があなたの応募を承認しました' },
  rejected: { title: '応募が却下されました', verb: 'があなたの応募を却下しました' },
  completed: { title: '納品完了', verb: 'が納品を完了しました' },
}

const TOAST_TTL_MS = 6000

export function NotificationBell({ userId }: { userId: string }) {
  const [unread, setUnread] = useState(0)
  const [toasts, setToasts] = useState<MatchNotification[]>([])

  const push = useCallback((n: MatchNotification) => {
    setUnread((c) => c + 1)
    setToasts((prev) => [...prev, n])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== n.id))
    }, TOAST_TTL_MS)
  }, [])

  useEffect(() => {
    const pusher = getPusherClient()
    if (!pusher) return

    const channel = pusher.subscribe(`private-user-${userId}`)

    const handler = (kind: MatchNotification['kind']) => (payload: IncomingPayload) => {
      const label = KIND_TO_LABEL[kind]
      const href = kind === 'applied'
        ? '/projects/manage'
        : kind === 'completed'
          ? '/projects/manage'
          : '/dashboard/matches'

      push({
        id: `${payload.matchId}-${kind}-${payload.createdAt}`,
        kind,
        title: label.title,
        body: `${payload.counterpartName} ${label.verb}（案件：${payload.projectTitle}）`,
        href,
      })
    }

    channel.bind('match:applied', handler('applied'))
    channel.bind('match:accepted', handler('accepted'))
    channel.bind('match:rejected', handler('rejected'))
    channel.bind('match:completed', handler('completed'))

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`private-user-${userId}`)
    }
  }, [userId, push])

  return (
    <>
      <Link
        href="/dashboard"
        onClick={() => setUnread(0)}
        className="relative hidden sm:inline text-sm text-gray-600 hover:text-purple-600 transition"
      >
        マイページ
        {unread > 0 && (
          <span className="absolute -top-1 -right-3 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-4 text-center font-semibold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Link>

      {toasts.length > 0 && (
        <div className="fixed top-16 sm:top-20 right-2 sm:right-4 z-[60] flex flex-col gap-2 max-w-[90vw] sm:max-w-sm">
          {toasts.map((t) => (
            <Link
              key={t.id}
              href={t.href}
              onClick={() => {
                setToasts((prev) => prev.filter((x) => x.id !== t.id))
                setUnread(0)
              }}
              className="block bg-white border border-purple-200 shadow-lg rounded-lg p-3 text-sm hover:bg-purple-50 transition animate-[fadeIn_.2s_ease-out]"
            >
              <div className="font-semibold text-purple-700 text-xs mb-1">{t.title}</div>
              <div className="text-gray-800 leading-snug">{t.body}</div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
