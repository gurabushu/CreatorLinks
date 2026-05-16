#!/bin/sh
# Vercel ビルドスクリプト
# - cwd は apps/web（rootDirectory）から実行される
# - Preview: prisma generate のみ（DB を触らない）
# - Production: enum 値を先に追加してから prisma db push で schema を同期

set -e

cd ../api
npx prisma generate

if [ "$VERCEL_ENV" = "production" ]; then
  echo 'ALTER TYPE "ProjectStatus" ADD VALUE IF NOT EXISTS '\''PRIVATE'\'';' \
    | npx prisma db execute --stdin --schema=prisma/schema.prisma
  npx prisma db push --accept-data-loss
fi

cd ../web
npx turbo build --filter=@creator-links/web
