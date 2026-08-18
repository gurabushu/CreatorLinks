import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calcWithholdingTax } from '@/lib/withholding-tax'

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

  // PRO 判定: PRO は源泉徴収税列 + 月次集計行を追加、Free は基本 CSV のみ
  const isPro = session.user.role === 'PRO'

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

  const baseHeader = [
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
  const header = isPro
    ? [...baseHeader, 'withholding_tax_yen', 'net_after_withholding_yen']
    : baseHeader

  const rows = payments.map((p) => {
    const base: (string | number)[] = [
      p.paidAt ? p.paidAt.toISOString().slice(0, 10) : '',
      p.releasedAt ? p.releasedAt.toISOString().slice(0, 10) : '',
      p.status,
      p.matchId,
      p.id,
      p.match.project?.title ?? '',
      p.amountYen,
      p.platformFeeYen,
      p.artistPayoutYen,
    ]
    if (isPro) {
      const wh = calcWithholdingTax(p.amountYen)
      base.push(wh, p.artistPayoutYen - wh)
    }
    return base
  })

  const lines: (string | number)[][] = [header, ...rows]

  // PRO は月次集計セクション + 年計を末尾に追記
  if (isPro && payments.length > 0) {
    const monthly = new Map<
      string,
      { count: number; amount: number; fee: number; payout: number; withholding: number }
    >()
    for (const p of payments) {
      if (!p.paidAt) continue
      const key = `${p.paidAt.getUTCFullYear()}-${String(p.paidAt.getUTCMonth() + 1).padStart(2, '0')}`
      const cur = monthly.get(key) ?? { count: 0, amount: 0, fee: 0, payout: 0, withholding: 0 }
      cur.count += 1
      cur.amount += p.amountYen
      cur.fee += p.platformFeeYen
      cur.payout += p.artistPayoutYen
      cur.withholding += calcWithholdingTax(p.amountYen)
      monthly.set(key, cur)
    }
    lines.push([])
    lines.push(['# monthly_summary'])
    lines.push([
      'month',
      'count',
      'sum_amount_yen',
      'sum_platform_fee_yen',
      'sum_artist_payout_yen',
      'sum_withholding_tax_yen',
      'sum_net_after_withholding_yen',
    ])
    for (const [month, v] of Array.from(monthly.entries()).sort()) {
      lines.push([month, v.count, v.amount, v.fee, v.payout, v.withholding, v.payout - v.withholding])
    }
    // 年計
    const total = payments.reduce(
      (acc, p) => {
        const wh = calcWithholdingTax(p.amountYen)
        return {
          count: acc.count + 1,
          amount: acc.amount + p.amountYen,
          fee: acc.fee + p.platformFeeYen,
          payout: acc.payout + p.artistPayoutYen,
          withholding: acc.withholding + wh,
        }
      },
      { count: 0, amount: 0, fee: 0, payout: 0, withholding: 0 },
    )
    lines.push([])
    lines.push(['# yearly_total'])
    lines.push([
      'year',
      'count',
      'sum_amount_yen',
      'sum_platform_fee_yen',
      'sum_artist_payout_yen',
      'sum_withholding_tax_yen',
      'sum_net_after_withholding_yen',
    ])
    lines.push([year, total.count, total.amount, total.fee, total.payout, total.withholding, total.payout - total.withholding])
  }

  const csv = lines.map((line) => line.map(toCsvField).join(',')).join('\r\n')

  // UTF-8 BOM を付けて Excel で日本語文字化けを防ぐ
  const body = '﻿' + csv
  const filename = isPro
    ? `encorecue-payouts-${year}-pro.csv`
    : `encorecue-payouts-${year}.csv`
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
