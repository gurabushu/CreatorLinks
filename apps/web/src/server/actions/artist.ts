'use server'

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  HEIGHT_BUCKET_RANGES,
  type CommitmentLevel,
  type Gender,
  type HeightBucket,
} from '@creator-links/shared'

const ARTIST_SELECT = {
  id: true,
  name: true,
  displayName: true,
  role: true,
  genres: true,
  bio: true,
  avatarUrl: true,
  coverUrl: true,
  averageRating: true,
  earlyBirdSlot: true,
  featuredPortfolioId: true,
  gender: true,
  heightCm: true,
  activityYears: true,
  skillLevel: true,
  instruments: true,
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
  q?: string
  gender?: Gender
  skillLevel?: CommitmentLevel
  heightBuckets?: HeightBucket[]
  instruments?: string[]
  cursor?: string
  limit?: number
}) {
  const {
    genres,
    q,
    gender,
    skillLevel,
    heightBuckets,
    instruments,
    cursor,
    limit = 12,
  } = params
  const trimmed = q?.trim()
  const andConds: Prisma.UserWhereInput[] = [
    { isOfficial: false }, // 公式アカウントはアーティスト一覧に載せない
    { isGuest: false },    // 24h で消えるゲストも除外
  ]

  if (genres?.length) andConds.push({ genres: { hasSome: genres } })
  if (gender) andConds.push({ gender })
  if (skillLevel) andConds.push({ skillLevel })
  if (instruments?.length) andConds.push({ instruments: { hasSome: instruments } })

  if (trimmed) {
    andConds.push({
      OR: [
        { name: { contains: trimmed, mode: 'insensitive' } },
        { bio: { contains: trimmed, mode: 'insensitive' } },
        { genres: { has: trimmed } },
      ],
    })
  }

  if (heightBuckets?.length) {
    // 選択した段階の和集合。各段階を半開区間 [min, max) の OR で表現
    andConds.push({
      OR: heightBuckets.map((b) => {
        const range = HEIGHT_BUCKET_RANGES[b]
        const cond: Prisma.UserWhereInput = {}
        if (range.minCm !== null && range.maxCm !== null) {
          cond.heightCm = { gte: range.minCm, lt: range.maxCm }
        } else if (range.minCm !== null) {
          cond.heightCm = { gte: range.minCm }
        } else if (range.maxCm !== null) {
          cond.heightCm = { lt: range.maxCm }
        }
        return cond
      }),
    })
  }

  const where: Prisma.UserWhereInput = andConds.length > 0 ? { AND: andConds } : {}

  const items = await prisma.user.findMany({
    where,
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
