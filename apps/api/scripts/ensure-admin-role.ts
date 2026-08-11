// scripts/ensure-admin-role.ts
// 指定メールアドレスのユーザーを ADMIN ロールに昇格する（idempotent）。
// prod DB で公式運営アカウントの権限を保証したいときに使用。
//
// 使い方:
//   ローカル: pnpm --filter @creator-links/api tsx scripts/ensure-admin-role.ts tonokyama@gmail.com
//   本番:    DATABASE_URL="postgresql://..." pnpm --filter @creator-links/api tsx scripts/ensure-admin-role.ts tonokyama@gmail.com
//
// --dry-run で変更なしで確認のみ。

import { PrismaClient } from '@prisma/client'

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const email = args.filter((a) => !a.startsWith('--'))[0]

  if (!email) {
    console.error('Usage: tsx scripts/ensure-admin-role.ts <email> [--dry-run]')
    process.exit(1)
  }

  const prisma = new PrismaClient()
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, role: true, isOfficial: true },
    })

    if (!user) {
      console.error(`✗ User not found: ${email}`)
      process.exit(1)
    }

    console.log('現在の状態:')
    console.log(JSON.stringify(user, null, 2))

    if (user.role === 'ADMIN') {
      console.log(`\n✓ ${email} は既に ADMIN です。何もしません。`)
      return
    }

    if (dryRun) {
      console.log(`\n[dry-run] role を ${user.role} → ADMIN に変更する予定です。`)
      return
    }

    const updated = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' },
      select: { email: true, role: true },
    })
    console.log(`\n✓ 更新完了: ${updated.email} → role=${updated.role}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
