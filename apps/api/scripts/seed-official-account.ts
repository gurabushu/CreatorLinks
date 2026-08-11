/**
 * seed-official-account.ts
 *
 * 本番 DB に「公式アカウント（isOfficial=true / role=ADMIN）」を 1 人だけ作る。
 * ウェルカム DM・サポート窓口・お知らせ配信は isOfficial=true な User が
 * 1 人存在することを前提に動く（lib/official-account.ts 参照）。
 *
 * 使い方:
 *   # まず dry-run で現状の isOfficial ユーザーを確認
 *   DATABASE_URL="<本番 URL>" \
 *     OFFICIAL_EMAIL="admin@example.com" \
 *     OFFICIAL_NAME="運営" \
 *     OFFICIAL_DISPLAY_NAME="運営公式" \
 *     OFFICIAL_PASSWORD="strong-password-here" \
 *     pnpm --filter @creator-links/api tsx scripts/seed-official-account.ts --dry-run
 *
 *   # 実行（作成/昇格）
 *   DATABASE_URL="<本番 URL>" \
 *     OFFICIAL_EMAIL=... OFFICIAL_NAME=... OFFICIAL_DISPLAY_NAME=... OFFICIAL_PASSWORD=... \
 *     pnpm --filter @creator-links/api tsx scripts/seed-official-account.ts
 *
 * 安全策:
 * - 別 email が既に isOfficial=true の場合は abort（--force で上書き可）
 * - パスワードは 8 文字以上を必須
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

function maskUrl(url: string): string {
  return url.replace(/:[^:@]+@/, ':****@')
}

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v || v.length === 0) {
    console.error(`Missing env: ${name}`)
    process.exit(1)
  }
  return v
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const force = process.argv.includes('--force')
  const url = process.env.DATABASE_URL ?? ''
  const isLocal = /@(localhost|127\.0\.0\.1)/.test(url)

  const email = requireEnv('OFFICIAL_EMAIL').toLowerCase()
  const name = requireEnv('OFFICIAL_NAME')
  const displayName = process.env.OFFICIAL_DISPLAY_NAME ?? name
  const password = requireEnv('OFFICIAL_PASSWORD')
  const bio =
    process.env.OFFICIAL_BIO ??
    'プラットフォーム運営公式アカウントです。お知らせ配信・サポート・キュレーションを担当します。'

  if (password.length < 8) {
    console.error('OFFICIAL_PASSWORD must be 8+ characters.')
    process.exit(1)
  }
  if (!url) {
    console.error('DATABASE_URL is not set. Aborting.')
    process.exit(1)
  }

  console.log('===== seed official account =====')
  console.log(`Target      : ${maskUrl(url)}`)
  console.log(`Env         : ${isLocal ? 'local' : 'REMOTE (likely production)'}`)
  console.log(`Mode        : ${dryRun ? 'DRY-RUN (no writes)' : 'APPLY'}`)
  console.log(`Email       : ${email}`)
  console.log(`Name        : ${name}`)
  console.log(`DisplayName : ${displayName}`)
  console.log(`Force       : ${force ? 'yes' : 'no'}`)
  console.log('')

  const prisma = new PrismaClient()

  try {
    const existingOfficial = await prisma.user.findFirst({
      where: { isOfficial: true },
      select: { id: true, email: true, name: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    if (existingOfficial) {
      console.log(
        `[current isOfficial] ${existingOfficial.email}  (${existingOfficial.name}, created ${existingOfficial.createdAt.toISOString()})`,
      )
      if (existingOfficial.email !== email && !force) {
        console.error(
          `\nAborting: another user (${existingOfficial.email}) is already isOfficial=true.\n` +
            `Re-run with --force to demote it and promote ${email} instead.`,
        )
        process.exit(1)
      }
    } else {
      console.log('[current isOfficial] (none)')
    }

    if (dryRun) {
      console.log('\nDRY-RUN complete. No changes written.')
      return
    }

    const passwordHash = await bcrypt.hash(password, 12)

    // 別 email が isOfficial=true だった場合は demote してから昇格
    if (existingOfficial && existingOfficial.email !== email) {
      await prisma.user.update({
        where: { id: existingOfficial.id },
        data: { isOfficial: false },
      })
      console.log(`[demoted] ${existingOfficial.email} → isOfficial=false`)
    }

    const upserted = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        displayName,
        passwordHash,
        role: 'ADMIN',
        isOfficial: true,
        bio,
      },
      create: {
        email,
        name,
        displayName,
        passwordHash,
        role: 'ADMIN',
        isOfficial: true,
        bio,
        genres: [],
      },
      select: { id: true, email: true, createdAt: true },
    })

    console.log(
      `\n[ok] ${upserted.email}  id=${upserted.id}  created=${upserted.createdAt.toISOString()}`,
    )
    console.log('\nOfficial account is ready. Welcome-DM / support-window / announcements will now use this user.')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
