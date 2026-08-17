'use client'

// フォロー中一覧の client 部分。
// 各行のインライン「解除」ボタンで unfollowUserAction を呼び、
// 楽観的にリストから消す (再取得は router.refresh で親 SSR に任せる)。

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { unfollowUserAction } from '@/server/actions/follow'
import { getDisplayName } from '@/lib/user'
import { FoundingMemberBadge } from '@/components/early-bird/founding-member-badge'
import { OfficialBadge } from '@/components/official-badge'

type Item = {
  followedAt: string
  user: {
    id: string
    name: string
    displayName: string | null
    role: 'GENERAL' | 'PRO' | 'ADMIN'
    avatarUrl: string | null
    genres: string[]
    bio: string | null
    earlyBirdSlot: number | null
    isOfficial: boolean
    averageRating: number
    hasActiveStory: boolean
  }
}

export function FollowingListClient({ initialItems }: { initialItems: Item[] }) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [pending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState<string | null>(null)

  const handleUnfollow = (userId: string) => {
    setConfirming(null)
    // 楽観的更新: 先にリストから消す
    setItems((prev) => prev.filter((i) => i.user.id !== userId))
    startTransition(async () => {
      const res = await unfollowUserAction(userId)
      if (!res.success) {
        // 失敗したら状態を復元 (簡易: refresh で SSR を再取得)
        router.refresh()
      }
    })
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const u = item.user
        return (
          <li
            key={u.id}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:p-4"
          >
            {/* アバター + Story あり時のグラデリング */}
            <Link href={`/artists/${u.id}`} className="shrink-0">
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full p-[2px] ${
                  u.hasActiveStory
                    ? 'bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-400'
                    : 'bg-gray-200'
                }`}
              >
                <div className="w-full h-full rounded-full bg-white p-[2px]">
                  {u.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={u.avatarUrl}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gray-100" />
                  )}
                </div>
              </div>
            </Link>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link
                  href={`/artists/${u.id}`}
                  className="text-sm font-semibold text-gray-900 hover:text-purple-700 truncate"
                >
                  {getDisplayName(u)}
                </Link>
                {u.isOfficial && <OfficialBadge />}
                {u.role === 'PRO' && (
                  <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-semibold">
                    PRO
                  </span>
                )}
                {u.earlyBirdSlot !== null && (
                  <FoundingMemberBadge slot={u.earlyBirdSlot} showTotal={false} />
                )}
              </div>
              {u.genres.length > 0 && (
                <p className="text-[11px] text-gray-500 truncate">{u.genres.join(' · ')}</p>
              )}
              {u.bio && (
                <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{u.bio}</p>
              )}
            </div>

            {confirming === u.id ? (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleUnfollow(u.id)}
                  disabled={pending}
                  className="text-xs bg-red-500 hover:bg-red-600 text-white px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                >
                  解除
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(null)}
                  className="text-xs border border-gray-300 text-gray-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(u.id)}
                className="text-xs border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 shrink-0"
              >
                フォロー中
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
