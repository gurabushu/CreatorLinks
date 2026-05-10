#!/usr/bin/env bash
# setup.sh — ローカル開発環境の初期セットアップ
set -e

echo "🚀 CreatorLinks ローカル環境セットアップ"
echo "=========================================="

# .env.local チェック
if [ ! -f "apps/api/.env" ]; then
  echo "📄 apps/api/.env を作成しています..."
  cat > apps/api/.env << 'EOF'
DATABASE_URL="postgresql://creator:creator_pass@localhost:5432/creator_links_dev"
NEXTAUTH_SECRET="local-dev-secret-change-in-production"
STRIPE_SECRET_KEY="sk_test_dummy"
STRIPE_WEBHOOK_SECRET="whsec_dummy"
STRIPE_PRO_PRICE_ID="price_dummy"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
EOF
  echo "  ✅ apps/api/.env 作成完了"
fi

if [ ! -f "apps/web/.env.local" ]; then
  echo "📄 apps/web/.env.local を作成しています..."
  cat > apps/web/.env.local << 'EOF'
DATABASE_URL="postgresql://creator:creator_pass@localhost:5432/creator_links_dev"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="local-dev-secret-change-in-production"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
STRIPE_SECRET_KEY="sk_test_dummy"
STRIPE_PUBLISHABLE_KEY="pk_test_dummy"
STRIPE_WEBHOOK_SECRET="whsec_dummy"
STRIPE_PRO_PRICE_ID="price_dummy"
UPLOADTHING_SECRET=""
UPLOADTHING_APP_ID=""
NEXT_PUBLIC_PUSHER_KEY=""
NEXT_PUBLIC_PUSHER_CLUSTER="ap3"
RESEND_API_KEY=""
NEXT_PUBLIC_APP_URL="http://localhost:3000"
API_URL="http://localhost:3001"
EOF
  echo "  ✅ apps/web/.env.local 作成完了"
fi

# pnpm インストール
echo ""
echo "📦 依存パッケージをインストールしています..."
pnpm install

# Docker PostgreSQL 起動
echo ""
echo "🐘 PostgreSQL を起動しています..."
docker compose up -d db

echo "  PostgreSQL が起動するまで待機中..."
sleep 5

# Prisma マイグレーション
echo ""
echo "🗃️  データベースをセットアップしています..."
cd apps/api
pnpm prisma migrate dev --name init
pnpm prisma generate

# シードデータ投入
echo ""
echo "🌱 テストデータを投入しています..."
pnpm db:seed

cd ../..

echo ""
echo "=========================================="
echo "✅ セットアップ完了！"
echo ""
echo "次のコマンドで起動:"
echo "  pnpm dev"
echo ""
echo "テストアカウント:"
echo "  管理者    : admin@creatorlinks.jp / admin1234"
echo "  PRO artist: yamada@example.com   / pro12345"
echo "  artist    : sato@example.com     / user1234"
echo "  client    : client@example.com   / user1234"
echo ""
echo "アクセス:"
echo "  フロントエンド: http://localhost:3000"
echo "  API サーバー  : http://localhost:3001"
echo "  Prisma Studio : pnpm db:studio (apps/api 内で)"
