import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 24 時間より前に作られたゲストアカウントを削除。
// Vercel Cron から daily で叩かれる想定（vercel.json の crons 参照）。
// CRON_SECRET が設定されている場合は Bearer 認証必須。
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
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
