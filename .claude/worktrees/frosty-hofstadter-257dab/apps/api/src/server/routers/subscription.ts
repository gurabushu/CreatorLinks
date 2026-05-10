import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, proProcedure, protectedProcedure } from '../trpc'
import { CreateSubSchema, CreatePortfolioSchema } from '@creator-links/shared'
import { stripe, PLAN_AMOUNTS, PRO_PRICE_ID } from '../../lib/stripe'

export const subscriptionRouter = router({
  // PRO プラン登録 Checkout セッション作成（全認証済みユーザー）
  createProCheckout: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role === 'PRO') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'すでに PRO プランです' })
    }

    const dbUser = await ctx.prisma.user.findUnique({ where: { id: ctx.user.id } })
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: dbUser?.stripeCustomerId ?? undefined,
      line_items: [
        {
          price: PRO_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pro/subscribe?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pro/subscribe`,
      metadata: {
        userId: ctx.user.id,
        type: 'pro_upgrade',
      },
    })

    return { checkoutUrl: session.url }
  }),

  // サブスク開始（Proユーザーのみ）
  create: proProcedure.input(CreateSubSchema).mutation(async ({ ctx, input }) => {
    const target = await ctx.prisma.user.findUnique({ where: { id: input.targetId } })

    if (!target) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'アーティストが見つかりません' })
    }

    if (target.role !== 'PRO') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'プロアーティストのみ支援できます' })
    }

    // Stripe Checkout Session 作成
    const dbUser2 = await ctx.prisma.user.findUnique({ where: { id: ctx.user.id } })
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: dbUser2?.stripeCustomerId ?? undefined,
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: { name: `${target.name} へのファン支援` },
            unit_amount: PLAN_AMOUNTS[input.plan],
            recurring: {
              interval:
                input.plan === 'MONTHLY' ? 'month' : input.plan === 'QUARTERLY' ? 'month' : 'year',
              interval_count: input.plan === 'QUARTERLY' ? 3 : 1,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/fan/${input.targetId}?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/fan/${input.targetId}`,
      metadata: {
        subscriberId: ctx.user.id,
        targetId: input.targetId,
        plan: input.plan,
      },
    })

    return { checkoutUrl: session.url }
  }),

  // サブスクキャンセル
  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sub = await ctx.prisma.subscription.findUnique({ where: { id: input.id } })

      if (!sub) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'サブスクリプションが見つかりません' })
      }

      if (sub.subscriberId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: '権限がありません' })
      }

      await stripe.subscriptions.cancel(sub.stripeSubscriptionId)

      return ctx.prisma.subscription.update({
        where: { id: input.id },
        data: { status: 'CANCELLED' },
      })
    }),

  // 自分が支援しているサブスク一覧
  mySubscriptions: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.subscription.findMany({
      where: { subscriberId: ctx.user.id },
      include: {
        target: { select: { id: true, name: true, avatarUrl: true } },
      },
    })
  }),
})

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
