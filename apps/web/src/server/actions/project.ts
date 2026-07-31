'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CreateProjectSchema } from '@creator-links/shared'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { inngest } from '@/lib/inngest'
import {
  getPusherServer,
  getUserChannel,
  MATCH_APPLIED_EVENT,
} from '@/lib/pusher-server'

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
    isPrivate: formData.get('isPrivate') === 'on' || formData.get('isPrivate') === 'true',
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
  if (!project) return { success: false, error: '案件が見つかりません' }
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
      project: { include: { client: { select: { email: true, name: true } } } },
    },
  })

  // メール通知: 発注者へ応募を通知（projectId 指定で作成しているので project は必ず存在）
  const projectInfo = match.project!
  const client = projectInfo.client
  await inngest.send({
    name: 'match/applied',
    data: {
      matchId: match.id,
      clientEmail: client.email,
      clientName: client.name,
      artistName: session.user.name ?? 'アーティスト',
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
      counterpartName: session.user.name ?? 'アーティスト',
      createdAt: match.createdAt.toISOString(),
    })
  }

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

// 自分の非公開案件一覧（チャットで共有する選択肢を出すため）
export async function listMyPrivateProjectsAction() {
  const session = await auth()
  if (!session) return []
  try {
    return await prisma.project.findMany({
      where: { clientId: session.user.id, status: 'PRIVATE' },
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
