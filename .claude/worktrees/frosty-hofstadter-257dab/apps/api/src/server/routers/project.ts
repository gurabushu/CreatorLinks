import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { CreateProjectSchema, ProjectFilterSchema, UpdateProjectSchema } from '@creator-links/shared'

export const projectRouter = router({
  // 案件一覧（フィルタ・カーソルページング）
  list: publicProcedure.input(ProjectFilterSchema).query(async ({ ctx, input }) => {
    const { genres, contractType, status, cursor, limit } = input

    const items = await ctx.prisma.project.findMany({
      where: {
        status: status ?? 'OPEN',
        ...(contractType ? { contractType } : {}),
        ...(genres && genres.length > 0 ? { genres: { hasSome: genres } } : {}),
      },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: { id: true, name: true, avatarUrl: true, averageRating: true },
        },
        _count: { select: { matches: true } },
      },
    })

    let nextCursor: string | null = null
    if (items.length > limit) {
      nextCursor = items.pop()!.id
    }

    return { items, nextCursor, total: items.length }
  }),

  // 案件詳細
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.id },
        include: {
          client: {
            select: { id: true, name: true, avatarUrl: true, averageRating: true },
          },
          matches: {
            include: {
              artist: {
                select: { id: true, name: true, avatarUrl: true, averageRating: true, genres: true },
              },
            },
          },
        },
      })

      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '案件が見つかりません' })
      }

      return project
    }),

  // 案件作成
  create: protectedProcedure
    .input(CreateProjectSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.project.create({
        data: {
          ...input,
          clientId: ctx.user.id,
        },
      })
    }),

  // 案件更新（発注者本人のみ）
  update: protectedProcedure
    .input(z.object({ id: z.string(), data: UpdateProjectSchema }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUnique({ where: { id: input.id } })

      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '案件が見つかりません' })
      }

      if (project.clientId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: '権限がありません' })
      }

      return ctx.prisma.project.update({
        where: { id: input.id },
        data: input.data,
      })
    }),

  // 自分が作成した案件一覧
  myProjects: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.project.findMany({
      where: { clientId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { matches: true } } },
    })
  }),
})
