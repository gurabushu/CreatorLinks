// PRO 特典「売上分析」の集計ロジック。
// 過去 N ヶ月の Payment (HELD/RELEASED) を集計して、
// - 月別売上推移
// - 顧客別 LTV (Life-Time Value) Top 10
// - リピート率 (2 回以上取引した顧客の比率)
// を返す。

import { prisma } from './prisma'

export type MonthlyRevenue = {
  month: string // 'YYYY-MM'
  count: number
  amountYen: number
  payoutYen: number
}

export type CustomerLtv = {
  customerId: string
  name: string
  displayName: string | null
  avatarUrl: string | null
  matchCount: number
  totalYen: number
}

export type RevenueAnalyticsSummary = {
  windowMonths: number
  monthly: MonthlyRevenue[]
  topCustomers: CustomerLtv[]
  repeatRatePct: number // 2 回以上取引した顧客の割合（%）
  totalCustomers: number
  repeatCustomers: number
  grandTotalYen: number
  grandTotalCount: number
}

export async function getRevenueAnalytics(
  userId: string,
  windowMonths: number = 12,
): Promise<RevenueAnalyticsSummary> {
  // 対象期間: 今月を含む過去 windowMonths ヶ月
  const now = new Date()
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - windowMonths + 1, 1)

  // 自分がアーティストの Payment (HELD/RELEASED)
  const payments = await prisma.payment.findMany({
    where: {
      status: { in: ['HELD', 'RELEASED'] },
      match: { artistId: userId },
      paidAt: { gte: rangeStart },
    },
    orderBy: { paidAt: 'asc' },
    select: {
      amountYen: true,
      artistPayoutYen: true,
      paidAt: true,
      match: {
        select: {
          artistId: true,
          partnerUserId: true,
          project: {
            select: {
              clientId: true,
              client: { select: { id: true, name: true, displayName: true, avatarUrl: true } },
            },
          },
          partner: { select: { id: true, name: true, displayName: true, avatarUrl: true } },
        },
      },
    },
  })

  // 月別集計 (windowMonths 分のバケット、0 埋め)
  const monthMap = new Map<string, MonthlyRevenue>()
  for (let i = 0; i < windowMonths; i++) {
    const d = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthMap.set(key, { month: key, count: 0, amountYen: 0, payoutYen: 0 })
  }
  for (const p of payments) {
    if (!p.paidAt) continue
    const key = `${p.paidAt.getFullYear()}-${String(p.paidAt.getMonth() + 1).padStart(2, '0')}`
    const cur = monthMap.get(key)
    if (!cur) continue
    cur.count += 1
    cur.amountYen += p.amountYen
    cur.payoutYen += p.artistPayoutYen
  }
  const monthly = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month))

  // 顧客別 LTV: 相手 (依頼者 or P2P partner) を key に集約
  const customerMap = new Map<string, CustomerLtv>()
  for (const p of payments) {
    let counterparty: { id: string; name: string; displayName: string | null; avatarUrl: string | null } | null = null
    if (p.match.project?.client && p.match.project.client.id !== userId) {
      counterparty = p.match.project.client
    } else if (p.match.partner && p.match.partnerUserId !== userId) {
      counterparty = p.match.partner
    }
    if (!counterparty) continue
    const cur = customerMap.get(counterparty.id) ?? {
      customerId: counterparty.id,
      name: counterparty.name,
      displayName: counterparty.displayName,
      avatarUrl: counterparty.avatarUrl,
      matchCount: 0,
      totalYen: 0,
    }
    cur.matchCount += 1
    cur.totalYen += p.amountYen
    customerMap.set(counterparty.id, cur)
  }
  const allCustomers = Array.from(customerMap.values())
  const topCustomers = allCustomers
    .sort((a, b) => b.totalYen - a.totalYen)
    .slice(0, 10)

  // リピート率
  const totalCustomers = allCustomers.length
  const repeatCustomers = allCustomers.filter((c) => c.matchCount >= 2).length
  const repeatRatePct = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0

  const grandTotalYen = payments.reduce((s, p) => s + p.amountYen, 0)

  return {
    windowMonths,
    monthly,
    topCustomers,
    repeatRatePct,
    totalCustomers,
    repeatCustomers,
    grandTotalYen,
    grandTotalCount: payments.length,
  }
}
