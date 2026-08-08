'use client'

import { useState } from 'react'
import { requestEmailChangeAction } from '@/server/actions/auth'

export default function EmailChangeSection({ currentEmail }: { currentEmail?: string }) {
  const [show, setShow] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage(null)
    setLoading(true)
    const result = await requestEmailChangeAction({ newEmail })
    setLoading(false)
    if (result.success) {
      setMessage({
        kind: 'success',
        text: `${newEmail} に確認メールを送信しました。リンクをクリックして変更を完了してください。`,
      })
      setNewEmail('')
    } else {
      setMessage({ kind: 'error', text: result.error })
    }
  }

  return (
    <div className="border rounded-xl p-4 sm:p-6 bg-gray-50">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <h2 className="font-bold text-gray-900">メールアドレス</h2>
          {currentEmail && (
            <p className="text-sm text-gray-500 mt-0.5 break-all">{currentEmail}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="shrink-0 text-sm border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-white transition"
        >
          {show ? 'キャンセル' : '変更する'}
        </button>
      </div>

      {show && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label htmlFor="new-email" className="block text-xs font-medium text-gray-600 mb-1">
              新しいメールアドレス
            </label>
            <input
              id="new-email"
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="new@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !newEmail}
            className="w-full bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50"
          >
            {loading ? '送信中...' : '確認メールを送る'}
          </button>
          <p className="text-xs text-gray-400">
            ※ 新しいメールアドレスに確認リンクが届きます。リンクをクリックすると変更が完了します（24 時間有効）。
          </p>
        </form>
      )}

      {message && (
        <p
          className={`mt-3 text-sm px-3 py-2 rounded-lg ${
            message.kind === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  )
}
