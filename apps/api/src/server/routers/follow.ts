import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'

// =============================================
// フォロー（Phase A.6）
// User 間の SNS 型フォロー。Event.visibility=FOLLOWERS の判定基盤にも使う。
// EventFollow (通知購読) とは別モデル。
// =============================================

export const followRouter = router({
  follow: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '自分自身はフォローできません' })
      }
      const target = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true },
      })
      if (!target) throw new TRPCError({ code: 'NOT_FOUND', message: 'ユーザーが見つかりません' })

      return ctx.prisma.follow.upsert({
        where: {
          followerId_followingId: {
            followerId: ctx.user.id,
            followingId: input.userId,
          },
        },
        create: { followerId: ctx.user.id, followingId: input.userId },
        update: {},
      })
    }),

  unfollow: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.follow.deleteMany({
        where: { followerId: ctx.user.id, followingId: input.userId },
      })
      return { ok: true }
    }),

  isFollowing: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const follow = await ctx.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: ctx.user.id,
            followingId: input.userId,
          },
        },
        select: { id: true },
      })
      return { isFollowing: !!follow }
    }),

  // 統計情報（プロフィール表示用）: 誰でも取得可能
  counts: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [followers, following] = await Promise.all([
        ctx.prisma.follow.count({ where: { followingId: input.userId } }),
        ctx.prisma.follow.count({ where: { followerId: input.userId } }),
      ])
      return { followers, following }
    }),

  // フォロワー一覧
  followers: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.prisma.follow.findMany({
        where: { followingId: input.userId },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          follower: {
            select: { id: true, name: true, displayName: true, avatarUrl: true },
          },
        },
      })
      let nextCursor: string | null = null
      if (items.length > input.limit) nextCursor = items.pop()!.id
      return { items: items.map((f) => f.follower), nextCursor }
    }),

  // フォロー中一覧
  following: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.prisma.follow.findMany({
        where: { followerId: input.userId },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          following: {
            select: { id: true, name: true, displayName: true, avatarUrl: true },
          },
        },
      })
      let nextCursor: string | null = null
      if (items.length > input.limit) nextCursor = items.pop()!.id
      return { items: items.map((f) => f.following), nextCursor }
    }),
})
