#!/bin/sh
# Vercel ビルドスクリプト
# - cwd は apps/web（rootDirectory）から実行される
# - Production / Preview: prisma migrate deploy で repo の migration を適用
# - Development (local): スキップ（手元で `pnpm db:migrate` を実行）
#
# migrate は advisory lock (pg_advisory_lock) を取るため、連続 push で並行 build が走ると
# P1002 でタイムアウトする。最大 5 回 (計 ~2 分) までリトライする。

set -e

cd ../api
npx prisma generate

migrate_with_retry() {
  i=1
  while [ $i -le 5 ]; do
    if npx prisma migrate deploy; then
      return 0
    fi
    sleep_sec=$((i * 15))
    echo "[vercel-build] migrate deploy failed (try $i). Retrying in ${sleep_sec}s..."
    sleep $sleep_sec
    i=$((i + 1))
  done
  echo "[vercel-build] migrate deploy failed after 5 tries. Aborting."
  return 1
}

if [ "$VERCEL_ENV" = "production" ] || [ "$VERCEL_ENV" = "preview" ]; then
  # 既存 DB (Prod は db push 由来、Preview は手動 reset 済) は baseline migration
  # を "適用済み" マークして P3005 を回避（冪等、既に resolved なら no-op）。
  npx prisma migrate resolve --applied 20261016235435_baseline || true
  migrate_with_retry
fi

cd ../web
npx turbo build --filter=@creator-links/web
