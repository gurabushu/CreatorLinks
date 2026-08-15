'use server'

// スカウト機能 (依頼主 → PRO アーティスト の逆方向オファー)
// - PRO 特典として PRO アーティストのみ受信可能。GENERAL アーティストへの送信は拒否
// - Match(status='SCOUTED', projectId=my project, artistId=対象) を作成
// - アーティストが受諾で ACCEPTED (通常フロー合流) / 辞退で REJECTED
// - @unique(projectId, artistId) 制約で同一プロジェクト × アーティストの重複スカウト防止

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'
import { revalidatePath } from 'next/cache'
import {
  getPusherServer,
  getUserChannel,
  MATCH_SCOUTED_EVENT,
  MATCH_ACCEPTED_EVENT,
  MATCH_REJECTED_EVENT,
} from '@/lib/pusher-server'
import { inngest } from '@/lib/inngest'
import { getDisplayName } from '@/lib/user'

export type ScoutActionResult =
  | { success: true; matchId: string }
  | { success: false; error: string }

export type RespondToScoutResult = { success: boolean; error?: string }

// 依頼主が PRO アーティストにオファーを送る。
// 引数の projectId は依頼主自身の Project (OPEN) を指定する。
export async function sendScoutAction(
  projectId: string,
  artistId: string,
  message?: string,
): Promise<ScoutActionResult> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }

  // レート制限: スカウトばら撒き防止 (message バケットを流用、1 分 30 件)
  const rl = await checkRateLimit('message', `scout:${session.user.id}`)
  if (!rl.ok) {
    return {
      success: false,
      error: `送信が速すぎます。${rl.retryAfterSec} 秒後に再試行してください`,
    }
  }

  // 対象アーティストが PRO かを検証 (PRO 特典なので GENERAL には送れない)
  const artist = await prisma.user.findUnique({
    where: { id: artistId },
    select: {
      id: true,
      role: true,
      isGuest: true,
      deletedAt: true,
      email: true,
      name: true,
      displayName: true,
    },
  })
  if (!artist || artist.deletedAt) {
    return { success: false, error: 'アーティストが見つかりません' }
  }
  if (artist.isGuest) {
    return { success: false, error: 'ゲストアカウントにはオファーを送れません' }
  }
  if (artist.role !== 'PRO') {
    return {
      success: false,
      error: 'このアーティストは PRO 会員ではないためオファーを受け取れません',
    }
  }
  if (artistId === session.user.id) {
    return { success: false, error: '自分自身にはオファーを送れません' }
  }

  // プロジェクトの所有者確認 + OPEN 状態のみ
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, clientId: true, title: true, status: true },
  })
  if (!project) return { success: false, error: '案件が見つかりません' }
  if (project.clientId !== session.user.id) {
    return { success: false, error: '権限がありません' }
  }
  if (project.status !== 'OPEN' && project.status !== 'PRIVATE') {
    return { success: false, error: '公開中または非公開の案件からのみオファーできます' }
  }

  // 重複送信 (同 project × artist) は @unique で防がれるが、ユーザー向けのエラー文言を出すために先に確認
  const existing = await prisma.match.findUnique({
    where: { projectId_artistId: { projectId, artistId } },
    select: { id: true, status: true },
  })
  if (existing) {
    return {
      success: false,
      error:
        existing.status === 'SCOUTED'
          ? 'すでにこのアーティストにオファー済みです'
          : 'このアーティストとは既にマッチングが成立しています',
    }
  }

  // Scout 作成
  const match = await prisma.match.create({
    data: {
      projectId,
      artistId,
      status: 'SCOUTED',
      message: message?.trim() || null,
    },
    select: { id: true },
  })

  // Pusher: アーティストにスカウト受信通知
  const client = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, displayName: true },
  })
  const pusher = await getPusherServer()
  if (pusher) {
    await pusher.trigger(getUserChannel(artistId), MATCH_SCOUTED_EVENT, {
      matchId: match.id,
      projectId,
      projectTitle: project.title,
      counterpartName: client ? getDisplayName(client) : '発注者',
      createdAt: new Date().toISOString(),
    })
  }

  // Inngest: メール通知 (message/received と別イベントで扱う)
  await inngest
    .send({
      name: 'match/scouted',
      data: {
        matchId: match.id,
        artistEmail: artist.email,
        artistName: getDisplayName(artist),
        clientName: client ? getDisplayName(client) : '発注者',
        projectTitle: project.title,
        messagePreview: message?.trim().slice(0, 100) ?? '',
      },
    })
    .catch(() => {
      /* Inngest 未設定時は無視 */
    })

  revalidatePath('/dashboard/matches')
  return { success: true, matchId: match.id }
}

// アーティストがスカウトに応答する (SCOUTED → ACCEPTED / REJECTED)
// updateMatchStatusAction が APPLIED 前提なので、SCOUTED 用に別関数として実装。
export async function respondToScoutAction(
  matchId: string,
  status: 'ACCEPTED' | 'REJECTED',
): Promise<RespondToScoutResult> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { project: true },
  })
  if (!match) return { success: false, error: 'マッチングが見つかりません' }
  if (match.artistId !== session.user.id) {
    return { success: false, error: '権限がありません' }
  }
  if (match.status !== 'SCOUTED') {
    return { success: false, error: 'スカウト待ちの案件のみ応答できます' }
  }

  await prisma.match.update({ where: { id: matchId }, data: { status } })

  // ACCEPTED なら Project を MATCHING に (通常フロー合流)
  if (status === 'ACCEPTED' && match.projectId) {
    await prisma.project.update({
      where: { id: match.projectId },
      data: { status: 'MATCHING' },
    })
  }

  // 発注者に応答通知
  if (match.project) {
    const artist = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, displayName: true, email: true },
    })
    const pusher = await getPusherServer()
    if (pusher) {
      const event = status === 'ACCEPTED' ? MATCH_ACCEPTED_EVENT : MATCH_REJECTED_EVENT
      await pusher.trigger(getUserChannel(match.project.clientId), event, {
        matchId,
        projectId: match.projectId,
        projectTitle: match.project.title,
        counterpartName: artist ? getDisplayName(artist) : 'アーティスト',
        createdAt: new Date().toISOString(),
      })
    }
    // ACCEPTED のみ発注者にメール送信 (拒否は静かに)
    if (status === 'ACCEPTED') {
      const client = await prisma.user.findUnique({
        where: { id: match.project.clientId },
        select: { email: true, name: true, displayName: true },
      })
      if (client && artist) {
        await inngest
          .send({
            name: 'scout/accepted',
            data: {
              matchId,
              clientEmail: client.email,
              clientName: getDisplayName(client),
              artistName: getDisplayName(artist),
              projectTitle: match.project.title,
            },
          })
          .catch(() => {
            /* Inngest 未設定時は無視 */
          })
      }
    }
  }

  revalidatePath('/dashboard/matches')
  if (match.projectId) revalidatePath(`/projects/${match.projectId}`)
  return { success: true }
}
