// プロフィール分析 (PRO 特典) のロジック集約。
// - recordProfileView: /artists/[id] SSR から fire-and-forget で呼ぶ (自分自身は記録しない)
// - getAnalyticsSummary: /dashboard/analytics で 30 日間の指標を集計

import { createHash } from 'node:crypto'
import { prisma } from './prisma'

// 匿名 IP hash: raw IP を保存せず 30 分粒度で丸めた短い hash に。
// Bot bulk view による過大集計と PII 保存を両方回避。
function hashIp(ip: string): string {
  const bucket = Math.floor(Date.now() / (30 * 60 * 1000)) // 30 分バケット
  const salt = process.env.AUTH_SECRET ?? 'no-salt'
  return createHash('sha256').update(`${ip}|${bucket}|${salt}`).digest('base64url').slice(0, 16)
}

// PV を記録する。同一 viewer (login 中 or 匿名 IP hash) からの重複は 30 分単位で dedup。
// 失敗しても表示に影響しないよう、呼び出し側は `.catch(() => null)` を付けて fire-and-forget にする。
export async function recordProfileView(input: {
  profileUserId: string
  viewerUserId: string | null
  viewerIp: string | null
}): Promise<void> {
  const { profileUserId, viewerUserId, viewerIp } = input

  // 自分のプロフィールは記録しない
  if (viewerUserId && viewerUserId === profileUserId) return

  // ログイン viewer: 過去 30 分に同 profile へのアクセスがあれば skip
  if (viewerUserId) {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000)
    const dup = await prisma.profileView.findFirst({
      where: { profileUserId, viewerUserId, createdAt: { gte: cutoff } },
      select: { id: true },
    })
    if (dup) return
    await prisma.profileView.create({
      data: { profileUserId, viewerUserId },
    })
    return
  }

  // 匿名: IP hash で dedup
  if (viewerIp) {
    const ipHash = hashIp(viewerIp)
    const cutoff = new Date(Date.now() - 30 * 60 * 1000)
    const dup = await prisma.profileView.findFirst({
      where: { profileUserId, viewerIpHash: ipHash, createdAt: { gte: cutoff } },
      select: { id: true },
    })
    if (dup) return
    await prisma.profileView.create({
      data: { profileUserId, viewerIpHash: ipHash },
    })
  }
}

export type AnalyticsSummary = {
  windowDays: number
  views: {
    total: number
    byLoggedIn: number
    byAnonymous: number
    /** ユニーク viewer (ログインユーザー) 数 */
    uniqueLoggedInViewers: number
  }
  follows: {
    /** 現在の総フォロワー数 */
    current: number
    /** ウィンドウ内の新規フォロー数 (受) */
    gained: number
  }
  matches: {
    /** ウィンドウ内に自分に来た応募 (APPLIED + SCOUTED 受信 + それ以降) */
    totalIncoming: number
    /** うち ACCEPTED 相当 (発注者に承認された or 自分がスカウトを承諾) */
    accepted: number
    /** ACCEPTED / totalIncoming (%) */
    acceptanceRatePct: number
    /** ウィンドウ内に COMPLETED になった件数 */
    completed: number
  }
}

// 30 日 (可変) の集計を 1 クエリでまとめる。
// artistId (= 分析対象のユーザー) を渡し、そのユーザー視点の指標を返す。
export async function getAnalyticsSummary(
  artistUserId: string,
  windowDays = 30,
): Promise<AnalyticsSummary> {
  const now = new Date()
  const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000)

  const [
    totalViews,
    loggedInViews,
    uniqueLoggedInViewers,
    currentFollowers,
    gainedFollowers,
    incomingMatches,
    acceptedMatches,
    completedMatches,
  ] = await Promise.all([
    prisma.profileView.count({
      where: { profileUserId: artistUserId, createdAt: { gte: windowStart } },
    }),
    prisma.profileView.count({
      where: {
        profileUserId: artistUserId,
        viewerUserId: { not: null },
        createdAt: { gte: windowStart },
      },
    }),
    prisma.profileView
      .findMany({
        where: {
          profileUserId: artistUserId,
          viewerUserId: { not: null },
          createdAt: { gte: windowStart },
        },
        distinct: ['viewerUserId'],
        select: { viewerUserId: true },
      })
      .then((rows) => rows.length),
    prisma.follow.count({ where: { followingId: artistUserId } }),
    prisma.follow.count({
      where: { followingId: artistUserId, createdAt: { gte: windowStart } },
    }),
    prisma.match.count({
      where: {
        artistId: artistUserId,
        status: { in: ['APPLIED', 'SCOUTED', 'ACCEPTED', 'COMPLETED', 'REJECTED'] },
        createdAt: { gte: windowStart },
      },
    }),
    prisma.match.count({
      where: {
        artistId: artistUserId,
        status: { in: ['ACCEPTED', 'COMPLETED'] },
        createdAt: { gte: windowStart },
      },
    }),
    prisma.match.count({
      where: {
        artistId: artistUserId,
        status: 'COMPLETED',
        completedAt: { gte: windowStart },
      },
    }),
  ])

  return {
    windowDays,
    views: {
      total: totalViews,
      byLoggedIn: loggedInViews,
      byAnonymous: totalViews - loggedInViews,
      uniqueLoggedInViewers,
    },
    follows: {
      current: currentFollowers,
      gained: gainedFollowers,
    },
    matches: {
      totalIncoming: incomingMatches,
      accepted: acceptedMatches,
      acceptanceRatePct:
        incomingMatches > 0 ? Math.round((acceptedMatches / incomingMatches) * 100) : 0,
      completed: completedMatches,
    },
  }
}
