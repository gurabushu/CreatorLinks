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
    <div className="flex items-center gap-3">
      <button
        onClick={toggle}
        disabled={isPending}
        className={`text-sm px-4 py-2 rounded-lg border transition disabled:opacity-50 ${
          isFollowing
            ? 'bg-white border-gray-300 text-gray-700 hover:border-red-300 hover:text-red-600'
            : 'bg-purple-600 border-purple-600 text-white hover:bg-purple-700'
        }`}
      >
        {isPending ? '処理中...' : isFollowing ? 'フォロー中' : '＋ フォロー'}
      </button>
      <span className="text-xs text-gray-500">
        フォロワー <span className="font-semibold text-gray-800">{followerCount}</span>
      </span>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

// 未ログイン向け: フォロワー数のみ表示、ボタンなし
export function FollowerCountBadge({ count }: { count: number }) {
  return (
    <div className="text-xs text-gray-500">
      フォロワー <span className="font-semibold text-gray-800">{count}</span>
    </div>
  )
}
