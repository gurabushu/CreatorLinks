// prisma/seed.ts — 開発用テストデータ投入
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding...')

  // ---- ユーザー作成 ----
  const adminHash = await bcrypt.hash('admin1234', 12)
  const proHash = await bcrypt.hash('pro12345', 12)
  const generalHash = await bcrypt.hash('user1234', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@creatorlinks.jp' },
    update: {},
    create: {
      email: 'admin@creatorlinks.jp',
      name: '管理者',
      passwordHash: adminHash,
      role: 'ADMIN',
      genres: [],
    },
  })

  const artist1 = await prisma.user.upsert({
    where: { email: 'yamada@example.com' },
    update: {},
    create: {
      email: 'yamada@example.com',
      name: '山田 太郎',
      passwordHash: proHash,
      role: 'PRO',
      genres: ['音楽', '動画'],
      bio: 'シンガーソングライター/映像クリエイター。YouTube チャンネル登録者 3 万人。BGM・楽曲制作承ります。',
      averageRating: 4.8,
    },
  })

  const artist2 = await prisma.user.upsert({
    where: { email: 'sato@example.com' },
    update: {},
    create: {
      email: 'sato@example.com',
      name: '佐藤 花',
      passwordHash: generalHash,
      role: 'GENERAL',
      genres: ['イラスト', 'デザイン'],
      bio: 'フリーランスイラストレーター。キャラクターデザイン・ロゴ・SNSバナーが得意です。',
      averageRating: 4.5,
    },
  })

  const client1 = await prisma.user.upsert({
    where: { email: 'client@example.com' },
    update: {},
    create: {
      email: 'client@example.com',
      name: '株式会社サンプル',
      passwordHash: generalHash,
      role: 'GENERAL',
      genres: [],
      bio: 'Web・動画コンテンツ制作を発注しています。',
    },
  })

  // ---- ポートフォリオ ----
  await prisma.portfolio.upsert({
    where: { id: 'seed-portfolio-1' },
    update: {},
    create: {
      id: 'seed-portfolio-1',
      userId: artist1.id,
      title: 'オリジナル楽曲「春の詩」',
      description: 'ピアノとアコースティックギターによるインスト曲。YouTube BGM 向け。',
      mediaType: 'AUDIO',
      fileKey: 'demo-key-1',
    },
  })

  await prisma.portfolio.upsert({
    where: { id: 'seed-portfolio-2' },
    update: {},
    create: {
      id: 'seed-portfolio-2',
      userId: artist2.id,
      title: 'キャラクターデザイン集',
      description: 'ゲーム・VTuber 向けキャラクター 10 体のデザイン集。',
      mediaType: 'IMAGE',
      fileKey: 'demo-key-2',
    },
  })

  // ---- 案件 ----
  const project1 = await prisma.project.upsert({
    where: { id: 'seed-project-1' },
    update: {},
    create: {
      id: 'seed-project-1',
      clientId: client1.id,
      title: 'YouTube チャンネル用 BGM 楽曲制作（3 曲）',
      description:
        '旅行 Vlog チャンネル向けに明るく爽やかな BGM を 3 曲お願いしたいです。\n\n【要件】\n・尺: 各 1〜2 分\n・ループ対応\n・納期: 2 週間\n・ロイヤリティフリーでの提供',
      genres: ['音楽'],
      budget: 30000,
      contractType: 'SPOT',
      status: 'OPEN',
    },
  })

  const project2 = await prisma.project.upsert({
    where: { id: 'seed-project-2' },
    update: {},
    create: {
      id: 'seed-project-2',
      clientId: client1.id,
      title: 'SNS 投稿用イラスト月次制作（継続依頼）',
      description:
        'Instagram・X へ週 2 回投稿するイラストの継続制作をお願いしたいです。\n\n【要件】\n・テイスト: ゆるかわいい系\n・サイズ: 1:1 (1080×1080px)\n・毎月 8 枚納品\n・カラーパレットはご相談',
      genres: ['イラスト'],
      budget: 50000,
      contractType: 'SUBSCRIPTION',
      status: 'OPEN',
    },
  })

  await prisma.project.upsert({
    where: { id: 'seed-project-3' },
    update: {},
    create: {
      id: 'seed-project-3',
      clientId: artist1.id,
      title: '楽曲 MV 制作コラボ相手募集（同業者マッチング）',
      description:
        '新曲のミュージックビデオを一緒に作る映像クリエイターを探しています。\n\n【概要】\n・楽曲ジャンル: J-POP\n・MV 尺: 3 分 30 秒\n・スタイル: ロードムービー風\n・制作期間: 1 ヶ月',
      genres: ['音楽', '動画'],
      budget: 80000,
      contractType: 'SPOT',
      status: 'OPEN',
    },
  })

  // ---- マッチング（承認済み） ----
  const match1 = await prisma.match.upsert({
    where: { id: 'seed-match-1' },
    update: {},
    create: {
      id: 'seed-match-1',
      projectId: project1.id,
      artistId: artist1.id,
      status: 'ACCEPTED',
      message: '旅行 Vlog 向け BGM の制作実績があります。サンプルをお聞きいただけますか？',
    },
  })

  // ---- チャットメッセージ ----
  const now = new Date()
  const messages = [
    { body: 'ご応募ありがとうございます！サンプル拝見しました。とても良い雰囲気ですね。', senderId: client1.id, minutesAgo: 60 },
    { body: 'ありがとうございます！ご要望の雰囲気に合わせて制作できます。まずは 1 曲サンプルを作ってみましょうか？', senderId: artist1.id, minutesAgo: 50 },
    { body: 'はい、ぜひお願いします！コード進行はメジャー系でお願いできますか？', senderId: client1.id, minutesAgo: 40 },
    { body: '承知しました。C メジャー系で明るく仕上げます。1 週間ほどでご連絡します！', senderId: artist1.id, minutesAgo: 30 },
  ]

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    await prisma.message.upsert({
      where: { id: `seed-message-${i + 1}` },
      update: {},
      create: {
        id: `seed-message-${i + 1}`,
        matchId: match1.id,
        senderId: msg.senderId,
        body: msg.body,
        createdAt: new Date(now.getTime() - msg.minutesAgo * 60 * 1000),
        readAt: new Date(),
      },
    })
  }

  // ---- 応募（未承認） ----
  await prisma.match.upsert({
    where: { id: 'seed-match-2' },
    update: {},
    create: {
      id: 'seed-match-2',
      projectId: project2.id,
      artistId: artist2.id,
      status: 'APPLIED',
      message: 'ゆるかわいいイラストが得意です。ポートフォリオをご確認ください。',
    },
  })

  console.log('✅ Seed complete!')
  console.log('\n📋 テストアカウント:')
  console.log('  管理者    : admin@creatorlinks.jp / admin1234')
  console.log('  PRO artist: yamada@example.com   / pro12345')
  console.log('  artist    : sato@example.com     / user1234')
  console.log('  client    : client@example.com   / user1234')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
