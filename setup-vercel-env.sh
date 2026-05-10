#!/bin/bash
# Vercel 環境変数 一括設定スクリプト
# 使い方: bash setup-vercel-env.sh

SCOPE="tonokyama-s-projects"
PROJECT="creator-links-web-25v7"
WEB_DIR="$(cd "$(dirname "$0")/apps/web" && pwd)"

echo "=== Vercel 環境変数設定スクリプト ==="
echo ""

# apps/web ディレクトリでリンク
echo "プロジェクトにリンク中..."
cd "$WEB_DIR"
vercel link --project "$PROJECT" --scope "$SCOPE" --yes 2>&1 || {
  echo "(link失敗 — 続行します)"
}

echo ""
echo "環境変数を設定中..."

set_env() {
  local key=$1
  local val=$2
  if [ -z "$val" ]; then
    echo "  - $key (スキップ)"
    return
  fi
  local result
  result=$(printf '%s' "$val" | vercel env add "$key" production --yes --force 2>&1)
  local code=$?
  if [ $code -eq 0 ]; then
    echo "  ✓ $key"
  else
    echo "  ✗ $key: $result"
  fi
}

set_env DATABASE_URL    "postgresql://postgres:cVNlTsPrBoCmhwwtuoMhpdAiXDcFXqSP@turntable.proxy.rlwy.net:39699/railway"
set_env NEXTAUTH_URL    "https://creator-links-web-25v7.vercel.app"
set_env NEXTAUTH_SECRET "prt+Cj2wYVGUBCcG3ztiRGDoidFgqZPSjN4VPViz10o="
set_env API_URL         "https://creatorlinks-production.up.railway.app"
set_env STRIPE_SECRET_KEY    "sk_test_dummy"
set_env STRIPE_PUBLISHABLE_KEY "pk_test_dummy"
set_env STRIPE_WEBHOOK_SECRET  "whsec_dummy"
set_env STRIPE_PRO_PRICE_ID    "price_dummy"
set_env NEXT_PUBLIC_PUSHER_CLUSTER "ap3"

echo ""
echo "=== 完了！再デプロイします ==="
vercel --prod --yes 2>&1 | tail -5
