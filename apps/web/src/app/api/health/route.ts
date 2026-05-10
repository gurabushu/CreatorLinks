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
    return NextResponse.json({ status: 'ok', db: 'connected', url: masked })
  } catch (err) {
    return NextResponse.json(
      { status: 'error', db: 'unreachable', url: masked, error: String(err) },
      { status: 500 }
    )
  }
}
