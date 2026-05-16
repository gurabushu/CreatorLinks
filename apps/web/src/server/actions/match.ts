'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getPusherServer, getChatChannel, MESSAGE_EVENT } from '@/lib/pusher-server'
import { inngest } from '@/lib/inngest'

export type MatchActionResult = { success: boolean; error?: string }

// マッチングステータス更新（発注者のみ）
export async function updateMatchStatusAction(
  matchId: string,
  status: 'ACCEPTED' | 'REJECTED'
): Promise<MatchActionResult> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { project: true },
  })

  if (!match) return { success: false, error: 'マッチングが見つかりません' }
  if (!match.project || !match.projectId) {
    return { success: false, error: '案件付きマッチではありません' }
  }
  if (match.project.clientId !== session.user.id) {
    return { success: false, error: '権限がありません' }
  }
  if (match.status !== 'APPLIED') {
    return { success: false, error: 'すでに処理済みです' }
  }

  await prisma.match.update({ where: { id: matchId }, data: { status } })

  // 承認時: Project ステータスを MATCHING に変更 + アーティストへメール通知
  if (status === 'ACCEPTED') {
    await prisma.project.update({
      where: { id: match.projectId },
      data: { status: 'MATCHING' },
    })

    // アーティストへ承認通知
    const artist = await prisma.user.findUnique({
      where: { id: match.artistId },
      select: { email: true, name: true },
    })
    if (artist) {
      await inngest.send({
        name: 'match/accepted',
        data: {
          matchId,
          artistEmail: artist.email,
          artistName: artist.name,
          clientName: session.user.name ?? '発注者',
          projectTitle: match.project.title,
        },
      }).catch(() => {/* Inngest 未設定時は無視 */})
    }
  }

  revalidatePath('/projects/manage')
  revalidatePath('/dashboard/matches')
  revalidatePath(`/projects/${match.projectId}`)

  return { success: true }
}

// 納品完了（アーティスト側から）
export async function completeMatchAction(matchId: string): Promise<MatchActionResult> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { project: true },
  })

  if (!match) return { success: false, error: 'マッチングが見つかりません' }
  if (!match.projectId) {
    return { success: false, error: '案件付きマッチではありません' }
  }
  if (match.artistId !== session.user.id) {
    return { success: false, error: '権限がありません' }
  }
  if (match.status !== 'ACCEPTED') {
    return { success: false, error: '承認済みの案件のみ完了できます' }
  }

  await prisma.match.update({ where: { id: matchId }, data: { status: 'COMPLETED' } })

  // Project ステータスを CLOSED に
  await prisma.project.update({
    where: { id: match.projectId },
    data: { status: 'CLOSED' },
  })

  revalidatePath(`/dashboard/chat/${matchId}`)
  revalidatePath('/dashboard/matches')

  return { success: true }
}

// レビュー投稿
export async function createReviewAction(
  matchId: string,
  score: number,
  comment?: string
): Promise<MatchActionResult> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { project: true },
  })

  if (!match) return { success: false, error: 'マッチングが見つかりません' }
  if (!match.project) {
    return { success: false, error: '案件付きマッチではありません' }
  }
  if (match.status !== 'COMPLETED') {
    return { success: false, error: '完了済みの案件のみレビューできます' }
  }

  // 発注者 or アーティストのみ
  const isParticipant =
    match.artistId === session.user.id || match.project.clientId === session.user.id
  if (!isParticipant) return { success: false, error: '権限がありません' }

  // 重複レビュー防止
  const existing = await prisma.review.findFirst({
    where: { matchId, reviewerId: session.user.id },
  })
  if (existing) return { success: false, error: 'すでにレビュー済みです' }

  if (score < 1 || score > 5) return { success: false, error: '評価は1〜5で入力してください' }

  await prisma.review.create({
    data: { matchId, reviewerId: session.user.id, score, comment },
  })

  // averageRating を再集計（アーティスト側の評価のみ）
  const agg = await prisma.review.aggregate({
    where: { match: { artistId: match.artistId } },
    _avg: { score: true },
  })

  await prisma.user.update({
    where: { id: match.artistId },
    data: { averageRating: agg._avg.score ?? 0 },
  })

  revalidatePath(`/dashboard/chat/${matchId}`)

  return { success: true }
}

// メッセージ送信（Server Action 版）
export async function sendMessageAction(
  matchId: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }
  if (!body.trim()) return { success: false, error: 'メッセージを入力してください' }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { project: true },
  })
  if (!match) return { success: false, error: 'チャットが見つかりません' }

  const isParticipant =
    match.artistId === session.user.id ||
    match.partnerUserId === session.user.id ||
    (match.project && match.project.clientId === session.user.id)
  if (!isParticipant) return { success: false, error: '権限がありません' }

  const message = await prisma.message.create({
    data: { matchId, senderId: session.user.id, body: body.trim() },
    include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
  })

  // 相手の未読メッセージを既読に（自分が送った場合は不要）
  await prisma.message.updateMany({
    where: { matchId, readAt: null, NOT: { senderId: session.user.id } },
    data: { readAt: new Date() },
  })

  // Pusher が設定されていればリアルタイム配信
  const pusher = await getPusherServer()
  if (pusher) {
    await pusher.trigger(getChatChannel(matchId), MESSAGE_EVENT, {
      id: message.id,
      senderId: message.senderId,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      readAt: message.readAt?.toISOString() ?? null,
      sender: message.sender,
    })
  }

  // 受信者へのメール通知（5分 debounce でまとめ送信）
  let recipientId: string
  if (match.project) {
    recipientId = match.artistId === session.user.id ? match.project.clientId : match.artistId
  } else {
    // P2P マッチ: artistId と partnerUserId のうち自分でない方
    recipientId =
      match.artistId === session.user.id ? match.partnerUserId! : match.artistId
  }
  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { email: true, name: true },
  })
  if (recipient) {
    await inngest.send({
      name: 'message/received',
      data: {
        matchId,
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        senderName: session.user.name ?? 'ユーザー',
        messagePreview: body.trim().slice(0, 100),
      },
    }).catch(() => {/* Inngest 未設定時は無視 */})
  }

  revalidatePath(`/dashboard/chat/${matchId}`)

  return { success: true }
}
