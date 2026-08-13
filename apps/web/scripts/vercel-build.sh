#!/bin/sh
# Vercel ビルドスクリプト
# - cwd は apps/web（rootDirectory）から実行される
# - Preview: prisma generate のみ（DB を触らない）
# - Production: enum 値を先に追加してから prisma db push で schema を同期

set -e

cd ../api
npx prisma generate

if [ "$VERCEL_ENV" = "production" ]; then
  # db push first so a fresh DB gets the ProjectStatus enum created with all values.
  # The ALTER below is a defensive no-op that only matters on an older DB whose
  # ProjectStatus enum predates the PRIVATE value; `|| true` keeps the build green
  # if db push already handled it.
  npx prisma db push --accept-data-loss
  echo 'ALTER TYPE "ProjectStatus" ADD VALUE IF NOT EXISTS '\''PRIVATE'\'';' \
    | npx prisma db execute --stdin --schema=prisma/schema.prisma || true
fi

cd ../web
npx turbo build --filter=@creator-links/web
