import { initTRPC, TRPCError } from '@trpc/server'
import { z } from 'zod'
import type { Context } from './context'

// tRPC インスタンス初期化
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape }) {
    return shape
  },
})

export const router = t.router
export const publicProcedure = t.procedure

// 認証済みユーザーのみ実行できるプロシージャ
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: '認証が必要です' })
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.session.user,
    },
  })
})

// プロアカウントのみ実行できるプロシージャ
export const proProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== 'PRO' && ctx.session.user.role !== 'ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'プロアカウントが必要です',
    })
  }
  return next({ ctx })
})

// 管理者のみ実行できるプロシージャ
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== 'ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '管理者権限が必要です',
    })
  }
  return next({ ctx })
})
