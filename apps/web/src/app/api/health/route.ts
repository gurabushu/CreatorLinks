import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkCronAuth } from '@/lib/cron-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 診断用エンドポイント。無認証で叩けると DB ホスト名や user 数など偵察情報を晒すため、
// CRON_SECRET を持つリクエストのみ詳細を返し、それ以外は最小の { status: 'ok' } を返す。
export async function GET(req: Request) {
  const auth = checkCronAuth(req)

  // 認証なしのリクエストには最小情報のみ返す（外形監視ツール向け）
  if (!auth.ok) {
    try {
      await prisma.$queryRaw`SELECT 1`
      return NextResponse.json({ status: 'ok' })
    } catch {
      return NextResponse.json({ status: 'error' }, { status: 500 })
    }
  }

  // 認証済み: 詳細診断情報を返す
  const dbUrl = process.env.DATABASE_URL
  const masked = dbUrl ? dbUrl.replace(/:([^@]+)@/, ':***@') : '(not set)'

  try {
    await prisma.$queryRaw`SELECT 1`
    let userCount: number | string = 'unknown'
    let migrationStatus = 'unknown'
    try {
      const result = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM users`
      userCount = Number(result[0]?.count ?? 0)
      migrationStatus = 'applied'
    } catch {
      migrationStatus = 'not applied (table missing)'
    }
    return NextResponse.json({ status: 'ok', db: 'connected', url: masked, userCount, migrationStatus })
  } catch (err) {
    return NextResponse.json(
      { status: 'error', db: 'unreachable', url: masked, error: String(err) },
      { status: 500 },
    )
  }
}
