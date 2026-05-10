import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import {
  ApplyMatchSchema,
  UpdateMatchStatusSchema,
  SendMessageSchema,
  CreateReviewSchema,
} from '@creator-links/shared'

export const matchRouter = router({
  // 案件応募（アーティスト）
  apply: protectedProcedure.input(ApplyMatchSchema).mutation(async ({ ctx, input }) => {
    const project = await ctx.prisma.project.findUnique({ where: { id: input.projectId } })

    if (!project) {
      throw new TRPCError({ code: 'NOT_FOUND', message: '案件が見つかりません' })
    }

    if (project.status !== 'OPEN') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: '現在募集していない案件です' })
    }

    if (project.clientId === ctx.user.id) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: '自分の案件には応募できません' })
    }

    // 重複応募チェック
    const existing = await ctx.prisma.match.findFirst({
      where: { projectId: input.projectId, artistId: ctx.user.id },
    })
    if (existing) {
      throw new TRPCError({ code: 'CONFLICT', message: 'すでに応募済みです' })
    }

    return ctx.prisma.match.create({
      data: {
        projectId: input.projectId,
        artistId: ctx.user.id,
        message: input.message,
      },
    })
  }),

  // 承認 / 却下 / 完了（発注者）
  updateStatus: protectedProcedure
    .input(UpdateMatchStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const match = await ctx.prisma.match.findUnique({
        where: { id: input.id },
        include: { project: true },
      })

      if (!match) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'マッチングが見つかりません' })
      }

      if (match.project.clientId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: '権限がありません' })
      }

      if (match.status !== 'APPLIED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'すでに処理済みです' })
      }

      const updated = await ctx.prisma.match.update({
        where: { id: input.id },
        data: { status: input.status },
      })

      // ACCEPTED 時: Pusher でチャットルーム開放通知
      // if (input.status === 'ACCEPTED') { ... }

      return updated
    }),

  // 自分の応募一覧（アーティスト）
  myMatches: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.match.findMany({
      where: { artistId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        project: {
          include: {
            client: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    })
  }),
})

export const messageRouter = router({
  // メッセージ一覧（当事者のみ）
  list: protectedProcedure
    .input(z.object({ matchId: z.string() }))
    .query(async ({ ctx, input }) => {
      const match = await ctx.prisma.match.findUnique({ where: { id: input.matchId } })

      if (!match) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'マッチングが見つかりません' })
      }

      const isParticipant =
        match.artistId === ctx.user.id ||
        (await ctx.prisma.project
          .findUnique({ where: { id: match.projectId } })
          .then((p) => p?.clientId === ctx.user.id))

      if (!isParticipant) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'アクセス権限がありません' })
      }

      return ctx.prisma.message.findMany({
        where: { matchId: input.matchId },
        orderBy: { createdAt: 'asc' },
        include: {
          sender: { select: { id: true, name: true, avatarUrl: true } },
        },
      })
    }),

  // メッセージ送信
  send: protectedProcedure.input(SendMessageSchema).mutation(async ({ ctx, input }) => {
    return ctx.prisma.message.create({
      data: {
        matchId: input.matchId,
        senderId: ctx.user.id,
        body: input.body,
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    })
    // TODO: Pusher Channel でリアルタイム配信
  }),
})

export const reviewRouter = router({
  // レビュー作成
  create: protectedProcedure.input(CreateReviewSchema).mutation(async ({ ctx, input }) => {
    const match = await ctx.prisma.match.findUnique({
      where: { id: input.matchId },
      include: { project: true },
    })

    if (!match) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'マッチングが見つかりません' })
    }

    if (match.status !== 'COMPLETED') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: '完了済みの案件のみレビューできます' })
    }

    const isParticipant =
      match.artistId === ctx.user.id || match.project.clientId === ctx.user.id
    if (!isParticipant) {
      throw new TRPCError({ code: 'FORBIDDEN', message: '権限がありません' })
    }

    const existing = await ctx.prisma.review.findFirst({
      where: { matchId: input.matchId, reviewerId: ctx.user.id },
    })
    if (existing) {
      throw new TRPCError({ code: 'CONFLICT', message: 'すでにレビュー済みです' })
    }

    const review = await ctx.prisma.review.create({
      data: {
        matchId: input.matchId,
        reviewerId: ctx.user.id,
        score: input.score,
        comment: input.comment,
      },
    })

    // averageRating を Prisma 集計で再計算
    const agg = await ctx.prisma.review.aggregate({
      where: {
        match: { artistId: match.artistId },
      },
      _avg: { score: true },
    })

    await ctx.prisma.user.update({
      where: { id: match.artistId },
      data: { averageRating: agg._avg.score ?? 0 },
    })

    return review
  }),
})
