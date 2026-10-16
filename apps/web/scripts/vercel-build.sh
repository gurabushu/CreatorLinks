#!/bin/sh
# Vercel ビルドスクリプト
# - cwd は apps/web（rootDirectory）から実行される
# - Preview: prisma generate のみ（DB を触らない）
# - Production: prisma migrate deploy で repo の migration を適用

set -e

cd ../api
npx prisma generate

if [ "$VERCEL_ENV" = "production" ]; then
  # baseline 化後は migrate deploy のみで同期する。
  # 以前の `db push --accept-data-loss` + enum 手打ち ALTER は廃止。
  # 新しい migration を追加する場合はローカルで `pnpm db:migrate` して commit し、
  # このビルドで自動適用される流れ。
  npx prisma migrate deploy
fi

cd ../web
npx turbo build --filter=@creator-links/web
