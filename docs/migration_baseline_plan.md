# Prisma migration baseline 化 手順書

**目的:** 本番運用を `prisma db push --accept-data-loss` から `prisma migrate deploy` に切り替え、schema 変更の履歴と rollback 性を確保する。

**作成日:** 2026-08-09
**対象環境:** Railway 本番 DB + Vercel Production ビルド

---

## 現状（要修正）

- `apps/api/prisma/migrations/20260510044358_init/` — 3 ヶ月前の初期 migration のみ
- 以降のスキーマ変更（Match / Payment / User の Stripe Connect 系フィールド / Announcement / FeaturedArtist / PromoCode / User.isOfficial 等）は全て `db push` で本番に直接反映
- **migration 履歴と本番 DB の実スキーマが大きく乖離**（履歴上は init のみ、実際は数十カラム / テーブル追加済み）
- `apps/web/scripts/vercel-build.sh` が production で `prisma db push --accept-data-loss` を実行
- 加えて Postgres の enum 制約回避で `ALTER TYPE "ProjectStatus" ADD VALUE IF NOT EXISTS 'PRIVATE'` を手打ち

## リスク

- カラム rename が silent に data loss → 通常運用で気付けない
- rollback 手段なし（履歴がないので前バージョンに戻せない）
- 障害時にどの変更で入った schema かを追えない
- Phase A のイベント／カレンダーモデル追加を db push で入れると、baseline 化がさらに難しくなる

---

## 手順（Prisma 公式の "baseline for existing databases" 準拠）

### 前提

- **本番 DB のフルバックアップを取得済み**（Railway ダッシュボード or `pg_dump` で dump 保存）
- Vercel でメンテナンス告知（推奨）or 深夜帯実施（アクセス少ない時間）
- `DATABASE_URL` を production に一時的に向けて local から実行できる状態

### Step 1: 本番 DB を introspect して schema.prisma と一致確認

```bash
cd apps/api

# バックアップ用に production の DB URL を保存
export DATABASE_URL_PROD="<Railway 本番 DATABASE_URL>"

# 現行の schema.prisma を退避
cp prisma/schema.prisma prisma/schema.prisma.bak

# 本番 DB から実スキーマを取得
DATABASE_URL="$DATABASE_URL_PROD" npx prisma db pull

# diff を確認
git diff prisma/schema.prisma
```

**判断ポイント:**
- diff が **空 or リレーション記述の差のみ** なら OK → 現行 schema と本番 DB が一致している
- **フィールド追加・削除が出る** なら本番 DB が schema.prisma より進んでいる or 遅れている → 先に db push で揃えるか、schema.prisma を pull 結果に寄せる判断が必要

（diff 確認後、`git checkout prisma/schema.prisma` で元に戻して次へ）

### Step 2: 空の DB からの差分を「baseline」migration として生成

```bash
# 既存 migration フォルダをリネーム（履歴を残す）
mv prisma/migrations/20260510044358_init prisma/migrations/_archive_20260510_init

# 新しい baseline migration ディレクトリを作成
BASELINE_DIR="prisma/migrations/$(date -u +%Y%m%d%H%M%S)_baseline"
mkdir -p "$BASELINE_DIR"

# 現行 schema.prisma から SQL を生成（空 DB → 現行スキーマの diff）
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > "$BASELINE_DIR/migration.sql"

# 生成された SQL を目視確認（enum, 制約, index が正しく含まれているか）
less "$BASELINE_DIR/migration.sql"
```

**判断ポイント:**
- Postgres の enum は `CREATE TYPE ... AS ENUM (...)` として一括生成されるので、vercel-build.sh の `ALTER TYPE ADD VALUE 'PRIVATE'` workaround は**不要になる**（enum 定義自体に含まれる）
- 生成された SQL は本番で既に適用済みの状態なので、実行はしない

### Step 3: 本番 DB に baseline を「適用済み」として記録

```bash
DATABASE_URL="$DATABASE_URL_PROD" npx prisma migrate resolve \
  --applied "$(basename $BASELINE_DIR)"
```

これで本番 DB の `_prisma_migrations` テーブルに baseline が「適用済み」として登録され、次回以降の `migrate deploy` はこの baseline を skip する。

### Step 4: local / preview の DB にも同じ操作を適用

```bash
# local dev DB
docker compose down -v          # ローカル DB を drop（データが消えるので注意）
docker compose up -d
DATABASE_URL="postgresql://creator:creator_pass@localhost:5433/creator_links_dev" \
  npx prisma migrate deploy      # baseline を新規適用（新しい DB なので）
pnpm --filter api db:seed        # seed 再投入
```

### Step 5: vercel-build.sh を書き換え

```diff
- if [ "$VERCEL_ENV" = "production" ]; then
-   echo 'ALTER TYPE "ProjectStatus" ADD VALUE IF NOT EXISTS '\''PRIVATE'\'';' \
-     | npx prisma db execute --stdin --schema=prisma/schema.prisma
-   npx prisma db push --accept-data-loss
- fi
+ if [ "$VERCEL_ENV" = "production" ]; then
+   npx prisma migrate deploy
+ fi
```

### Step 6: package.json の `db:push` は開発時のみと明記

```jsonc
// apps/api/package.json
"db:push": "prisma db push",  // 開発時のスキーマ実験用 (--accept-data-loss は付けない)
"db:migrate": "prisma migrate dev",  // 通常はこちら
```

### Step 7: 本番デプロイで疎通確認

```bash
git add apps/api/prisma/migrations apps/web/scripts/vercel-build.sh apps/api/package.json
git commit -- <上記ファイル>
git push
```

Vercel ビルドログで `Applying migration ...` は表示されない（baseline は既に applied 扱いなので）ことを確認。

---

## 以降の運用

- スキーマ変更 → `pnpm db:migrate` で local に migration file 生成 → コミット
- Vercel ビルド時に `migrate deploy` が新しい migration を検出して自動適用
- **`db push --accept-data-loss` は本番で二度と使わない**

---

## 実行判断のチェックリスト

- [ ] 本番 DB のフルバックアップ取得済み
- [ ] Railway 側でも point-in-time recovery が有効か確認
- [ ] Vercel を一時的に build 停止（or 深夜帯実施）
- [ ] Step 1 の diff で本番 DB と schema.prisma のズレがないことを確認
- [ ] Step 2 で生成された SQL を目視 review（テーブル・enum・index の抜けがないか）
- [ ] Step 3 実行後、Prisma Studio や `\dt _prisma_migrations` で `_prisma_migrations` レコードを確認
- [ ] 本手順を実行するタイムスロットを事前決定
