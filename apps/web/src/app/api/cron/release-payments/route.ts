// 完了報告から AUTO_RELEASE_DAYS 日経過した HELD Payment を自動リリース
// Vercel Cron から daily で叩かれる想定（vercel.json の crons 参照）
// 本番は CRON_SECRET 必須（fail-closed）

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AUTO_RELEASE_DAYS } from '@/lib/stripe'
import { releasePayment } from '@/lib/payment-release'
import { checkCronAuth } from '@/lib/cron-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const auth = checkCronAuth(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const cutoff = new Date(Date.now() - AUTO_RELEASE_DAYS * 24 * 60 * 60 * 1000)

  const eligible = await prisma.payment.findMany({
    where: {
      status: 'HELD',
      match: {
        status: 'COMPLETED',
        completedAt: { lte: cutoff },
      },
    },
    select: { id: true },
    take: 200, // 1 回で処理する上限（Stripe API のレート・実行時間対策）
  })

  let released = 0
  const failures: Array<{ paymentId: string; reason: string; detail?: string }> = []

  // 並列度 5 で処理。1 件ハングで全体が止まるのを防ぎつつ、Stripe API のレート上限も守る。
  // 各 releasePayment は idempotencyKey で守られているので、途中失敗しても次回 cron で
  // 安全に再試行できる。
  const CONCURRENCY = 5
  for (let i = 0; i < eligible.length; i += CONCURRENCY) {
    const chunk = eligible.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(chunk.map((p) => releasePayment(p.id)))
    for (let j = 0; j < results.length; j++) {
      const r = results[j]!
      const paymentId = chunk[j]!.id
      if (r.status === 'fulfilled') {
        if (r.value.ok) {
          released++
        } else {
          failures.push({
            paymentId,
            reason: r.value.reason,
            detail: r.value.detail,
          })
        }
      } else {
        failures.push({
          paymentId,
          reason: 'unexpected_throw',
          detail: (r.reason as { message?: string })?.message ?? String(r.reason),
        })
      }
    }
  }

  return NextResponse.json({
    ok: true,
    cutoff: cutoff.toISOString(),
    candidates: eligible.length,
    released,
    failures,
  })
}
