/**
 * rotate-leaked-passwords.ts
 *
 * README に平文パスワードが公開されていた seed アカウントを検査し、
 * 存在すればランダム 24 文字の新パスワードにローテーションする。
 *
 * 使い方:
 *   # まずは dry-run で本番 DB に何が居るか確認
 *   DATABASE_URL="<Vercel/Railway の本番 URL>" \
 *     pnpm --filter @creator-links/api tsx scripts/rotate-leaked-passwords.ts --dry-run
 *
 *   # 実行（新パスワードは 1 度だけ標準出力に表示される。保存漏れ厳禁）
 *   DATABASE_URL="<本番 URL>" \
 *     pnpm --filter @creator-links/api tsx scripts/rotate-leaked-passwords.ts
 *
 * 追加オプション:
 *   --demote-admin  admin@creatorlinks.jp を GENERAL role にダウングレード
 *                   （本来の運営は tonokyama@gmail.com なので、seed 由来の ADMIN 権限を剥がす）
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'

const LEAKED_EMAILS = [
  'admin@creatorlinks.jp',
  'yamada@example.com',
  'sato@example.com',
  'client@example.com',
] as const

function generatePassword(): string {
  return crypto.randomBytes(18).toString('base64url')
}

function maskUrl(url: string): string {
  return url.replace(/:[^:@]+@/, ':****@')
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const demoteAdmin = process.argv.includes('--demote-admin')
  const url = process.env.DATABASE_URL ?? ''
  const isLocal = /@(localhost|127\.0\.0\.1)/.test(url)

  console.log('===== leaked seed account rotation =====')
  console.log(`Target : ${maskUrl(url) || '(DATABASE_URL not set)'}`)
  console.log(`Mode   : ${dryRun ? 'DRY-RUN (no writes)' : 'ROTATE'}`)
  console.log(`Env    : ${isLocal ? 'local' : 'REMOTE (likely production)'}`)
  console.log(`Demote : ${demoteAdmin ? 'yes (admin@creatorlinks.jp → GENERAL)' : 'no'}`)
  console.log('')

  if (!url) {
    console.error('DATABASE_URL is not set. Aborting.')
    process.exit(1)
  }

  const prisma = new PrismaClient()
  const rotated: Array<{ email: string; newPassword: string; demoted: boolean }> = []

  try {
    for (const email of LEAKED_EMAILS) {
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isOfficial: true,
          _count: {
            select: {
              portfolios: true,
              projectsAsClient: true,
              matchesAsArtist: true,
              matchesAsPartner: true,
              sentMessages: true,
            },
          },
        },
      })

      if (!user) {
        console.log(`[skip ] ${email} — not found on this DB`)
        continue
      }

      const c = user._count
      console.log(
        `[found] ${email}  role=${user.role}${user.isOfficial ? ' isOfficial' : ''}` +
          `  portfolios=${c.portfolios} projects=${c.projectsAsClient}` +
          `  matches=${c.matchesAsArtist + c.matchesAsPartner} messages=${c.sentMessages}`,
      )

      if (dryRun) continue

      const password = generatePassword()
      const hash = await bcrypt.hash(password, 12)
      const shouldDemote =
        demoteAdmin && email === 'admin@creatorlinks.jp' && user.role === 'ADMIN'

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hash,
          ...(shouldDemote ? { role: 'GENERAL' as const } : {}),
        },
      })
      rotated.push({ email, newPassword: password, demoted: shouldDemote })
    }
  } finally {
    await prisma.$disconnect()
  }

  if (rotated.length > 0) {
    console.log('\n===== NEW PASSWORDS (shown once — save now) =====')
    for (const r of rotated) {
      console.log(
        `${r.email.padEnd(28)} ${r.newPassword}${r.demoted ? '   [role → GENERAL]' : ''}`,
      )
    }
    console.log('=================================================\n')
    console.log('Old leaked passwords are now invalidated.')
  } else if (!dryRun) {
    console.log('\nNothing to rotate.')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
