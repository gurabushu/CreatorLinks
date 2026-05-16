'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CreatePortfolioSchema, type CreatePortfolioInput } from '@creator-links/shared'
import { revalidatePath } from 'next/cache'

export async function createPortfolioAction(data: CreatePortfolioInput) {
  const session = await auth()
  if (!session) return { success: false as const, error: '認証が必要です' }

  const parsed = CreatePortfolioSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false as const, error: '入力内容が正しくありません' }
  }

  try {
    await prisma.portfolio.create({
      data: { ...parsed.data, userId: session.user.id },
    })
    revalidatePath('/dashboard/portfolio')
    return { success: true as const }
  } catch {
    return { success: false as const, error: 'ポートフォリオの作成に失敗しました' }
  }
}

export async function deletePortfolioAction(id: string) {
  const session = await auth()
  if (!session) return { success: false as const, error: '認証が必要です' }

  try {
    const portfolio = await prisma.portfolio.findUnique({ where: { id } })
    if (!portfolio || portfolio.userId !== session.user.id) {
      return { success: false as const, error: 'ポートフォリオが見つかりません' }
    }
    await prisma.portfolio.delete({ where: { id } })
    revalidatePath('/dashboard/portfolio')
    return { success: true as const }
  } catch {
    return { success: false as const, error: '削除に失敗しました' }
  }
}

// アーティスト一覧のメインに表示する作品を 1 件設定（null で解除）
export async function setFeaturedPortfolioAction(portfolioId: string | null) {
  const session = await auth()
  if (!session) return { success: false as const, error: '認証が必要です' }

  try {
    if (portfolioId) {
      const p = await prisma.portfolio.findUnique({ where: { id: portfolioId } })
      if (!p || p.userId !== session.user.id) {
        return { success: false as const, error: 'ポートフォリオが見つかりません' }
      }
    }
    await prisma.user.update({
      where: { id: session.user.id },
      data: { featuredPortfolioId: portfolioId },
    })
    revalidatePath('/dashboard/portfolio')
    revalidatePath('/artists')
    revalidatePath(`/artists/${session.user.id}`)
    return { success: true as const }
  } catch {
    return { success: false as const, error: 'メイン作品の更新に失敗しました' }
  }
}
