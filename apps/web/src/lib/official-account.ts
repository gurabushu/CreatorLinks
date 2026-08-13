// 公式アカウントのアクセス層
// - シード済み（isOfficial=true が付いた User が 1 人 DB に居る前提）
// - id/name/avatar の取得は 5 分キャッシュ（頻繁に参照されるが変わらないため）
// - ウェルカム DM 送信の共通ロジック

import { prisma } from './prisma'
import { SITE_NAME } from './brand'

const CACHE_TTL_MS = 5 * 60 * 1000

let cache: { user: OfficialUser; expiresAt: number } | null = null

export type OfficialUser = {
  id: string
  name: string
  displayName: string | null
  avatarUrl: string | null
}

// 公式アカウントを取得。シードされていなければ null
export async function getOfficialUser(): Promise<OfficialUser | null> {
  if (cache && cache.expiresAt > Date.now()) return cache.user

  const found = await prisma.user
    .findFirst({
      where: { isOfficial: true },
      select: { id: true, name: true, displayName: true, avatarUrl: true },
      orderBy: { createdAt: 'asc' }, // 複数存在した場合は最古を採用
    })
    .catch(() => null)

  if (!found) {
    cache = null
    return null
  }
  cache = { user: found, expiresAt: Date.now() + CACHE_TTL_MS }
  return found
}

// キャッシュを破棄する。公式アカウントの表示名変更等をした後に呼ぶ想定
export function invalidateOfficialUserCache() {
  cache = null
}

// ---- ウェルカム DM ----

// signup 直後に呼ぶ。新規ユーザーに対して公式との Match + 初回メッセージを作成
// 失敗しても signup 自体は成功させたいので、呼び出し側は .catch(...) で握りつぶす
export async function sendWelcomeDm(newUserId: string): Promise<void> {
  const official = await getOfficialUser()
  if (!official) return // 公式未シード時は no-op
  if (official.id === newUserId) return // 公式自身が signup した場合はセルフ DM を作らない

  // ゲストアカウントには送らない（24h で消える一時アカウント）
  const newUser = await prisma.user
    .findUnique({ where: { id: newUserId }, select: { isGuest: true } })
    .catch(() => null)
  if (!newUser || newUser.isGuest) return

  // 公式 → 新規ユーザーの P2P Match を作成 + 初回メッセージを 1 トランザクションで発火。
  // 別々に流すと、message.create 失敗時に空の match だけ残り、以降 ensureSupportMatchId が
  // その空 match を再利用して welcome 本文が二度と入らなくなる。
  try {
    await prisma.$transaction(async (tx) => {
      const match = await tx.match.create({
        data: {
          artistId: official.id,
          partnerUserId: newUserId,
          status: 'ACCEPTED',
          message: null,
        },
        select: { id: true },
      })
      await tx.message.create({
        data: {
          matchId: match.id,
          senderId: official.id,
          body: WELCOME_MESSAGE_BODY,
        },
      })
    })
  } catch (e) {
    const code = (e as { code?: string }).code
    // P2002: 既に welcome DM 送信済み（@@unique 違反）
    if (code === 'P2002') return
    // P2003: FK 違反 = キャッシュされた官方 ID が既に削除されている。キャッシュを捨てて次回再取得。
    if (code === 'P2003') {
      invalidateOfficialUserCache()
      return
    }
    throw e
  }
}

const WELCOME_MESSAGE_BODY = `${SITE_NAME} へご登録ありがとうございます 🎵
音楽クリエイターと依頼者をつなぐプラットフォームです。

まずは以下から始めてみてください：
・プロフィールを充実させる
・自分の作品をポートフォリオに追加する
・気になる案件やアーティストを探す

ご質問や困ったことがあれば、このチャットで気軽にお声がけください。`
