// 完了報告から AUTO_RELEASE_DAYS 日経過した HELD Payment を自動リリース
// Vercel Cron から daily で叩かれる想定（vercel.json の crons 参照）
// CRON_SECRET が設定されている場合は Bearer 認証必須（cleanup-guests と同じ流儀）

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AUTO_RELEASE_DAYS } from '@/lib/stripe'
import { releasePayment } from '@/lib/payment-release'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
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

  for (const p of eligible) {
    const result = await releasePayment(p.id)
    if (result.ok) {
      released++
    } else {
      failures.push({
        paymentId: p.id,
        reason: result.reason,
        detail: 'detail' in result ? result.detail : undefined,
      })
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
