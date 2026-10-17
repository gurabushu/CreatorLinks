'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { updateMatchStatusAction } from '@/server/actions/match'

type MatchStatus = 'APPLIED' | 'ACCEPTED' | 'COMPLETED' | 'REJECTED'

interface Match {
  id: string
  status: MatchStatus
}

interface Props {
  match: Match
}

const STATUS_BADGE: Record<MatchStatus, { label: string; className: string }> = {
  APPLIED: { label: '応募中', className: 'bg-zinc-100 text-zinc-700' },
  ACCEPTED: { label: '承認済み', className: 'bg-zinc-100 text-zinc-700' },
  COMPLETED: { label: '完了', className: 'bg-zinc-100 text-zinc-700' },
  REJECTED: { label: '却下済み', className: 'bg-red-100 text-red-600' },
}

export function ManageMatchButtons({ match }: Props) {
  const [status, setStatus] = useState<MatchStatus>(match.status)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleUpdate = (nextStatus: 'ACCEPTED' | 'REJECTED') => {
    setError(null)
    startTransition(async () => {
      // 楽観的UI: 先に表示を更新
      setStatus(nextStatus)
      const result = await updateMatchStatusAction(match.id, nextStatus)
      if (!result.success) {
        setStatus(match.status) // ロールバック
        setError(result.error ?? 'エラーが発生しました')
      }
    })
  }

  if (status === 'APPLIED') {
    return (
      <div className="flex items-center gap-2 shrink-0">
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          onClick={() => handleUpdate('REJECTED')}
          disabled={isPending}
          className="text-sm border border-gray-300 text-gray-600 px-4 py-1.5 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
        >
          却下
        </button>
        <button
          onClick={() => handleUpdate('ACCEPTED')}
          disabled={isPending}
          className="text-sm bg-zinc-600 text-white px-4 py-1.5 rounded-lg hover:bg-zinc-700 transition disabled:opacity-50"
        >
          {isPending ? '処理中...' : '承認'}
        </button>
      </div>
    )
  }

  const badge = STATUS_BADGE[status]

  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${badge.className}`}>
        {badge.label}
      </span>
      {status === 'ACCEPTED' && (
        <Link
          href={`/dashboard/chat/${match.id}`}
          className="text-xs text-purple-600 border border-purple-300 px-3 py-1.5 rounded-lg hover:bg-purple-50 transition"
        >
          チャット →
        </Link>
      )}
    </div>
  )
}
