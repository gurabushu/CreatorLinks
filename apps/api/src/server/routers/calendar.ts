import { router, publicProcedure, protectedProcedure } from '../trpc'
import { CalendarRangeSchema, PublicCalendarFilterSchema } from '@creator-links/shared'

// =============================================
// カレンダー（Phase A）
// - personal: 自分が主催・参加確定・興味ありのイベントを集約
// - public:   公開中のイベントを日付範囲・条件で取得
// - iCal エクスポートは Phase A 後半で追加
// =============================================

export const calendarRouter = router({
  personal: protectedProcedure.input(CalendarRangeSchema).query(async ({ ctx, input }) => {
    const { from, to } = input
    const userId = ctx.user.id

    const [created, confirmedParticipations, interests] = await Promise.all([
      ctx.prisma.event.findMany({
        where: {
          creatorId: userId,
          startAt: { gte: from, lte: to },
          status: { in: ['PUBLISHED', 'DRAFT', 'COMPLETED'] },
        },
        select: {
          id: true, title: true, startAt: true, endAt: true, type: true,
          status: true, venueName: true, city: true, coverUrl: true,
        },
      }),
      ctx.prisma.eventParticipant.findMany({
        where: {
          userId,
          status: 'CONFIRMED',
          event: { startAt: { gte: from, lte: to } },
        },
        include: {
          event: {
            select: {
              id: true, title: true, startAt: true, endAt: true, type: true,
              status: true, venueName: true, city: true, coverUrl: true,
            },
          },
        },
      }),
      ctx.prisma.eventInterest.findMany({
        where: {
          userId,
          isAttending: true,
          event: { startAt: { gte: from, lte: to }, status: 'PUBLISHED' },
        },
        include: {
          event: {
            select: {
              id: true, title: true, startAt: true, endAt: true, type: true,
              status: true, venueName: true, city: true, coverUrl: true,
            },
          },
        },
      }),
    ])

    // 各エントリに「自分の関わり方」を付与して集約
    const merged = [
      ...created.map((e) => ({ event: e, role: 'ORGANIZER' as const })),
      ...confirmedParticipations.map((p) => ({ event: p.event, role: p.role })),
      ...interests.map((i) => ({ event: i.event, role: 'AUDIENCE' as const })),
    ]

    // 同じイベントの重複を排除（優先度: ORGANIZER > PERFORMER > STAFF > GUEST > AUDIENCE）
    const priority: Record<string, number> = {
      ORGANIZER: 0, PERFORMER: 1, STAFF: 2, GUEST: 3, AUDIENCE: 4,
    }
    const dedup = new Map<string, (typeof merged)[number]>()
    for (const entry of merged) {
      const existing = dedup.get(entry.event.id)
      if (!existing || (priority[entry.role] ?? 99) < (priority[existing.role] ?? 99)) {
        dedup.set(entry.event.id, entry)
      }
    }
    return Array.from(dedup.values()).sort(
      (a, b) => a.event.startAt.getTime() - b.event.startAt.getTime(),
    )
  }),

  public: publicProcedure.input(PublicCalendarFilterSchema).query(async ({ ctx, input }) => {
    const { from, to, genres, city, type } = input
    return ctx.prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
        visibility: 'PUBLIC', // Phase A.5: 公開カレンダーは PUBLIC のみ
        startAt: { gte: from, lte: to },
        ...(genres && genres.length > 0 ? { genres: { hasSome: genres } } : {}),
        ...(city ? { city } : {}),
        ...(type ? { type } : {}),
      },
      orderBy: { startAt: 'asc' },
      select: {
        id: true, title: true, startAt: true, endAt: true, type: true,
        venueName: true, city: true, coverUrl: true, genres: true,
        creator: { select: { id: true, name: true, displayName: true, avatarUrl: true } },
      },
    })
  }),
})
