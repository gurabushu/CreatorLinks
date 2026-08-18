'use server'

// PRO 特典: 案件テンプレート
// - 案件作成フォームから「テンプレとして保存」で登録
// - 案件作成時にテンプレを選んで 1 タップでプレフィル
// - 自分のテンプレのみ操作可能

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import type { CommitmentLevel, ContractType } from '@creator-links/shared'

export type TemplateActionResult =
  | { success: true; id?: string }
  | { success: false; error: string; code?: 'PRO_REQUIRED' }

const MAX_LABEL = 50
const MAX_TITLE = 200
const MAX_DESC = 5000

export async function createProjectTemplateAction(input: {
  label: string
  title: string
  description?: string | null
  genres: string[]
  budget?: number | null
  contractType: ContractType
  commitmentLevel: CommitmentLevel
}): Promise<TemplateActionResult> {
  const session = await auth()
  if (!session) return { success: false, error: '認証が必要です' }

  // PRO 限定
  if (session.user.role !== 'PRO') {
    return {
      success: false,
      error: '案件テンプレート保存は PRO プランの特典です',
      code: 'PRO_REQUIRED',
    }
  }

  const label = input.label.trim()
  const title = input.title.trim()
  const description = input.description?.trim() || null
  if (!label) return { success: false, error: 'テンプレ名を入力してください' }
  if (label.length > MAX_LABEL) return { success: false, error: `テンプレ名は ${MAX_LABEL} 文字以内` }
  if (!title) return { success: false, error: '案件タイトルを入力してください' }
  if (title.length > MAX_TITLE) return { success: false, error: `タイトルは ${MAX_TITLE} 文字以内` }
  if (description && description.length > MAX_DESC) {
    return { success: false, error: `説明は ${MAX_DESC} 文字以内` }
  }

  const created = await prisma.projectTemplate.create({
    data: {
      userId: session.user.id,
      label,
      title,
      description,
      genres: input.genres,
      budget: input.budget ?? null,
      contractType: input.contractType,
      commitmentLevel: input.commitmentLevel,
    },
    select: { id: true },
  })

  revalidatePath('/projects/new')
  return { success: true, id: created.id }
}

export async function deleteProjectTemplateAction(id: string): Promise<TemplateActionResult> {
  const session = await auth()
  if (!session) return { success: false, error: '認証が必要です' }

  const template = await prisma.projectTemplate.findUnique({
    where: { id },
    select: { userId: true },
  })
  if (!template || template.userId !== session.user.id) {
    return { success: false, error: 'テンプレが見つかりません' }
  }

  await prisma.projectTemplate.delete({ where: { id } })
  revalidatePath('/projects/new')
  return { success: true }
}

export type MyTemplate = {
  id: string
  label: string
  title: string
  description: string | null
  genres: string[]
  budget: number | null
  contractType: ContractType
  commitmentLevel: CommitmentLevel
}

export type MyTemplatesBootstrap = {
  isPro: boolean
  templates: MyTemplate[]
}

// SSR / client 両方から呼べる list 関数
export async function listMyProjectTemplatesAction(): Promise<MyTemplatesBootstrap> {
  const session = await auth()
  if (!session) return { isPro: false, templates: [] }
  const templates = await prisma.projectTemplate.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      label: true,
      title: true,
      description: true,
      genres: true,
      budget: true,
      contractType: true,
      commitmentLevel: true,
    },
  })
  return { isPro: session.user.role === 'PRO', templates }
}
