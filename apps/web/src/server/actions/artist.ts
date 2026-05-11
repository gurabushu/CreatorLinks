'use server'

import { prisma } from '@/lib/prisma'

const ARTIST_SELECT = {
  id: true,
  name: true,
  role: true,
  genres: true,
  bio: true,
  avatarUrl: true,
  averageRating: true,
  portfolios: {
    take: 3,
    select: { id: true, mediaType: true, title: true },
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
    items: items.map((u) => ({ ...u, averageRating: Number(u.averageRating) })),
    nextCursor,
  }
}
