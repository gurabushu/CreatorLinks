#!/bin/sh
# Vercel ビルドスクリプト
# - cwd は apps/web（rootDirectory）から実行される
# - Preview: prisma generate のみ（DB を触らない）
# - Production: prisma migrate deploy で repo の migration を適用

set -e

cd ../api
npx prisma generate

if [ "$VERCEL_ENV" = "production" ]; then
  # 既存 Prod DB は pre-baseline の db push 由来でスキーマ有。
  # baseline migration を "適用済み" マークして P3005 を回避（冪等）。
  npx prisma migrate resolve --applied 20261016235435_baseline || true
  npx prisma migrate deploy
fi

cd ../web
npx turbo build --filter=@creator-links/web
