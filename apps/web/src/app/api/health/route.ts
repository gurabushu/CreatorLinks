import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const dbUrl = process.env.DATABASE_URL
  const masked = dbUrl
    ? dbUrl.replace(/:([^@]+)@/, ':***@')
    : '(not set)'

  try {
    await prisma.$queryRaw`SELECT 1`
    let userCount: number | string = 'unknown'
    let migrationStatus = 'unknown'
    try {
      const result = await prisma.$queryRaw<Array<{count: bigint}>>`SELECT COUNT(*) as count FROM users`
      userCount = Number(result[0]?.count ?? 0)
      migrationStatus = 'applied'
    } catch {
      migrationStatus = 'not applied (table missing)'
    }
    return NextResponse.json({ status: 'ok', db: 'connected', url: masked, userCount, migrationStatus })
  } catch (err) {
    return NextResponse.json(
      { status: 'error', db: 'unreachable', url: masked, error: String(err) },
      { status: 500 }
    )
  }
}
