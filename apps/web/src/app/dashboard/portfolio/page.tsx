import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import PortfolioClient from './PortfolioClient'
import { FREE_PORTFOLIO_LIMIT } from '@/server/actions/portfolio'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'ポートフォリオ管理' }

export default async function PortfolioPage() {
  const session = await auth()
  if (!session) redirect('/auth')

  const [portfolios, user] = await Promise.all([
    prisma.portfolio.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { featuredPortfolioId: true, role: true },
    }),
  ])

  const isPro = user?.role === 'PRO'

  return (
    <PortfolioClient
      initialPortfolios={portfolios}
      initialFeaturedId={user?.featuredPortfolioId ?? null}
      isPro={isPro}
      freeLimit={FREE_PORTFOLIO_LIMIT}
    />
  )
}
