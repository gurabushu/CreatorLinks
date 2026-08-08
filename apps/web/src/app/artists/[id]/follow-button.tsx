'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { followUserAction, unfollowUserAction } from '@/server/actions/follow'

export function FollowButton({
  targetUserId,
  initialIsFollowing,
  initialFollowerCount,
}: {
  targetUserId: string
  initialIsFollowing: boolean
  initialFollowerCount: number
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [followerCount, setFollowerCount] = useState(initialFollowerCount)
  const [error, setError] = useState<string | null>(null)

  const toggle = () => {
    setError(null)
    const nextFollowing = !isFollowing
    const delta = nextFollowing ? 1 : -1

    // optimistic update
    setIsFollowing(nextFollowing)
    setFollowerCount((c) => Math.max(0, c + delta))

    startTransition(async () => {
      const result = nextFollowing
        ? await followUserAction(targetUserId)
        : await unfollowUserAction(targetUserId)
      if (!result.success) {
        // rollback
        setIsFollowing(!nextFollowing)
        setFollowerCount((c) => Math.max(0, c - delta))
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      <button
        onClick={toggle}
        disabled={isPending}
        className={`inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border transition-colors disabled:opacity-50 ${
          isFollowing
            ? 'bg-white border-purple-200 text-purple-700 hover:border-red-300 hover:text-red-600 hover:bg-red-50'
            : 'bg-gradient-to-r from-purple-600 to-purple-500 border-transparent text-white hover:from-purple-700 hover:to-purple-600 shadow-sm shadow-purple-300/40'
        }`}
      >
        {isPending ? '処理中...' : isFollowing ? '✓ フォロー中' : '＋ フォロー'}
      </button>
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200/70 px-3 py-2 rounded-xl">
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <span className="font-bold tabular-nums">{followerCount}</span>
        <span className="text-purple-600/80">フォロワー</span>
      </span>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

// 未ログイン向け: フォロワー数のみ表示、ボタンなし
export function FollowerCountBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200/70 px-3 py-2 rounded-xl">
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
      <span className="font-bold tabular-nums">{count}</span>
      <span className="text-purple-600/80">フォロワー</span>
    </span>
  )
}
