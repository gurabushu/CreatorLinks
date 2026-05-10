'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { sendMessageAction, completeMatchAction, createReviewAction } from '@/server/actions/match'
import { useInterval } from '@/hooks/use-interval'
import { getPusherClient } from '@/lib/pusher-client'

interface Message {
  id: string
  senderId: string
  body: string
  createdAt: string
  readAt: string | null
  sender: { id: string; name: string; avatarUrl: string | null }
}

interface Props {
  matchId: string
  currentUserId: string
  isArtist: boolean
  match: {
    status: string
    projectTitle: string
    projectId: string
    partnerName: string
    partnerAvatar: string | null
  }
  initialMessages: Message[]
}

// ---- レビューモーダル ----
function ReviewModal({
  matchId,
  onClose,
}: {
  matchId: string
  onClose: () => void
}) {
  const [score, setScore] = useState(5)
  const [comment, setComment] = useState('')
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await createReviewAction(matchId, score, comment || undefined)
      if (result.success) setDone(true)
    })
  }

  if (done) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-3">⭐</div>
          <p className="font-bold text-lg mb-1">レビューを投稿しました</p>
          <p className="text-gray-500 text-sm mb-5">ありがとうございます</p>
          <button
            onClick={onClose}
            className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold"
          >
            閉じる
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
        <h2 className="font-bold text-lg mb-4">レビューを投稿する</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">評価</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScore(s)}
                  className={`w-10 h-10 rounded-full text-lg transition ${
                    score >= s ? 'text-yellow-400' : 'text-gray-200'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">コメント（任意）</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="取引の感想を書いてください"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 py-3 rounded-xl text-sm font-medium"
            >
              あとで
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50"
            >
              {isPending ? '投稿中...' : '投稿する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---- メインチャット ----
export function ChatClient({
  matchId,
  currentUserId,
  isArtist,
  match,
  initialMessages,
}: Props) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isSending, startSendTransition] = useTransition()
  const [isCompleting, startCompleteTransition] = useTransition()
  const [showReview, setShowReview] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isCompleted = match.status === 'COMPLETED'

  // 自動スクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Pusher または 3 秒ポーリング（環境変数で切り替え）
  const [usePusher] = useState(() => Boolean(process.env.NEXT_PUBLIC_PUSHER_KEY))

  useEffect(() => {
    if (!usePusher || isCompleted) return

    const pusher = getPusherClient()
    if (!pusher) return

    const channel = pusher.subscribe(`private-chat-${matchId}`)
    channel.bind('new-message', (msg: Message) => {
      setMessages((prev) => {
        // 楽観的UIの仮メッセージを確定メッセージに置き換え or 追加
        const withoutTmp = prev.filter(
          (m) => !m.id.startsWith('tmp-') || m.senderId !== msg.senderId
        )
        const alreadyExists = withoutTmp.some((m) => m.id === msg.id)
        return alreadyExists ? withoutTmp : [...withoutTmp, msg]
      })
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`private-chat-${matchId}`)
    }
  }, [matchId, usePusher, isCompleted])

  // Pusher 未設定時のみポーリング
  useInterval(async () => {
    if (isCompleted || usePusher) return
    try {
      const res = await fetch(`/api/messages/${matchId}`)
      if (res.ok) {
        const data: Message[] = await res.json()
        setMessages(data)
      }
    } catch {
      // ネットワークエラーは無視
    }
  }, 3000)

  const handleSend = () => {
    const body = input.trim()
    if (!body || isSending) return
    setSendError(null)

    // 楽観的UI: 先に表示
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      senderId: currentUserId,
      body,
      createdAt: new Date().toISOString(),
      readAt: null,
      sender: { id: currentUserId, name: 'あなた', avatarUrl: null },
    }
    setMessages((prev) => [...prev, optimistic])
    setInput('')

    startSendTransition(async () => {
      const result = await sendMessageAction(matchId, body)
      if (!result.success) {
        // ロールバック
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
        setSendError(result.error ?? 'エラーが発生しました')
        setInput(body)
      }
      // 成功: 次のポーリングで確定メッセージに置き換わる
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleComplete = () => {
    if (!confirm('納品を完了してよろしいですか？この操作は取り消せません。')) return
    startCompleteTransition(async () => {
      const result = await completeMatchAction(matchId)
      if (result.success) {
        setShowReview(true)
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-3xl mx-auto">
      {/* ヘッダー */}
      <div className="border-b bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/matches" className="text-gray-400 hover:text-gray-600 text-sm">
            ←
          </Link>
          {match.partnerAvatar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={match.partnerAvatar}
              alt={match.partnerName}
              className="w-8 h-8 rounded-full object-cover"
            />
          )}
          <div>
            <p className="font-medium text-sm leading-none">{match.partnerName}</p>
            <Link
              href={`/projects/${match.projectId}`}
              className="text-xs text-gray-400 hover:text-purple-600"
            >
              {match.projectTitle}
            </Link>
          </div>
        </div>

        {/* 完了ボタン（アーティスト & ACCEPTED 状態のみ） */}
        {isArtist && !isCompleted && (
          <button
            onClick={handleComplete}
            disabled={isCompleting}
            className="text-xs bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isCompleting ? '処理中...' : '✅ 納品完了'}
          </button>
        )}

        {isCompleted && (
          <div className="flex items-center gap-2">
            <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
              完了済み
            </span>
            <button
              onClick={() => setShowReview(true)}
              className="text-xs text-purple-600 hover:underline"
            >
              レビューを書く
            </button>
          </div>
        )}
      </div>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">
            メッセージを送って会話を始めましょう
          </p>
        )}

        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2`}>
              {!isMe && (
                <div className="w-7 h-7 rounded-full bg-purple-200 overflow-hidden shrink-0 mt-1">
                  {msg.sender.avatarUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={msg.sender.avatarUrl}
                      alt={msg.sender.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              )}
              <div className={`max-w-[72%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isMe
                      ? 'bg-purple-600 text-white rounded-tr-sm'
                      : 'bg-white text-gray-800 shadow-sm rounded-tl-sm'
                  }`}
                >
                  {msg.body}
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5 px-1">
                  {new Date(msg.createdAt).toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {isMe && msg.readAt && (
                    <span className="ml-1 text-purple-400">既読</span>
                  )}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* 入力エリア */}
      {!isCompleted ? (
        <div className="border-t bg-white px-4 py-3">
          {sendError && (
            <p className="text-xs text-red-500 mb-2">{sendError}</p>
          )}
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              maxLength={5000}
              placeholder="メッセージを入力... (⌘+Enter で送信)"
              className="flex-1 border border-gray-300 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none max-h-32 overflow-y-auto"
              style={{ height: 'auto' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              className="bg-purple-600 text-white px-5 py-3 rounded-2xl font-medium hover:bg-purple-700 transition disabled:opacity-40 shrink-0 text-sm"
            >
              送信
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t bg-gray-50 px-4 py-3 text-center text-sm text-gray-400">
          この案件は完了しました
        </div>
      )}

      {/* レビューモーダル */}
      {showReview && (
        <ReviewModal matchId={matchId} onClose={() => setShowReview(false)} />
      )}
    </div>
  )
}
