#!/bin/bash
# Vercel 環境変数 一括設定スクリプト
# 使い方: bash setup-vercel-env.sh
# 事前に: npm install -g vercel && vercel login

set -e

echo "=== Vercel 環境変数設定スクリプト ==="
echo ""

# VercelプロジェクトにLink（初回のみ）
echo "Vercel プロジェクトにリンク中..."
vercel link --yes 2>/dev/null || true

echo ""
echo "環境変数を設定します..."

# --- 必須: 手動で値を変更してください ---

# Railway の PostgreSQL 外部 URL（内部URLではなく PUBLIC URL を使う）
# Railway ダッシュボード → PostgreSQL → Variables タブ → DATABASE_PUBLIC_URL をコピー
DATABASE_URL="postgresql://postgres:cVNlTsPrBoCmhwwtuoMhpdAiXDcFXqSP@turntable.proxy.rlwy.net:39699/railway"

# Vercel デプロイ後の URL（例: https://creator-links.vercel.app）
NEXTAUTH_URL="https://creator-links-web-25v7.vercel.app"

# 認証用シークレット（既存値を使用）
NEXTAUTH_SECRET="prt+Cj2wYVGUBCcG3ztiRGDoidFgqZPSjN4VPViz10o="

# Railway API の URL
API_URL="https://creatorlinks-production.up.railway.app"

# Stripe（テスト用ダミー値）
STRIPE_SECRET_KEY="sk_test_dummy"
STRIPE_PUBLISHABLE_KEY="pk_test_dummy"
STRIPE_WEBHOOK_SECRET="whsec_dummy"
STRIPE_PRO_PRICE_ID="price_dummy"

# Pusher（未設定の場合は空）
NEXT_PUBLIC_PUSHER_KEY=""
NEXT_PUBLIC_PUSHER_CLUSTER="ap3"

# --- ここから自動設定 ---

set_env() {
  local key=$1
  local val=$2
  echo "$val" | vercel env add "$key" production --force 2>/dev/null \
    && echo "  ✓ $key" \
    || echo "  ✗ $key (失敗)"
}

set_env DATABASE_URL "$DATABASE_URL"
set_env NEXTAUTH_URL "$NEXTAUTH_URL"
set_env NEXTAUTH_SECRET "$NEXTAUTH_SECRET"
set_env API_URL "$API_URL"
set_env STRIPE_SECRET_KEY "$STRIPE_SECRET_KEY"
set_env STRIPE_PUBLISHABLE_KEY "$STRIPE_PUBLISHABLE_KEY"
set_env STRIPE_WEBHOOK_SECRET "$STRIPE_WEBHOOK_SECRET"
set_env STRIPE_PRO_PRICE_ID "$STRIPE_PRO_PRICE_ID"
set_env NEXT_PUBLIC_PUSHER_KEY "$NEXT_PUBLIC_PUSHER_KEY"
set_env NEXT_PUBLIC_PUSHER_CLUSTER "$NEXT_PUBLIC_PUSHER_CLUSTER"

echo ""
echo "=== 完了！次のステップ ==="
echo "1. DATABASE_URL を Railway の PUBLIC URL に書き換えてから再実行してください"
echo "   Railway → PostgreSQL → Variables → DATABASE_PUBLIC_URL"
echo "2. NEXTAUTH_URL を実際の Vercel URL に合わせて書き換えてください"
echo "3. 設定後: vercel --prod で再デプロイ"
