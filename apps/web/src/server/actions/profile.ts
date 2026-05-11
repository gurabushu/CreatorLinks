'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UpdateProfileSchema, type UpdateProfileInput } from '@creator-links/shared'
import { revalidatePath } from 'next/cache'

export async function updateProfileAction(data: UpdateProfileInput) {
  const session = await auth()
  if (!session) return { success: false as const, error: '認証が必要です' }

  const parsed = UpdateProfileSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false as const, error: '入力内容が正しくありません' }
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: parsed.data,
    })
    revalidatePath('/dashboard/profile')
    return { success: true as const }
  } catch {
    return { success: false as const, error: 'プロフィールの更新に失敗しました' }
  }
}

export async function updateAvatarAction(avatarUrl: string) {
  const session = await auth()
  if (!session) return { success: false as const, error: '認証が必要です' }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl },
    })
    revalidatePath('/dashboard/profile')
    return { success: true as const }
  } catch {
    return { success: false as const, error: 'アバターの更新に失敗しました' }
  }
}

export async function updateCoverImageAction(coverUrl: string) {
  const session = await auth()
  if (!session) return { success: false as const, error: '認証が必要です' }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { coverUrl },
    })
    revalidatePath('/dashboard/profile')
    revalidatePath('/artists')
    revalidatePath(`/artists/${session.user.id}`)
    return { success: true as const }
  } catch {
    return { success: false as const, error: 'ジャケット画像の更新に失敗しました' }
  }
}
