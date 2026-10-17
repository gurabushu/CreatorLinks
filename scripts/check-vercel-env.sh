#!/bin/sh
# check-vercel-env.sh — Vercel Production 環境変数の充足チェック
#
# docs/beta_deploy_runbook.md §1 で列挙している env var を基準に、
# Vercel Production で未設定のものを一覧表示する。実行権限不要（鍵は見ない、
# 存在チェックのみ）。
#
# 使い方:
#   cd apps/web && sh ../../scripts/check-vercel-env.sh
#
# 要件:
#   - vercel CLI にログイン済み（`vercel whoami` が通る）
#   - cwd が vercel link 済みのプロジェクト（通常 apps/web）
set -e

EXPECTED="
AUTH_SECRET
NEXTAUTH_URL
NEXT_PUBLIC_APP_URL
DATABASE_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
BLOB_READ_WRITE_TOKEN
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_REVENUECAT_WEB_BILLING_PUBLIC_API_KEY
NEXT_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID
NEXT_PUBLIC_REVENUECAT_PRO_OFFERING_ID
REVENUECAT_WEBHOOK_SIGNING_SECRET
PUSHER_APP_ID
PUSHER_KEY
PUSHER_SECRET
PUSHER_CLUSTER
NEXT_PUBLIC_PUSHER_KEY
NEXT_PUBLIC_PUSHER_CLUSTER
RESEND_API_KEY
RESEND_FROM_EMAIL
INNGEST_EVENT_KEY
INNGEST_SIGNING_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
CRON_SECRET
SENTRY_DSN
NEXT_PUBLIC_SENTRY_DSN
SENTRY_ORG
SENTRY_PROJECT
SENTRY_AUTH_TOKEN
"

if ! command -v vercel >/dev/null 2>&1; then
  echo "vercel CLI がインストールされていません。pnpm add -g vercel で導入してください。" >&2
  exit 1
fi

echo "===== Vercel Production env check ====="
echo ""

# vercel env ls のテーブル行 (先頭スペース + 変数名 + ...) だけ抽出。
# ヘッダ行 (name で始まる) は除外。
SET_LIST=$(vercel env ls production 2>/dev/null | awk '/^ [A-Z_]/{print $1}' | grep -v '^name$' | sort -u)
if [ -z "$SET_LIST" ]; then
  echo "⚠️  env list を取得できませんでした（vercel link / login 済みか確認）" >&2
  exit 2
fi

echo "--- 既に設定済み ---"
echo "$SET_LIST" | sed 's/^/  ✅ /'
echo ""

echo "--- 未設定（投入要） ---"
MISSING=0
for var in $EXPECTED; do
  if ! echo "$SET_LIST" | grep -qx "$var"; then
    echo "  ❌ $var"
    MISSING=$((MISSING + 1))
  fi
done
echo ""
echo "未設定: $MISSING 件"

if [ $MISSING -gt 0 ]; then
  echo ""
  echo "追加例:"
  echo "  vercel env add CRON_SECRET production"
  echo "  （値はプロンプトで入力。改行なしの 1 行）"
fi
