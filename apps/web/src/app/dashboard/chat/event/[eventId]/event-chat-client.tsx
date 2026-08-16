'use client'

// Event グループチャット CSR コンポーネント。
// 1:1 chat-client (693 行) から payment/project-share/review/P2P の要素を全て落とし、
// 純粋なメッセージング + 複数人アバター表示 だけに絞ったスリム版。
// - Pusher 設定時はリアルタイム、未設定時は 5 秒ポーリングで listEventMessagesAction を叩く

import { useEffect, useRef, useState, useTransition } from 'react'
import { getPusherClient } from '@/lib/pusher-client'
import { getDisplayName } from '@/lib/user'
import {
  sendEventMessageAction,
  listEventMessagesAction,
} from '@/server/actions/event-chat'

interface Message {
  id: string
  senderId: string
  body: string
  createdAt: string
  sender: {
    id: string
    name: string
    displayName: string | null
    avatarUrl: string | null
  }
}

interface Member {
  id: string
  name: string
  displayName: string | null
  avatarUrl: string | null
}

interface Props {
  eventId: string
  currentUserId: string
  initialMessages: Message[]
  members: Member[]
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function EventChatClient({ eventId, currentUserId, initialMessages, members }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isSending, startSendTransition] = useTransition()
  const [sendError, setSendError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  // 新規メッセージ受信で下へオートスクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Pusher リアルタイム or ポーリング切替
  const [usePusher] = useState(() => Boolean(process.env.NEXT_PUBLIC_PUSHER_KEY))

  useEffect(() => {
    if (!usePusher) return
    const pusher = getPusherClient()
    if (!pusher) return
    const channel = pusher.subscribe(`private-event-chat-${eventId}`)
    channel.bind('new-message', (msg: Message) => {
      setMessages((prev) => {
        // 楽観的 UI の tmp- を差し替え or 追加
        const withoutTmp = prev.filter(
          (m) => !m.id.startsWith('tmp-') || m.senderId !== msg.senderId,
        )
        if (withoutTmp.some((m) => m.id === msg.id)) return withoutTmp
        return [...withoutTmp, msg]
      })
    })
    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`private-event-chat-${eventId}`)
    }
  }, [eventId, usePusher])

  // Pusher 未設定時のみ 5 秒ポーリング (server action 経由で権限もチェック)
  useEffect(() => {
    if (usePusher) return
    const iv = setInterval(async () => {
      const result = await listEventMessagesAction(eventId, 50)
      if (result.success) {
        const asc = [...result.messages].reverse().map((m) => ({
          id: m.id,
          senderId: m.senderId,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
          sender: m.sender,
        }))
        setMessages(asc)
      }
    }, 5000)
    return () => clearInterval(iv)
  }, [eventId, usePusher])

  const handleSend = () => {
    const body = input.trim()
    if (!body || isSending) return
    setSendError(null)
    const me = members.find((m) => m.id === currentUserId)
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      senderId: currentUserId,
      body,
      createdAt: new Date().toISOString(),
      sender: me ?? { id: currentUserId, name: 'あなた', displayName: null, avatarUrl: null },
    }
    setMessages((prev) => [...prev, optimistic])
    setInput('')
    startSendTransition(async () => {
      const result = await sendEventMessageAction(eventId, body)
      if (!result.success) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
        setSendError(result.error ?? 'エラーが発生しました')
        setInput(body)
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* メッセージリスト */}
      <div className="flex-1 overflow-y-auto py-2 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">
            まだメッセージはありません。最初の一言をどうぞ。
          </p>
        )}
        {messages.map((m) => {
          const isMe = m.senderId === currentUserId
          const name = getDisplayName(m.sender)
          return (
            <div key={m.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
              {/* アバター */}
              <div className="w-8 h-8 rounded-full bg-purple-200 overflow-hidden shrink-0 flex items-center justify-center text-purple-800 text-xs font-bold">
                {m.sender.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.sender.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  name.charAt(0)
                )}
              </div>
              <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className="text-[10px] text-gray-500 mb-0.5 px-1">
                  {name} · {formatTime(m.createdAt)}
                </div>
                <div
                  className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                    isMe
                      ? 'bg-purple-600 text-white rounded-tr-sm'
                      : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                  }`}
                >
                  {m.body}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* 入力フォーム */}
      <div className="border-t bg-white pt-3">
        {sendError && (
          <p className="text-xs text-red-600 mb-2 px-2">{sendError}</p>
        )}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力 (⌘+Enter で送信)"
            rows={2}
            maxLength={2000}
            disabled={isSending}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isSending ? '...' : '送信'}
          </button>
        </div>
      </div>
    </>
  )
}
