import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import {
  ApplyToOpenRoleSchema,
  CreateEventSchema,
  CreateOpenRoleSchema,
  EventFilterSchema,
  EventStatusSchema,
  InviteParticipantSchema,
  RespondToInviteSchema,
  UpdateEventSchema,
  UpdateOpenRoleSchema,
} from '@creator-links/shared'
import type { EventMediaInput } from '@creator-links/shared'

// 添付メディア配列を Prisma の nested create 形式に変換しつつ、position の同値時の
// tiebreaker として配列 index を反映する。actions/event.ts と同ロジック。
function toMediaCreate(media: EventMediaInput[]) {
  return media.map((m, idx) => ({
    type: m.type,
    url: m.url,
    caption: m.caption?.trim() || null,
    position: m.position * 1000 + idx,
  }))
}

function deriveCoverUrl(media: EventMediaInput[]): string | null {
  const firstImage = [...media].sort((a, b) => a.position - b.position).find((m) => m.type === 'IMAGE')
  return firstImage?.url ?? null
}

// =============================================
// イベント（Phase A: 告知・カレンダー）
// =============================================
// 主催者が作成 → 公募/指名で出演者を集める → 承認で EventParticipant 自動生成
// 応募は既存の Match システム（Match.eventOpenRoleId 経由）を再利用
// 承認で Match.ACCEPTED になり、既存チャット・レビューフローに合流する

export const eventRouter = router({
  // ---- CRUD ----

  create: protectedProcedure.input(CreateEventSchema).mutation(async ({ ctx, input }) => {
    // media は Prisma に直渡しできないので分離、coverUrl は先頭 IMAGE で自動同期
    const { media, ...rest } = input
    const resolvedCoverUrl = media.length > 0 ? deriveCoverUrl(media) : rest.coverUrl || null
    return ctx.prisma.event.create({
      data: {
        ...rest,
        // 空文字の URL は null 化（Zod は url() を通しつつ空文字も許容している）
        venueUrl: rest.venueUrl || null,
        ticketUrl: rest.ticketUrl || null,
        coverUrl: resolvedCoverUrl,
        creatorId: ctx.user.id,
        ...(media.length > 0 ? { media: { create: toMediaCreate(media) } } : {}),
      },
    })
  }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), data: UpdateEventSchema }))
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.prisma.event.findUnique({ where: { id: input.id } })
      if (!event) throw new TRPCError({ code: 'NOT_FOUND', message: 'イベントが見つかりません' })
      if (event.creatorId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: '主催者のみ編集できます' })
      }
      const { media, ...rest } = input.data
      const mediaProvided = media !== undefined
      const nextMedia = media ?? []
      const nextCoverUrl = mediaProvided
        ? deriveCoverUrl(nextMedia)
        : rest.coverUrl !== undefined
          ? rest.coverUrl || null
          : undefined // 未指定 = coverUrl は触らない

      return ctx.prisma.$transaction(async (tx) => {
        const updated = await tx.event.update({
          where: { id: input.id },
          data: {
            ...rest,
            ...(rest.venueUrl !== undefined ? { venueUrl: rest.venueUrl || null } : {}),
            ...(rest.ticketUrl !== undefined ? { ticketUrl: rest.ticketUrl || null } : {}),
            ...(nextCoverUrl !== undefined ? { coverUrl: nextCoverUrl } : {}),
          },
        })
        if (mediaProvided) {
          await tx.eventMedia.deleteMany({ where: { eventId: input.id } })
          if (nextMedia.length > 0) {
            await tx.eventMedia.createMany({
              data: toMediaCreate(nextMedia).map((m) => ({ ...m, eventId: input.id })),
            })
          }
        }
        return updated
      })
    }),

  publish: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.prisma.event.findUnique({ where: { id: input.id } })
      if (!event) throw new TRPCError({ code: 'NOT_FOUND', message: 'イベントが見つかりません' })
      if (event.creatorId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: '主催者のみ公開できます' })
      }
      if (event.status === 'PUBLISHED') return event
      return ctx.prisma.event.update({
        where: { id: input.id },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      })
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.string(), reason: z.string().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.prisma.event.findUnique({ where: { id: input.id } })
      if (!event) throw new TRPCError({ code: 'NOT_FOUND', message: 'イベントが見つかりません' })
      if (event.creatorId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: '主催者のみ中止できます' })
      }
      return ctx.prisma.event.update({
        where: { id: input.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      })
    }),

  // ---- 一覧・詳細 ----

  // 公開一覧: PUBLIC visibility のみ返す。
  // ログインユーザー向けのフォロワー限定・参加者限定の絞り込みは別エンドポイント（feed 系）で提供する予定。
  list: publicProcedure.input(EventFilterSchema).query(async ({ ctx, input }) => {
    const { status, type, genres, city, from, to, hasOpenRoles, cursor, limit } = input

    const items = await ctx.prisma.event.findMany({
      where: {
        status,
        visibility: 'PUBLIC', // Phase A.5: 公開一覧は PUBLIC のみ
        ...(type ? { type } : {}),
        ...(genres && genres.length > 0 ? { genres: { hasSome: genres } } : {}),
        ...(city ? { city } : {}),
        ...(from || to
          ? {
              startAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
        ...(hasOpenRoles
          ? { openRoles: { some: { status: 'OPEN' } } }
          : {}),
      },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { startAt: 'asc' },
      include: {
        creator: {
          select: { id: true, name: true, displayName: true, avatarUrl: true },
        },
        _count: { select: { openRoles: true, participants: true, interests: true } },
      },
    })

    let nextCursor: string | null = null
    if (items.length > limit) {
      nextCursor = items.pop()!.id
    }
    return { items, nextCursor }
  }),

  // 詳細取得: visibility に基づいて閲覧可否をチェックする。
  // - PUBLIC: 誰でも
  // - FOLLOWERS: 作成者のフォロワー + 参加者 + 作成者
  // - PARTICIPANTS_ONLY: 参加者 + 作成者
  // - PRIVATE: 作成者のみ
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const event = await ctx.prisma.event.findUnique({
        where: { id: input.id },
        include: {
          creator: {
            select: { id: true, name: true, displayName: true, avatarUrl: true, averageRating: true },
          },
          participants: {
            include: {
              user: {
                select: { id: true, name: true, displayName: true, avatarUrl: true },
              },
            },
          },
          openRoles: {
            include: {
              _count: { select: { matches: true } },
            },
          },
          _count: { select: { interests: true, follows: true } },
        },
      })
      if (!event) throw new TRPCError({ code: 'NOT_FOUND', message: 'イベントが見つかりません' })

      // visibility チェック
      const viewerId = ctx.session?.user?.id ?? null
      const isCreator = viewerId && viewerId === event.creatorId
      const isParticipant = viewerId
        ? event.participants.some((p) => p.userId === viewerId)
        : false

      // 参加者・作成者は常に閲覧可
      if (isCreator || isParticipant) return event

      if (event.visibility === 'PUBLIC') return event

      // FOLLOWERS の場合はフォロー関係を確認（Phase A.6: Follow モデルを使用）
      if (event.visibility === 'FOLLOWERS' && viewerId) {
        const follow = await ctx.prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: viewerId,
              followingId: event.creatorId,
            },
          },
          select: { id: true },
        })
        if (follow) return event
      }

      // 権限なし: 存在自体を隠すため NOT_FOUND
      throw new TRPCError({ code: 'NOT_FOUND', message: 'イベントが見つかりません' })
    }),

  // ---- 参加者 ----

  invite: protectedProcedure.input(InviteParticipantSchema).mutation(async ({ ctx, input }) => {
    const event = await ctx.prisma.event.findUnique({ where: { id: input.eventId } })
    if (!event) throw new TRPCError({ code: 'NOT_FOUND', message: 'イベントが見つかりません' })
    if (event.creatorId !== ctx.user.id) {
      throw new TRPCError({ code: 'FORBIDDEN', message: '主催者のみ招待できます' })
    }
    return ctx.prisma.eventParticipant.create({
      data: {
        eventId: input.eventId,
        userId: input.userId,
        role: input.role,
        note: input.note,
      },
    })
  }),

  respondToInvite: protectedProcedure
    .input(RespondToInviteSchema)
    .mutation(async ({ ctx, input }) => {
      const participant = await ctx.prisma.eventParticipant.findUnique({
        where: { id: input.participantId },
      })
      if (!participant) throw new TRPCError({ code: 'NOT_FOUND', message: '招待が見つかりません' })
      if (participant.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: '招待された本人のみ返信できます' })
      }
      return ctx.prisma.eventParticipant.update({
        where: { id: input.participantId },
        data: { status: input.response, respondedAt: new Date() },
      })
    }),

  removeParticipant: protectedProcedure
    .input(z.object({ participantId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const participant = await ctx.prisma.eventParticipant.findUnique({
        where: { id: input.participantId },
        include: { event: { select: { creatorId: true } } },
      })
      if (!participant) throw new TRPCError({ code: 'NOT_FOUND', message: '参加者が見つかりません' })
      if (participant.event.creatorId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: '主催者のみ削除できます' })
      }
      await ctx.prisma.eventParticipant.delete({ where: { id: input.participantId } })
      return { ok: true }
    }),

  // ---- 公募枠 ----

  addOpenRole: protectedProcedure
    .input(CreateOpenRoleSchema)
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.prisma.event.findUnique({ where: { id: input.eventId } })
      if (!event) throw new TRPCError({ code: 'NOT_FOUND', message: 'イベントが見つかりません' })
      if (event.creatorId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: '主催者のみ枠を追加できます' })
      }
      return ctx.prisma.eventOpenRole.create({
        data: input,
      })
    }),

  updateOpenRole: protectedProcedure
    .input(UpdateOpenRoleSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const role = await ctx.prisma.eventOpenRole.findUnique({
        where: { id },
        include: { event: { select: { creatorId: true } } },
      })
      if (!role) throw new TRPCError({ code: 'NOT_FOUND', message: '募集枠が見つかりません' })
      if (role.event.creatorId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: '主催者のみ編集できます' })
      }
      return ctx.prisma.eventOpenRole.update({ where: { id }, data })
    }),

  closeOpenRole: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const role = await ctx.prisma.eventOpenRole.findUnique({
        where: { id: input.id },
        include: { event: { select: { creatorId: true } } },
      })
      if (!role) throw new TRPCError({ code: 'NOT_FOUND', message: '募集枠が見つかりません' })
      if (role.event.creatorId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: '主催者のみ締切れます' })
      }
      return ctx.prisma.eventOpenRole.update({
        where: { id: input.id },
        data: { status: 'CLOSED', closedAt: new Date() },
      })
    }),

  // ---- 公募への応募（Match システム経由） ----

  applyToOpenRole: protectedProcedure
    .input(ApplyToOpenRoleSchema)
    .mutation(async ({ ctx, input }) => {
      const role = await ctx.prisma.eventOpenRole.findUnique({
        where: { id: input.openRoleId },
        include: { event: { select: { status: true, creatorId: true } } },
      })
      if (!role) throw new TRPCError({ code: 'NOT_FOUND', message: '募集枠が見つかりません' })
      if (role.status !== 'OPEN') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'この募集は締め切られています' })
      }
      if (role.event.status !== 'PUBLISHED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'このイベントは応募を受け付けていません' })
      }
      if (role.event.creatorId === ctx.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '自分が主催するイベントには応募できません' })
      }
      return ctx.prisma.match.create({
        data: {
          eventOpenRoleId: input.openRoleId,
          artistId: ctx.user.id,
          message: input.message,
          status: 'APPLIED',
        },
      })
    }),

  approveApplication: protectedProcedure
    .input(z.object({ matchId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const match = await ctx.prisma.match.findUnique({
        where: { id: input.matchId },
        include: {
          eventOpenRole: {
            include: { event: { select: { id: true, creatorId: true } } },
          },
        },
      })
      if (!match || !match.eventOpenRole) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '応募が見つかりません' })
      }
      if (match.eventOpenRole.event.creatorId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: '主催者のみ承認できます' })
      }
      if (match.status !== 'APPLIED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'すでに処理済みです' })
      }

      // トランザクション: Match 承認 + EventParticipant 自動生成 + filledCount 更新
      const [updatedMatch] = await ctx.prisma.$transaction(async (tx) => {
        const m = await tx.match.update({
          where: { id: input.matchId },
          data: { status: 'ACCEPTED' },
        })
        await tx.eventParticipant.upsert({
          where: {
            eventId_userId_role: {
              eventId: match.eventOpenRole!.event.id,
              userId: match.artistId,
              role: match.eventOpenRole!.roleType,
            },
          },
          create: {
            eventId: match.eventOpenRole!.event.id,
            userId: match.artistId,
            role: match.eventOpenRole!.roleType,
            status: 'CONFIRMED',
            respondedAt: new Date(),
          },
          update: { status: 'CONFIRMED', respondedAt: new Date() },
        })
        const newFilled = match.eventOpenRole!.filledCount + 1
        await tx.eventOpenRole.update({
          where: { id: match.eventOpenRole!.id },
          data: {
            filledCount: newFilled,
            ...(newFilled >= match.eventOpenRole!.requiredCount
              ? { status: 'FILLED' }
              : {}),
          },
        })
        return [m]
      })
      return updatedMatch
    }),

  rejectApplication: protectedProcedure
    .input(z.object({ matchId: z.string(), reason: z.string().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      const match = await ctx.prisma.match.findUnique({
        where: { id: input.matchId },
        include: {
          eventOpenRole: {
            include: { event: { select: { creatorId: true } } },
          },
        },
      })
      if (!match || !match.eventOpenRole) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '応募が見つかりません' })
      }
      if (match.eventOpenRole.event.creatorId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: '主催者のみ却下できます' })
      }
      return ctx.prisma.match.update({
        where: { id: input.matchId },
        data: { status: 'REJECTED' },
      })
    }),

  // ---- フォロー・興味 ----

  followEvent: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.eventFollow.upsert({
        where: {
          followerId_eventId: { followerId: ctx.user.id, eventId: input.eventId },
        },
        create: { followerId: ctx.user.id, eventId: input.eventId },
        update: {},
      })
    }),

  unfollowEvent: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.eventFollow.deleteMany({
        where: { followerId: ctx.user.id, eventId: input.eventId },
      })
      return { ok: true }
    }),

  toggleInterest: protectedProcedure
    .input(z.object({ eventId: z.string(), isAttending: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.eventInterest.upsert({
        where: {
          userId_eventId: { userId: ctx.user.id, eventId: input.eventId },
        },
        create: {
          userId: ctx.user.id,
          eventId: input.eventId,
          isAttending: input.isAttending,
        },
        update: { isAttending: input.isAttending },
      })
    }),

  clearInterest: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.eventInterest.deleteMany({
        where: { userId: ctx.user.id, eventId: input.eventId },
      })
      return { ok: true }
    }),

  // ---- ダッシュボード用 ----

  myEvents: protectedProcedure
    .input(
      z.object({
        as: z.enum(['organizer', 'participant', 'interested']).default('organizer'),
        status: EventStatusSchema.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (input.as === 'organizer') {
        return ctx.prisma.event.findMany({
          where: {
            creatorId: ctx.user.id,
            ...(input.status ? { status: input.status } : {}),
          },
          orderBy: { startAt: 'desc' },
          include: {
            _count: { select: { openRoles: true, participants: true } },
          },
        })
      }
      if (input.as === 'participant') {
        const participations = await ctx.prisma.eventParticipant.findMany({
          where: { userId: ctx.user.id, status: 'CONFIRMED' },
          include: {
            event: {
              include: {
                creator: {
                  select: { id: true, name: true, displayName: true, avatarUrl: true },
                },
              },
            },
          },
          orderBy: { event: { startAt: 'desc' } },
        })
        return participations.map((p) => p.event)
      }
      // interested
      const interests = await ctx.prisma.eventInterest.findMany({
        where: { userId: ctx.user.id, isAttending: true },
        include: {
          event: {
            include: {
              creator: {
                select: { id: true, name: true, displayName: true, avatarUrl: true },
              },
            },
          },
        },
        orderBy: { event: { startAt: 'desc' } },
      })
      return interests.map((i) => i.event)
    }),
})
