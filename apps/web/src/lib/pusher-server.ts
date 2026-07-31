// lib/pusher-server.ts — サーバーサイド Pusher（Server Action / Route Handler から使う）
// PUSHER_APP_ID / PUSHER_SECRET が設定されていない場合は null を返す

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pusher: any = null

export async function getPusherServer() {
  if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_SECRET || !process.env.NEXT_PUBLIC_PUSHER_KEY) {
    return null
  }

  if (!_pusher) {
    const Pusher = (await import('pusher')).default
    _pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? 'ap3',
      useTLS: true,
    })
  }

  return _pusher
}

// チャンネル名の命名規則: private-chat-{matchId}
export const getChatChannel = (matchId: string) => `private-chat-${matchId}`
export const MESSAGE_EVENT = 'new-message'

// ユーザーごとの通知チャンネル: private-user-{userId}
// マッチのライフサイクル通知（応募着信・承認・却下・完了）を配信する
export const getUserChannel = (userId: string) => `private-user-${userId}`

export const MATCH_APPLIED_EVENT = 'match:applied'
export const MATCH_ACCEPTED_EVENT = 'match:accepted'
export const MATCH_REJECTED_EVENT = 'match:rejected'
export const MATCH_COMPLETED_EVENT = 'match:completed'

export type MatchNotificationPayload = {
  matchId: string
  projectId: string | null
  projectTitle: string
  counterpartName: string
  createdAt: string
}
