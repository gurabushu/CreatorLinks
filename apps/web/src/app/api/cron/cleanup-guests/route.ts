import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkCronAuth } from '@/lib/cron-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 24 時間より前に作られたゲストアカウントを削除。
// Vercel Cron から daily で叩かれる想定（vercel.json の crons 参照）。
// 本番は CRON_SECRET 必須（fail-closed）。
export async function GET(req: Request) {
  const auth = checkCronAuth(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)

  try {
    const result = await prisma.user.deleteMany({
      where: { isGuest: true, createdAt: { lt: cutoff } },
    })
    return NextResponse.json({ ok: true, deleted: result.count, cutoff: cutoff.toISOString() })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    )
  }
}
