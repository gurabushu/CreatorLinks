/**
 * migrate-pro-to-founding-supporter.ts
 *
 * 2026-10-17 fee-only pivot で PRO サブスクリプションを廃止したことに伴い、
 * 既存の role='PRO' ユーザーを以下の 2 択で安全に振り替える:
 *
 *   A. Founding Supporter として優遇 (default)
 *      - role: 'PRO' → 'GENERAL'
 *      - isFounderExempt: true (永年 fee 0%)
 *      - isVerified: true (運営から認証バッジを無償付与)
 *
 *   B. 単なる無料ユーザー化 (--demote-only)
 *      - role: 'PRO' → 'GENERAL' だけ
 *      - isFounderExempt / isVerified は触らない
 *
 * ADMIN ユーザーは role の整合を保つため触らない（ADMIN のまま）。
 *
 * 冪等: すでに GENERAL のユーザーは何もしない。再実行安全。
 *
 * 使い方:
 *   # dry-run
 *   DATABASE_URL="<URL>" pnpm --filter @creator-links/api \
 *     tsx scripts/migrate-pro-to-founding-supporter.ts --dry-run
 *
 *   # 本実行 (Founding Supporter 振替、推奨)
 *   DATABASE_URL="<URL>" pnpm --filter @creator-links/api \
 *     tsx scripts/migrate-pro-to-founding-supporter.ts
 *
 *   # 単なる格下げ (demote only)
 *   DATABASE_URL="<URL>" pnpm --filter @creator-links/api \
 *     tsx scripts/migrate-pro-to-founding-supporter.ts --demote-only
 */

import { PrismaClient } from '@prisma/client'

function maskUrl(url: string): string {
  return url.replace(/:[^:@]+@/, ':****@')
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const demoteOnly = process.argv.includes('--demote-only')
  const url = process.env.DATABASE_URL ?? ''
  const isLocal = /@(localhost|127\.0\.0\.1)/.test(url)

  if (!url) {
    console.error('DATABASE_URL is not set. Aborting.')
    process.exit(1)
  }

  console.log('===== migrate PRO → Founding Supporter =====')
  console.log(`Target : ${maskUrl(url)}`)
  console.log(`Env    : ${isLocal ? 'local' : 'REMOTE (likely production)'}`)
  console.log(`Mode   : ${dryRun ? 'DRY-RUN' : 'APPLY'}`)
  console.log(`Policy : ${demoteOnly ? 'DEMOTE ONLY (role のみ GENERAL)' : 'FOUNDING SUPPORTER 振替'}`)
  console.log('')

  const prisma = new PrismaClient()

  try {
    const proUsers = await prisma.user.findMany({
      where: { role: 'PRO' },
      select: {
        id: true,
        email: true,
        isFounderExempt: true,
        isVerified: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    console.log(`[found] ${proUsers.length} PRO user(s)`)
    if (proUsers.length === 0) {
      console.log('Nothing to migrate.')
      return
    }

    for (const u of proUsers.slice(0, 10)) {
      const already = []
      if (u.isFounderExempt) already.push('FS')
      if (u.isVerified) already.push('verified')
      const tag = already.length > 0 ? ` (already ${already.join(',')})` : ''
      console.log(`  - ${u.email}${tag}`)
    }
    if (proUsers.length > 10) console.log(`  ... and ${proUsers.length - 10} more`)

    if (dryRun) {
      console.log('\nDRY-RUN complete. No changes written.')
      return
    }

    const updateData = demoteOnly
      ? { role: 'GENERAL' as const }
      : { role: 'GENERAL' as const, isFounderExempt: true, isVerified: true }

    const result = await prisma.user.updateMany({
      where: { role: 'PRO' },
      data: updateData,
    })

    console.log('')
    console.log(`[done] updated=${result.count}`)
    if (!demoteOnly) {
      console.log('  → Founding Supporter 振替完了 (fee 0% + 認証バッジ付与)')
    } else {
      console.log('  → role=GENERAL への格下げのみ実施')
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
