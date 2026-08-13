'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  applyToOpenRoleAction,
  clearInterestAction,
  toggleInterestAction,
} from '@/server/actions/event'

export function EventInterestButton({
  eventId,
  currentIsAttending,
}: {
  eventId: string
  currentIsAttending: boolean | null // null = 未表明
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [state, setState] = useState<boolean | null>(currentIsAttending)

  const set = (isAttending: boolean | null) => {
    startTransition(async () => {
      if (isAttending === null) {
        await clearInterestAction(eventId)
      } else {
        await toggleInterestAction(eventId, isAttending)
      }
      setState(isAttending)
      router.refresh()
    })
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => set(state === true ? null : true)}
        disabled={isPending}
        className={`text-sm px-4 py-2 rounded-lg border transition disabled:opacity-50 ${
          state === true
            ? 'bg-purple-600 border-purple-600 text-white'
            : 'bg-white border-gray-300 text-gray-700 hover:border-purple-400'
        }`}
      >
        行く
      </button>
      <button
        onClick={() => set(state === false ? null : false)}
        disabled={isPending}
        className={`text-sm px-4 py-2 rounded-lg border transition disabled:opacity-50 ${
          state === false
            ? 'bg-pink-100 border-pink-300 text-pink-700'
            : 'bg-white border-gray-300 text-gray-700 hover:border-pink-300'
        }`}
      >
        興味あり
      </button>
    </div>
  )
}

export function ApplyToRoleButton({ openRoleId }: { openRoleId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')

  const apply = () => {
    setMsg(null)
    startTransition(async () => {
      const result = await applyToOpenRoleAction(openRoleId, message || undefined)
      if (result.success) {
        setMsg('応募を送信しました')
        setShowForm(false)
        setMessage('')
        router.refresh()
      } else {
        setMsg(result.error)
      }
    })
  }

  if (showForm) {
    return (
      <div className="w-full max-w-xs">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="応募メッセージ（任意）"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs mb-2"
        />
        <div className="flex gap-2">
          <button
            onClick={apply}
            disabled={isPending}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50"
          >
            {isPending ? '送信中...' : '送信'}
          </button>
          <button
            onClick={() => setShowForm(false)}
            className="text-xs bg-white border border-gray-300 hover:border-gray-400 text-gray-700 px-3 py-1.5 rounded-lg transition"
          >
            キャンセル
          </button>
        </div>
        {msg && <p className="mt-2 text-xs text-red-600">{msg}</p>}
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => setShowForm(true)}
        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition whitespace-nowrap"
      >
        応募する
      </button>
      {msg && <p className="mt-1 text-[11px] text-emerald-700">{msg}</p>}
    </div>
  )
}
