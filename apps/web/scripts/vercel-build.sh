#!/bin/sh
# Vercel ビルドスクリプト
# - cwd は apps/web（rootDirectory）から実行される
# - Production / Preview: prisma migrate deploy で repo の migration を適用
# - Development (local): スキップ（手元で `pnpm db:migrate` を実行）

set -e

cd ../api
npx prisma generate

if [ "$VERCEL_ENV" = "production" ] || [ "$VERCEL_ENV" = "preview" ]; then
  # 既存 DB (Prod は db push 由来、Preview は手動 reset 済) は baseline migration
  # を "適用済み" マークして P3005 を回避（冪等、既に resolved なら no-op）。
  npx prisma migrate resolve --applied 20261016235435_baseline || true
  npx prisma migrate deploy
fi

cd ../web
npx turbo build --filter=@creator-links/web
