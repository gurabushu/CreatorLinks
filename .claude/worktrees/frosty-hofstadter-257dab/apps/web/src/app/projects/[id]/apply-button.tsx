'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { applyToProjectAction } from '@/server/actions/project'

interface Props {
  projectId: string
  isLoggedIn: boolean
  isOwner: boolean
  alreadyApplied: boolean
  projectStatus: string
}

export function ApplyButton({ projectId, isLoggedIn, isOwner, alreadyApplied, projectStatus }: Props) {
  const router = useRouter()
  const [showMessageInput, setShowMessageInput] = useState(false)
  const [message, setMessage] = useState('')

  const [state, action, isPending] = useActionState(
    async (_prev: { success: boolean; error?: string } | null, formData: FormData) => {
      const msg = formData.get('message') as string | null
      const result = await applyToProjectAction(projectId, msg ?? undefined)
      if (result.success) {
        router.refresh()
      }
      return result
    },
    null
  )

  if (!isLoggedIn) {
    return (
      <a
        href={`/auth?callbackUrl=/projects/${projectId}`}
        className="w-full block text-center bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition text-sm"
      >
        ログインして応募する
      </a>
    )
  }

  if (isOwner) {
    return (
      <a
        href="/projects/manage"
        className="w-full block text-center border border-purple-300 text-purple-600 py-3 rounded-xl font-medium hover:bg-purple-50 transition text-sm"
      >
        応募者を確認する →
      </a>
    )
  }

  if (projectStatus !== 'OPEN') {
    return (
      <span className="w-full block text-center bg-gray-100 text-gray-400 py-3 rounded-xl text-sm">
        募集終了
      </span>
    )
  }

  if (alreadyApplied || state?.success) {
    return (
      <div className="text-center py-3">
        <span className="text-green-600 font-medium text-sm">✅ 応募済み</span>
        <p className="text-xs text-gray-400 mt-1">依頼者からの返信をお待ちください</p>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-3">
      {showMessageInput && (
        <textarea
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="応募メッセージ（任意）: あなたのスキルや、この案件への意気込みを伝えましょう"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
        />
      )}

      {state?.error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state?.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition disabled:opacity-50 text-sm"
      >
        {isPending ? '応募中...' : 'この案件に応募する'}
      </button>

      <button
        type="button"
        onClick={() => setShowMessageInput(!showMessageInput)}
        className="w-full text-xs text-gray-400 hover:text-gray-600 transition"
      >
        {showMessageInput ? '▲ メッセージを非表示' : '▼ 応募メッセージを追加（任意）'}
      </button>
    </form>
  )
}
