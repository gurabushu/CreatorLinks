'use server'

// Linktree 型 外部リンクの CRUD Server Action。
// - 認可: 自分のリンクのみ操作可能
// - URL: HTTP/HTTPS のみ (javascript:, data: 等は拒否)
// - 上限: 1 ユーザーあたり 15 個 (spam / bio 肥大化防止)

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import type { ExternalLinkPlatform } from '@creator-links/shared'
import { EXTERNAL_LINK_PLATFORMS } from '@creator-links/shared'

const MAX_LINKS = 15
const MAX_LABEL_LEN = 30

export type ExternalLinkActionResult =
  | { success: true; id: string }
  | { success: false; error: string }

export type DeleteResult = { success: boolean; error?: string }

function isValidHttpUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

// upsert = 既存 id ならその row を更新、新規なら作成。
// position は新規時のみ、既存の最大 + 1 を割り当てる。
export async function upsertExternalLinkAction(input: {
  id?: string
  platform: ExternalLinkPlatform
  url: string
  label?: string | null
}): Promise<ExternalLinkActionResult> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }

  if (!EXTERNAL_LINK_PLATFORMS.includes(input.platform)) {
    return { success: false, error: 'プラットフォームが無効です' }
  }
  const url = input.url.trim()
  if (!isValidHttpUrl(url)) {
    return { success: false, error: 'URL は http:// または https:// で始まる必要があります' }
  }
  const label = input.label?.trim() || null
  if (label && label.length > MAX_LABEL_LEN) {
    return { success: false, error: `ラベルは ${MAX_LABEL_LEN} 文字以内で入力してください` }
  }

  // 更新パス: 既存 id が自分のものか確認
  if (input.id) {
    const existing = await prisma.userExternalLink.findUnique({
      where: { id: input.id },
      select: { userId: true },
    })
    if (!existing) return { success: false, error: 'リンクが見つかりません' }
    if (existing.userId !== session.user.id) {
      return { success: false, error: '権限がありません' }
    }
    const updated = await prisma.userExternalLink.update({
      where: { id: input.id },
      data: { platform: input.platform, url, label },
      select: { id: true },
    })
    revalidatePath('/dashboard/profile')
    revalidatePath(`/artists/${session.user.id}`)
    return { success: true, id: updated.id }
  }

  // 新規: 上限チェック + 末尾に追加
  const count = await prisma.userExternalLink.count({ where: { userId: session.user.id } })
  if (count >= MAX_LINKS) {
    return { success: false, error: `リンクは最大 ${MAX_LINKS} 個までです` }
  }
  const maxPos = await prisma.userExternalLink.findFirst({
    where: { userId: session.user.id },
    orderBy: { position: 'desc' },
    select: { position: true },
  })
  const created = await prisma.userExternalLink.create({
    data: {
      userId: session.user.id,
      platform: input.platform,
      url,
      label,
      position: (maxPos?.position ?? -1) + 1,
    },
    select: { id: true },
  })
  revalidatePath('/dashboard/profile')
  revalidatePath(`/artists/${session.user.id}`)
  return { success: true, id: created.id }
}

export async function deleteExternalLinkAction(id: string): Promise<DeleteResult> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }

  const existing = await prisma.userExternalLink.findUnique({
    where: { id },
    select: { userId: true },
  })
  if (!existing) return { success: false, error: 'リンクが見つかりません' }
  if (existing.userId !== session.user.id) {
    return { success: false, error: '権限がありません' }
  }

  await prisma.userExternalLink.delete({ where: { id } })
  revalidatePath('/dashboard/profile')
  revalidatePath(`/artists/${session.user.id}`)
  return { success: true }
}

// 並べ替え: id[] を position の昇順に一括反映
export async function reorderExternalLinksAction(
  orderedIds: string[],
): Promise<DeleteResult> {
  const session = await auth()
  if (!session) return { success: false, error: 'ログインが必要です' }

  // 全 id が自分のものか確認 (他人の id が混じっていたら reject)
  const rows = await prisma.userExternalLink.findMany({
    where: { id: { in: orderedIds } },
    select: { id: true, userId: true },
  })
  if (rows.length !== orderedIds.length) {
    return { success: false, error: '一部リンクが見つかりません' }
  }
  if (rows.some((r) => r.userId !== session.user.id)) {
    return { success: false, error: '権限がありません' }
  }

  await prisma.$transaction(
    orderedIds.map((id, position) =>
      prisma.userExternalLink.update({ where: { id }, data: { position } }),
    ),
  )
  revalidatePath('/dashboard/profile')
  revalidatePath(`/artists/${session.user.id}`)
  return { success: true }
}
