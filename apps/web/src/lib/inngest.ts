// lib/inngest.ts — Inngest クライアント（バックグラウンドジョブ用）
import { Inngest } from 'inngest'
import { SITE_NAME } from './brand'

// id は Inngest 側の識別子でリブランド後もそのまま。表示名のみ SITE_NAME 経由に。
export const inngest = new Inngest({
  id: 'creator-links',
  name: SITE_NAME,
})

// ---- イベント型定義 ----
export type EncoreCueEvents = {
  // マッチング承認通知
  'match/accepted': {
    data: {
      matchId: string
      artistEmail: string
      artistName: string
      clientName: string
      projectTitle: string
    }
  }
  // 新着メッセージ通知（未読が一定時間続いた場合）
  'message/received': {
    data: {
      matchId: string
      recipientEmail: string
      recipientName: string
      senderName: string
      messagePreview: string
    }
  }
  // 応募受付通知（発注者へ）
  'match/applied': {
    data: {
      matchId: string
      clientEmail: string
      clientName: string
      artistName: string
      projectTitle: string
    }
  }
  // P2P マッチ成立（双方の Like 完成）
  'match/p2p-matched': {
    data: {
      matchId: string
      userAEmail: string
      userAName: string
      userBEmail: string
      userBName: string
    }
  }
}
