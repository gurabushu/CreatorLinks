import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function toCsvField(v: string | number | null): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replaceAll('"', '""')}"`
  }
  return s
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const yearParam = url.searchParams.get('year')
  const year = yearParam ? Number(yearParam) : new Date().getFullYear()
  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: 'invalid year' }, { status: 400 })
  }

  const from = new Date(Date.UTC(year, 0, 1))
  const to = new Date(Date.UTC(year + 1, 0, 1))

  const payments = await prisma.payment.findMany({
    where: {
      status: { in: ['HELD', 'RELEASED', 'REFUNDED'] },
      match: { artistId: session.user.id },
      paidAt: { gte: from, lt: to },
    },
    orderBy: { paidAt: 'asc' },
    select: {
      id: true,
      matchId: true,
      status: true,
      amountYen: true,
      platformFeeYen: true,
      artistPayoutYen: true,
      paidAt: true,
      releasedAt: true,
      match: {
        select: {
          project: { select: { title: true } },
          artist: { select: { name: true } },
        },
      },
    },
  })

  const header = [
    'paid_at',
    'released_at',
    'status',
    'match_id',
    'payment_id',
    'project_title',
    'amount_yen',
    'platform_fee_yen',
    'artist_payout_yen',
  ]
  const rows = payments.map((p) => [
    p.paidAt ? p.paidAt.toISOString().slice(0, 10) : '',
    p.releasedAt ? p.releasedAt.toISOString().slice(0, 10) : '',
    p.status,
    p.matchId,
    p.id,
    p.match.project?.title ?? '',
    p.amountYen,
    p.platformFeeYen,
    p.artistPayoutYen,
  ])
  const csv = [header, ...rows]
    .map((line) => line.map(toCsvField).join(','))
    .join('\r\n')

  // UTF-8 BOM を付けて Excel で日本語文字化けを防ぐ
  const body = '﻿' + csv
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="encorecue-payouts-${year}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
