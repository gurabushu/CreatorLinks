'use client'

// ヘッダーの通知 Bell。
// - 初期未読数は SSR から props で渡される
// - Pusher があれば realtime で push 受信 → unread++ + toast
// - 無ければ 30 秒 polling (/api/notifications/unread) で後追い
// - クリックで /dashboard/notifications へ、サーバー側で既読化される

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { getPusherClient } from '@/lib/pusher-client'

type IncomingNotification = {
  id: string
  kind: string
  title: string
  body: string | null
  href: string | null
  createdAt: string
}

const POLL_INTERVAL_MS = 30_000
const TOAST_TTL_MS = 6000

export function NotificationBell({
  userId,
  initialUnread,
}: {
  userId: string
  initialUnread: number
}) {
  const [unread, setUnread] = useState(initialUnread)
  const [toasts, setToasts] = useState<IncomingNotification[]>([])
  const bootstrapped = useRef(false)

  // ---- Pusher subscription (ある場合のみ) ----
  useEffect(() => {
    const pusher = getPusherClient()
    if (!pusher) return

    const channel = pusher.subscribe(`private-user-${userId}`)

    const onNew = (payload: IncomingNotification) => {
      setUnread((c) => c + 1)
      setToasts((prev) => [...prev, payload])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== payload.id))
      }, TOAST_TTL_MS)
    }
    channel.bind('notification:new', onNew)

    return () => {
      channel.unbind('notification:new', onNew)
      pusher.unsubscribe(`private-user-${userId}`)
    }
  }, [userId])

  // ---- 30s polling fallback ----
  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout> | null = null

    const tick = async () => {
      try {
        const res = await fetch('/api/notifications/unread', { cache: 'no-store' })
        if (!res.ok) return
        const { count } = (await res.json()) as { count: number }
        if (!active) return
        // 現在表示中より大きければ更新（Pusher で既に反映済な場合もあるので最大値を採用）
        setUnread((c) => Math.max(c, count))
      } catch {
        /* 一時的なエラーは無視 */
      } finally {
        if (active) timer = setTimeout(tick, POLL_INTERVAL_MS)
      }
    }

    // 初回だけ即実行、以降は interval
    if (!bootstrapped.current) {
      bootstrapped.current = true
      timer = setTimeout(tick, POLL_INTERVAL_MS)
    }

    return () => {
      active = false
      if (timer) clearTimeout(timer)
    }
  }, [])

  return (
    <>
      <Link
        href="/dashboard/notifications"
        onClick={() => setUnread(0)}
        className="relative inline-flex items-center text-sm text-gray-600 hover:text-purple-600 transition"
        aria-label={`通知 (${unread} 件未読)`}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-4 text-center font-semibold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Link>

      {toasts.length > 0 && (
        <div className="fixed top-16 sm:top-20 right-2 sm:right-4 z-[60] flex flex-col gap-2 max-w-[90vw] sm:max-w-sm">
          {toasts.map((t) => (
            <Link
              key={t.id}
              href={t.href ?? '/dashboard/notifications'}
              onClick={() => {
                setToasts((prev) => prev.filter((x) => x.id !== t.id))
                setUnread(0)
              }}
              className="block bg-white border border-purple-200 shadow-lg rounded-lg p-3 text-sm hover:bg-purple-50 transition animate-[fadeIn_.2s_ease-out]"
            >
              <div className="font-semibold text-purple-700 text-xs mb-1">通知</div>
              <div className="text-gray-800 leading-snug">{t.title}</div>
              {t.body && <div className="text-gray-500 text-xs mt-0.5 truncate">{t.body}</div>}
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
