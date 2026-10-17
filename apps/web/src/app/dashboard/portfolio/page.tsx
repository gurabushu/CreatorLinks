import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import PortfolioClient from './PortfolioClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: '活動記録 (作品管理)' }

export default async function PortfolioPage() {
  const session = await auth()
  if (!session) redirect('/auth')

  // 2026-10-17 fee-only pivot: PRO 限定の 10 件上限は撤廃、全ユーザー無制限。
  const [portfolios, user] = await Promise.all([
    prisma.portfolio.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { featuredPortfolioId: true },
    }),
  ])

  return (
    <PortfolioClient
      initialPortfolios={portfolios}
      initialFeaturedId={user?.featuredPortfolioId ?? null}
    />
  )
}
