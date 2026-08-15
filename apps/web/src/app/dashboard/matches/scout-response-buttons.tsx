'use client'

// スカウト受信者 (アーティスト) 用の 承諾 / 辞退 ボタン。
// respondToScoutAction を叩いて server 側の Match ステータス遷移をトリガー。

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { respondToScoutAction } from '@/server/actions/scout'

interface Props {
  matchId: string
}

export function ScoutResponseButtons({ matchId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handle = (status: 'ACCEPTED' | 'REJECTED') => {
    setError(null)
    startTransition(async () => {
      const result = await respondToScoutAction(matchId, status)
      if (result.success) {
        // ACCEPTED は chat に飛ばして続き対応、REJECTED は一覧を再取得
        if (status === 'ACCEPTED') {
          router.push(`/dashboard/chat/${matchId}`)
        } else {
          router.refresh()
        }
      } else {
        setError(result.error ?? 'エラーが発生しました')
      }
    })
  }

  return (
    <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
      <div className="flex gap-2">
        <button
          onClick={() => handle('ACCEPTED')}
          disabled={isPending}
          className="flex-1 text-sm bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isPending ? '...' : '承諾'}
        </button>
        <button
          onClick={() => handle('REJECTED')}
          disabled={isPending}
          className="flex-1 text-sm border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          辞退
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
