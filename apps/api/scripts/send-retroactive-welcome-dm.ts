/**
 * send-retroactive-welcome-dm.ts
 *
 * ウェルカム DM が実装される前に signup した既存ユーザー全員に、
 * 公式アカウントからの welcome 本文を遡及配信する一回限りのスクリプト。
 *
 * 対象:
 * - isOfficial=false のユーザー
 * - isGuest=false のユーザー（ゲストは 24h で消えるので対象外）
 * - 公式アカウントとの Match をまだ持っていないユーザー
 *   （sendWelcomeDm 側は P2002 で idempotent だが、ここでは pre-filter で負荷を減らす）
 * - deletedAt=null のアクティブユーザー
 *
 * 冪等性: 既に Match 済みのユーザーはスキップ。再実行安全。
 *
 * 使い方:
 *   # dry-run で対象件数を確認
 *   DATABASE_URL="<URL>" pnpm --filter @creator-links/api \
 *     tsx scripts/send-retroactive-welcome-dm.ts --dry-run
 *
 *   # 本実行
 *   DATABASE_URL="<URL>" pnpm --filter @creator-links/api \
 *     tsx scripts/send-retroactive-welcome-dm.ts
 *
 *   # バッチサイズ・レート制御（既定 50 件 / 100ms）
 *   BATCH=20 DELAY_MS=250 ... tsx scripts/send-retroactive-welcome-dm.ts
 */

import { PrismaClient } from '@prisma/client'

function maskUrl(url: string): string {
  return url.replace(/:[^:@]+@/, ':****@')
}

// apps/web/src/lib/official-account.ts と文言を揃える。
// このスクリプトは apps/api 側で web の lib を直接 import できないため意図的に二重化。
// 文言変更時は両方更新すること。
const SITE_NAME = 'EncoreCue'
const WELCOME_MESSAGE_BODY = `${SITE_NAME} へご登録ありがとうございます 🎵
音楽クリエイターと依頼者をつなぐプラットフォームです。

まずは以下から始めてみてください：
・プロフィールを充実させる
・自分の作品をポートフォリオに追加する
・気になる案件やアーティストを探す

ご質問や困ったことがあれば、このチャットで気軽にお声がけください。`

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const url = process.env.DATABASE_URL ?? ''
  const isLocal = /@(localhost|127\.0\.0\.1)/.test(url)
  const batchSize = Number(process.env.BATCH ?? 50)
  const delayMs = Number(process.env.DELAY_MS ?? 100)

  if (!url) {
    console.error('DATABASE_URL is not set. Aborting.')
    process.exit(1)
  }

  console.log('===== retroactive welcome DM =====')
  console.log(`Target : ${maskUrl(url)}`)
  console.log(`Env    : ${isLocal ? 'local' : 'REMOTE (likely production)'}`)
  console.log(`Mode   : ${dryRun ? 'DRY-RUN (no writes)' : 'APPLY'}`)
  console.log(`Batch  : ${batchSize} / delay ${delayMs}ms`)
  console.log('')

  const prisma = new PrismaClient()

  try {
    const official = await prisma.user.findFirst({
      where: { isOfficial: true },
      select: { id: true, email: true, name: true },
      orderBy: { createdAt: 'asc' },
    })
    if (!official) {
      console.error('No official account found (isOfficial=true). Run seed-official-account.ts first.')
      process.exit(1)
    }
    console.log(`[official] ${official.email} (id=${official.id})`)

    // 公式との Match をまだ持たない active ユーザーを抽出
    const targets = await prisma.user.findMany({
      where: {
        isOfficial: false,
        isGuest: false,
        deletedAt: null,
        id: { not: official.id },
        // 公式が artist 側 の Match にまだ入っていないユーザー
        NOT: {
          matchesAsPartner: {
            some: { artistId: official.id },
          },
        },
      },
      select: { id: true, email: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    console.log(`[found] ${targets.length} user(s) without a welcome DM`)
    if (targets.length === 0) {
      console.log('Nothing to do.')
      return
    }
    if (dryRun) {
      console.log('\nFirst up to 10 targets:')
      for (const t of targets.slice(0, 10)) {
        console.log(`  - ${t.email} (${t.createdAt.toISOString()})`)
      }
      console.log('\nDRY-RUN complete. No changes written.')
      return
    }

    let sent = 0
    let skipped = 0
    let failed = 0

    for (let i = 0; i < targets.length; i += batchSize) {
      const chunk = targets.slice(i, i + batchSize)
      for (const t of chunk) {
        try {
          await prisma.$transaction(async (tx) => {
            const match = await tx.match.create({
              data: {
                artistId: official.id,
                partnerUserId: t.id,
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
          sent += 1
        } catch (e) {
          const code = (e as { code?: string }).code
          if (code === 'P2002') {
            skipped += 1
          } else {
            failed += 1
            console.error(`  [fail] ${t.email}: ${(e as Error).message}`)
          }
        }
      }
      console.log(`  processed ${Math.min(i + batchSize, targets.length)}/${targets.length}`)
      if (delayMs > 0 && i + batchSize < targets.length) {
        await new Promise((r) => setTimeout(r, delayMs))
      }
    }

    console.log('')
    console.log(`[done] sent=${sent}  skipped=${skipped}  failed=${failed}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
