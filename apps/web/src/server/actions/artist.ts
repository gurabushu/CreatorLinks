'use server'

import { prisma } from '@/lib/prisma'

const ARTIST_SELECT = {
  id: true,
  name: true,
  role: true,
  genres: true,
  bio: true,
  avatarUrl: true,
  coverUrl: true,
  averageRating: true,
  earlyBirdSlot: true,
  featuredPortfolioId: true,
  featuredPortfolio: {
    select: { id: true, mediaType: true, title: true, fileKey: true },
  },
  portfolios: {
    take: 6,
    select: { id: true, mediaType: true, title: true, fileKey: true },
    orderBy: { createdAt: 'desc' as const },
  },
}

export async function listArtistsAction(params: {
  genres?: string[]
  cursor?: string
  limit?: number
}) {
  const { genres, cursor, limit = 12 } = params
  const items = await prisma.user.findMany({
    where: genres?.length ? { genres: { hasSome: genres } } : {},
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: [{ role: 'asc' }, { averageRating: 'desc' }],
    select: ARTIST_SELECT,
  })
  const nextCursor = items.length > limit ? items.pop()!.id : null
  return {
    items: items.map((u) => {
      // featured が portfolios.take: 6 の範囲外にあった場合は先頭にマージ
      const portfolios =
        u.featuredPortfolio && !u.portfolios.some((p) => p.id === u.featuredPortfolio!.id)
          ? [u.featuredPortfolio, ...u.portfolios]
          : u.portfolios
      return {
        ...u,
        portfolios,
        averageRating: Number(u.averageRating),
      }
    }),
    nextCursor,
  }
}
