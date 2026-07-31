import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import { CreatePortfolioSchema } from '@creator-links/shared'

export const portfolioRouter = router({
  // ポートフォリオ登録
  create: protectedProcedure.input(CreatePortfolioSchema).mutation(async ({ ctx, input }) => {
    return ctx.prisma.portfolio.create({
      data: {
        ...input,
        userId: ctx.user.id,
      },
    })
  }),

  // ポートフォリオ削除（本人のみ）
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const portfolio = await ctx.prisma.portfolio.findUnique({ where: { id: input.id } })

      if (!portfolio) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'ポートフォリオが見つかりません' })
      }

      if (portfolio.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: '権限がありません' })
      }

      return ctx.prisma.portfolio.delete({ where: { id: input.id } })
    }),
})
