# CreatorLinks

個人アーティストのための営業プラットフォーム。手数料 10%（業界最安）でアーティストと発注者をつなぐ。

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js 15 (App Router) + React 19 + Tailwind CSS 4 |
| バックエンド | Hono 4.x + TypeScript |
| API | tRPC 11 + Zod |
| ORM / DB | Prisma 6 + PostgreSQL 16 |
| 認証 | NextAuth.js v5 (JWT + Google OAuth) |
| ファイル | Uploadthing + AWS S3 |
| 課金 | Stripe |
| リアルタイム | Pusher Channels（未設定時はポーリング） |
| メール | Resend + react-email |
| モノレポ | Turborepo + pnpm workspaces |

## ディレクトリ構成

```
creatorLinks/
├── apps/
│   ├── web/          # Next.js フロントエンド (port 3000)
│   └── api/          # Hono API サーバー    (port 3001)
├── packages/
│   └── shared/       # 共通型定義・Zod スキーマ
├── scripts/
│   └── setup.sh      # 初回セットアップスクリプト
└── docker-compose.yml
```

## はじめかた

### 必要なもの
- Node.js 20+
- pnpm 9+
- Docker Desktop

### 初回セットアップ（1 コマンド）

```bash
bash scripts/setup.sh
```

このスクリプトが自動で以下を実行します:
1. `.env` ファイルを生成
2. `pnpm install`
3. Docker で PostgreSQL を起動
4. Prisma マイグレーション
5. テストデータ投入（seed）

### 起動

```bash
pnpm dev
```

| URL | 説明 |
|---|---|
| http://localhost:3000 | フロントエンド |
| http://localhost:3001 | API サーバー |
| http://localhost:3001/api/health | ヘルスチェック |

### テストアカウント

| ロール | メール | パスワード |
|---|---|---|
| 管理者 | admin@creatorlinks.jp | admin1234 |
| PRO アーティスト | yamada@example.com | pro12345 |
| 一般アーティスト | sato@example.com | user1234 |
| 発注者 | client@example.com | user1234 |

## 主要コマンド

```bash
# 開発
pnpm dev                  # 全サービス起動
pnpm build                # 本番ビルド
pnpm type-check           # TypeScript 型チェック

# データベース
pnpm db:migrate           # マイグレーション作成・実行
pnpm db:push              # スキーマを DB に直接反映（開発時）
pnpm db:seed              # テストデータ投入
pnpm db:studio            # Prisma Studio (DB GUI)

# テスト（単体）
pnpm test                          # 全ワークスペースのテスト
pnpm --filter @creator-links/api test  # API 単体テスト（Vitest）

# テスト（E2E） — pnpm dev 起動後に実行
pnpm --filter @creator-links/web test:e2e  # Playwright E2E テスト
# または
cd apps/web && npx playwright test
```

## 環境変数

`apps/web/.env.local` と `apps/api/.env` に設定。
詳細は `.env.example` を参照。

### 最低限必要な変数（ローカル開発）

```env
# DB（docker-compose で自動設定）
DATABASE_URL="postgresql://creator:creator_pass@localhost:5432/creator_links_dev"

# NextAuth（任意の文字列でOK）
NEXTAUTH_SECRET="local-dev-secret"

# Stripe（テストキー）
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

### オプション（機能別）

| 機能 | 変数 |
|---|---|
| Google ログイン | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| ファイルアップロード | `UPLOADTHING_SECRET`, `UPLOADTHING_APP_ID` |
| リアルタイムチャット | `PUSHER_*`, `NEXT_PUBLIC_PUSHER_*` |
| メール送信 | `RESEND_API_KEY` |

## 実装済み機能

- [x] 認証（メール/パスワード・Google OAuth）
- [x] アーティストプロフィール・ポートフォリオ
- [x] 案件 CRUD（作成・一覧・詳細）
- [x] マッチング（応募・承認・却下）
- [x] チャット（ポーリング方式）
- [x] 納品完了・レビュー投稿・評価集計
- [x] 管理画面
- [x] Uploadthing ファイルアップロード（アバター・ポートフォリオ）
- [x] Stripe 課金（PRO プラン Checkout・ファン支援 Checkout）
- [x] Pusher リアルタイムチャット（環境変数設定時のみ有効・未設定はポーリング）
- [x] メール通知（Resend + Inngest バックグラウンドジョブ）
- [x] Vitest 単体テスト（スキーマ・tRPC ルーター・権限チェック）
- [x] Playwright E2E テスト（認証・案件 CRUD・マッチング・チャット）

### 環境変数（各機能を有効にするための追加設定）

| 機能 | 必要な環境変数 | 未設定時の動作 |
|---|---|---|
| アバター・ポートフォリオアップロード | `UPLOADTHING_SECRET`, `UPLOADTHING_APP_ID` | アップロード不可 |
| Stripe PRO プラン | `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID` | Checkout 不可 |
| リアルタイムチャット | `PUSHER_APP_ID`, `PUSHER_SECRET`, `NEXT_PUBLIC_PUSHER_KEY` | 3秒ポーリングで動作 |
| メール通知 | `RESEND_API_KEY` + Inngest Cloud | コンソールログのみ |
