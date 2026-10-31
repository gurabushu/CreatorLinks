'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CreateProjectSchema, UpdateProjectSchema } from '@creator-links/shared'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { inngest } from '@/lib/inngest'
import {
  getPusherServer,
  getUserChannel,
  MATCH_APPLIED_EVENT,
} from '@/lib/pusher-server'
import { getDisplayName } from '@/lib/user'

export type ProjectActionResult =
  | { success: true; projectId: string }
  | { success: false; error: string; field?: string }

// 案件作成
export async function createProjectAction(
  _prev: ProjectActionResult | null,
  formData: FormData
): Promise<ProjectActionResult> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }

  const raw = {
    title: formData.get('title'),
    description: formData.get('description') || undefined,
    genres: formData.getAll('genres') as string[],
    budget: formData.get('budget') ? Number(formData.get('budget')) : undefined,
    contractType: formData.get('contractType'),
    commitmentLevel: formData.get('commitmentLevel') || 'HOBBY',
    isPrivate: formData.get('isPrivate') === 'on' || formData.get('isPrivate') === 'true',
    scheduledStartAt: formData.get('scheduledStartAt') || undefined,
    scheduledEndAt: formData.get('scheduledEndAt') || undefined,
  }

  const parsed = CreateProjectSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.errors[0]
    return {
      success: false,
      error: first?.message ?? '入力内容を確認してください',
      field: String(first?.path[0] ?? 'general'),
    }
  }

  const { isPrivate, ...projectData } = parsed.data
  const project = await prisma.project.create({
    data: {
      ...projectData,
      status: isPrivate ? 'PRIVATE' : 'OPEN',
      clientId: session.user.id,
    },
  })

  revalidatePath('/projects')
  return { success: true, projectId: project.id }
}

// 案件応募
export async function applyToProjectAction(
  projectId: string,
  message?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project || project.deletedAt) return { success: false, error: '案件が見つかりません' }
  if (project.status !== 'OPEN') return { success: false, error: '現在募集していない案件です' }
  if (project.clientId === session.user.id) return { success: false, error: '自分の案件には応募できません' }

  // 重複応募チェック
  const existing = await prisma.match.findFirst({
    where: { projectId, artistId: session.user.id },
  })
  if (existing) return { success: false, error: 'すでに応募済みです' }

  const match = await prisma.match.create({
    data: {
      projectId,
      artistId: session.user.id,
      message: message ?? null,
    },
    include: {
      project: { include: { client: { select: { email: true, name: true, displayName: true } } } },
    },
  })

  // メール通知: 発注者へ応募を通知（projectId 指定で作成しているので project は必ず存在）
  const projectInfo = match.project!
  const client = projectInfo.client
  const artist = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, displayName: true },
  })
  const artistDisplayName = artist ? getDisplayName(artist) : 'アーティスト'
  await inngest.send({
    name: 'match/applied',
    data: {
      matchId: match.id,
      clientEmail: client.email,
      clientName: getDisplayName(client),
      artistName: artistDisplayName,
      projectTitle: projectInfo.title,
    },
  }).catch(() => {/* Inngest 未設定時は無視 */})

  // Pusher: 発注者のユーザーチャンネルへリアルタイム通知
  const pusher = await getPusherServer()
  if (pusher) {
    await pusher.trigger(getUserChannel(projectInfo.clientId), MATCH_APPLIED_EVENT, {
      matchId: match.id,
      projectId,
      projectTitle: projectInfo.title,
      counterpartName: artistDisplayName,
      createdAt: match.createdAt.toISOString(),
    })
  }

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

// 自分の非公開案件一覧（チャットで共有する選択肢を出すため）
// アーティスト名を取得（空き日オファーの banner 表示用）
export async function getArtistNameAction(
  artistId: string
): Promise<{ ok: true; name: string } | { ok: false }> {
  const user = await prisma.user.findUnique({
    where: { id: artistId },
    select: { name: true, displayName: true },
  })
  if (!user) return { ok: false }
  return { ok: true, name: getDisplayName(user) }
}

// 過去 Match から案件内容を引き継ぐ prefill（1 タップ再依頼）
// 認可: 発注者本人 (client) or 受注者本人 (artist) の Match だけ prefill 可能
export async function getProjectPrefillFromMatchAction(matchId: string): Promise<
  | {
      ok: true
      prefill: {
        title: string
        description: string | null
        genres: string[]
        contractType: string
        commitmentLevel: string
        budget: number | null
      }
    }
  | { ok: false; error: string }
> {
  const session = await auth()
  if (!session) return { ok: false, error: 'ログインが必要です' }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      artistId: true,
      project: {
        select: {
          clientId: true,
          title: true,
          description: true,
          genres: true,
          contractType: true,
          commitmentLevel: true,
          budget: true,
        },
      },
    },
  })
  if (!match || !match.project) return { ok: false, error: '対象の案件が見つかりません' }

  const isParticipant =
    match.artistId === session.user.id || match.project.clientId === session.user.id
  if (!isParticipant) return { ok: false, error: '権限がありません' }

  return {
    ok: true,
    prefill: {
      title: match.project.title,
      description: match.project.description,
      genres: match.project.genres,
      contractType: match.project.contractType,
      commitmentLevel: match.project.commitmentLevel,
      budget: match.project.budget,
    },
  }
}

export async function listMyPrivateProjectsAction() {
  const session = await auth()
  if (!session) return []
  try {
    return await prisma.project.findMany({
      where: { clientId: session.user.id, status: 'PRIVATE', deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        budget: true,
        contractType: true,
      },
    })
  } catch {
    return []
  }
}

// ---------------------------------------------------------------
// 編集・ステータス変更・削除
// 2026-11-01: 発注後に typo 修正 / 募集締切 / 取り下げ ができるよう追加。
// contractType だけは SPOT/SUBSCRIPTION 変更で決済フローが崩れるため編集禁止 (whitelist で弾く)。
// ACCEPTED 以降の match がある案件は削除禁止 (支払発生の恐れ)。
// ---------------------------------------------------------------

type UpdateResult = { success: true } | { success: false; error: string }

export async function updateProjectAction(
  projectId: string,
  formData: FormData
): Promise<UpdateResult> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }

  const existing = await prisma.project.findUnique({
    where: { id: projectId },
    select: { clientId: true, deletedAt: true, matches: { where: { status: { in: ['ACCEPTED', 'COMPLETED'] } }, select: { id: true }, take: 1 } },
  })
  if (!existing || existing.deletedAt) return { success: false, error: '案件が見つかりません' }
  if (existing.clientId !== session.user.id) return { success: false, error: '権限がありません' }

  const hasActiveMatch = existing.matches.length > 0

  // formData → raw object。空文字は undefined 扱い。
  const toStr = (k: string) => {
    const v = formData.get(k)
    return typeof v === 'string' && v !== '' ? v : undefined
  }
  const raw: Record<string, unknown> = {
    title: toStr('title'),
    description: toStr('description'),
    genres: formData.getAll('genres').filter((g): g is string => typeof g === 'string' && g !== ''),
    budget: toStr('budget') ? Number(toStr('budget')) : undefined,
    commitmentLevel: toStr('commitmentLevel'),
    status: toStr('status'),
    scheduledStartAt: toStr('scheduledStartAt'),
    scheduledEndAt: toStr('scheduledEndAt'),
  }
  // genres が空配列なら送らない (部分更新)
  if (Array.isArray(raw.genres) && (raw.genres as string[]).length === 0) delete raw.genres

  const parsed = UpdateProjectSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.errors[0]
    return { success: false, error: first?.message ?? '入力内容を確認してください' }
  }

  // contractType / clientId / createdAt は変更対象外 (shared schema に contractType 含まれるが server 側で明示的に落とす)
  const { contractType: _contractType, isPrivate: _isPrivate, ...safe } = parsed.data

  // ACCEPTED 以降 match がある案件は budget / commitmentLevel 変更禁止 (募集条件の後出し変更回避)
  if (hasActiveMatch && (safe.budget !== undefined || safe.commitmentLevel !== undefined)) {
    return {
      success: false,
      error: '承認済み応募がある案件の予算・本気度は変更できません',
    }
  }

  await prisma.project.update({
    where: { id: projectId },
    data: safe,
  })

  revalidatePath('/projects')
  revalidatePath('/projects/manage')
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function closeProjectAction(projectId: string): Promise<UpdateResult> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }

  const existing = await prisma.project.findUnique({
    where: { id: projectId },
    select: { clientId: true, deletedAt: true },
  })
  if (!existing || existing.deletedAt) return { success: false, error: '案件が見つかりません' }
  if (existing.clientId !== session.user.id) return { success: false, error: '権限がありません' }

  await prisma.project.update({
    where: { id: projectId },
    data: { status: 'CLOSED' },
  })

  revalidatePath('/projects')
  revalidatePath('/projects/manage')
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function deleteProjectAction(projectId: string): Promise<UpdateResult> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }

  const existing = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      clientId: true,
      deletedAt: true,
      matches: { where: { status: { in: ['ACCEPTED', 'COMPLETED'] } }, select: { id: true }, take: 1 },
    },
  })
  if (!existing || existing.deletedAt) return { success: false, error: '案件が見つかりません' }
  if (existing.clientId !== session.user.id) return { success: false, error: '権限がありません' }
  if (existing.matches.length > 0) {
    return { success: false, error: '承認済み応募がある案件は削除できません。先に募集を締め切ってください' }
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { deletedAt: new Date() },
  })

  revalidatePath('/projects')
  revalidatePath('/projects/manage')
  return { success: true }
}
