// 公式サポート窓口用のヘルパー
// - 現ユーザーと公式アカウントの P2P Match を取得（無ければ ACCEPTED / projectId=null で作成）
// - 返した matchId は /dashboard/chat/[matchId] へ遷移する用途
// - ゲスト / 公式本人 / 公式未シードのケースは null を返し、呼び出し側で /dashboard に fallback する

import { getOfficialUser } from './official-account'
import { prisma } from './prisma'

export async function ensureSupportMatchId(userId: string): Promise<string | null> {
  const official = await getOfficialUser()
  if (!official) return null
  if (official.id === userId) return null

  const user = await prisma.user
    .findUnique({ where: { id: userId }, select: { isGuest: true } })
    .catch(() => null)
  if (!user || user.isGuest) return null

  const existing = await prisma.match.findFirst({
    where: { artistId: official.id, partnerUserId: userId },
    select: { id: true },
  })
  if (existing) return existing.id

  try {
    const created = await prisma.match.create({
      data: {
        artistId: official.id,
        partnerUserId: userId,
        status: 'ACCEPTED',
        message: null,
      },
      select: { id: true },
    })
    return created.id
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') {
      const retry = await prisma.match.findFirst({
        where: { artistId: official.id, partnerUserId: userId },
        select: { id: true },
      })
      return retry?.id ?? null
    }
    throw e
  }
}
