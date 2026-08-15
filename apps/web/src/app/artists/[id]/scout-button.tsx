'use client'

// スカウトボタン (依頼主 → PRO アーティスト) と発注モーダル。
// - viewer が PRO アーティスト詳細を開いた時のみ表示 (server 側で判定して isVisible=true 時のみマウント)
// - 自分の OPEN Project (or PRIVATE) から 1 件選び、メッセージを添えて送信

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { sendScoutAction } from '@/server/actions/scout'

export type ScoutableProject = {
  id: string
  title: string
  budget: number | null
}

interface Props {
  artistId: string
  artistName: string
  myProjects: ScoutableProject[]
}

export function ScoutButton({ artistId, artistName, myProjects }: Props) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string>(myProjects[0]?.id ?? '')
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const hasProjects = myProjects.length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProjectId) {
      setError('案件を選択してください')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await sendScoutAction(selectedProjectId, artistId, message || undefined)
      if (result.success) {
        setIsOpen(false)
        setMessage('')
        // 送信済みマッチの chat 画面に飛ばして UX を閉じる
        router.push(`/dashboard/chat/${result.matchId}`)
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 px-4 py-2 rounded-xl transition-opacity shadow-sm"
        title={`${artistName} にオファーを送る`}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 2 11 13" />
          <path d="M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
        <span>オファーを送る</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-1">オファーを送る</h2>
            <p className="text-xs text-gray-500 mb-5">
              PRO アーティスト <span className="font-medium">{artistName}</span> に、あなたの案件からオファーを送信します。
            </p>

            {!hasProjects ? (
              <div className="text-sm text-gray-600 py-6 text-center border rounded-lg bg-gray-50">
                <p>送信できる案件がありません。</p>
                <p className="text-xs text-gray-500 mt-2">
                  まず案件を作成してください:{' '}
                  <a href="/projects/new" className="text-purple-700 underline">
                    + 新規案件
                  </a>
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="scout-project" className="block text-xs font-medium text-gray-700 mb-1">
                    案件を選ぶ
                  </label>
                  <select
                    id="scout-project"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {myProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                        {p.budget != null ? ` (¥${p.budget.toLocaleString()})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="scout-message" className="block text-xs font-medium text-gray-700 mb-1">
                    メッセージ (任意)
                  </label>
                  <textarea
                    id="scout-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    maxLength={1000}
                    placeholder="ぜひあなたにお願いしたいです、等"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                    {error}
                  </p>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    disabled={isPending}
                    className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || !selectedProjectId}
                    className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg font-bold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? '送信中...' : '送信'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
