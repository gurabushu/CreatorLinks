import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { UpdateProfileSchema } from '@creator-links/shared'

export const userRouter = router({
  // ユーザー詳細取得（公開）
  getProfile: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        include: { portfolios: true },
        omit: { passwordHash: true },
      })

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'ユーザーが見つかりません' })
      }

      return user
    }),

  // アーティスト一覧（公開）
  listArtists: publicProcedure
    .input(
      z.object({
        genres: z.array(z.string()).optional(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { genres, cursor, limit } = input

      const items = await ctx.prisma.user.findMany({
        where: {
          ...(genres && genres.length > 0
            ? { genres: { hasSome: genres } }
            : {}),
        },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: [
          { role: 'asc' }, // PRO が先頭
          { averageRating: 'desc' },
        ],
        select: {
          id: true,
          name: true,
          role: true,
          genres: true,
          bio: true,
          avatarUrl: true,
          averageRating: true,
          portfolios: { take: 3, orderBy: { createdAt: 'desc' } },
        },
      })

      let nextCursor: string | null = null
      if (items.length > limit) {
        nextCursor = items.pop()!.id
      }

      return { items, nextCursor, total: items.length }
    }),

  // 自分のプロフィール取得
  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      omit: { passwordHash: true },
      include: {
        portfolios: { orderBy: { createdAt: 'desc' } },
      },
    })
  }),

  // プロフィール更新
  updateProfile: protectedProcedure
    .input(UpdateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: input,
        omit: { passwordHash: true },
      })
    }),

  // アバター URL 更新（Uploadthing アップロード完了後に呼び出す）
  updateAvatar: protectedProcedure
    .input(z.object({ avatarUrl: z.string().url('有効な URL を指定してください') }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { avatarUrl: input.avatarUrl },
        omit: { passwordHash: true },
      })
    }),
})
