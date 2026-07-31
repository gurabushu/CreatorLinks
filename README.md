# CreatorLinks

個人アーティストのための営業プラットフォーム。手数料 7%（業界最安）でアーティストと発注者をつなぐ。

**デプロイ先：** https://creator-links-web-25v7.vercel.app

## 開発背景
「才能は諸刃の剣である」
開発者は福祉大でソーシャルワークを学び専門知識を実務に落とし込んできた実践者という側面を持つ。
社会とは、平均的な人間が生きやすく設計されており、そこから逸脱する形でマジョリティ（想定する社会設計）から外れる人たちが存在している。

それは生きづらさでもあり、才能でもあるということである。

繊細で優しいあまり自らを傷つけてしまう者や、誰よりも努力家でストイックなあまりに、この未整備状態の社会において、損な役回りをしてしまう人。
上記のような、才能あふれ人の気持ちがわかり、誰よりも素晴らしい能力や才能・資質、高い目標を掲げ努力できる人たちがつまらない想いや良くない境遇に遭うのを少しでも
減らせないか。いかに持続可能な経済圏を確立し、世のクリエイターの方々の活動や創作を手助けできないか。これが当アプリの開発動機の中核となります。

開発者本人として強く訴えたいこととしては、決して「不平等への是正」ではなく、「選択的相互贔屓」ということです。
お互いがお互いの身内をエコ贔屓しあって、初めて成立する平等を「理念」とし、社会におけるインフラネットワークのような仕組み作りを行なっております。

最後に、世の中のクリエイターやアーティストの方々へ敬意と敬愛、リスペクトそして感謝を込めて。


## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js 15 (App Router) + React 19 + Tailwind CSS 4 |
| バックエンド | Next.js Server Actions + Hono 4.x (一部) |
| API | tRPC 11 + Zod（ローカル開発時）/ Server Actions（本番） |
| ORM / DB | Prisma 6 + PostgreSQL（Railway / ローカルは Docker） |
| 認証 | Auth.js v5 (NextAuth v5 beta, JWT + Google OAuth) |
| ファイル | **Vercel Blob**（ブラウザ→CDN 直接アップロード + Canvas 圧縮） |
| 課金 | RevenueCat Web Billing（PRO サブスクのみ） |
| リアルタイム | Pusher Channels（未設定時は 3 秒ポーリングにフォールバック） |
| メール | Resend + react-email + Inngest |
| モノレポ | Turborepo + pnpm workspaces |
| ホスティング | Vercel（フロント） + Railway（DB） |

## ディレクトリ構成

```
creatorLinks/
├── apps/
│   ├── web/          # Next.js フロントエンド (port 3000)
│   └── api/          # Hono API サーバー    (port 3001) — ローカル開発用
├── packages/
│   └── shared/       # 共通型定義・Zod スキーマ
├── scripts/
│   └── setup.sh      # 初回セットアップスクリプト
└── docker-compose.yml
```

## 主要機能

### サイトトップ
- 自動切替ヒーロースライドショー（5 秒間隔・ドットインジケーター付き）
  - 「手数料7%で始める営業革命」
  - 「サブスク契約で継続案件が可能」
  - 「PRO 認定で優先表示」
- 新着案件・注目アーティスト・手数料比較

### アーティスト機能
- プロフィール編集（**ジャケット画像（カバー）** + トプ画 + 自己紹介 + ジャンル）
- ポートフォリオ登録（画像・音声・動画、最大 256MB）
- アーティスト一覧（カバー画像 + アバター + 自己紹介の縦型カード、ジャンルフィルタ、無限スクロール）

### マッチング
- 案件の作成・一覧・詳細
- 応募・承認・却下フロー
- ポーリング/Pusher リアルタイムチャット
- 納品完了・レビュー投稿・評価集計

### 課金
- PRO プラン（RevenueCat Web Billing 月額サブスク）
- 先着 30 名 PRO 永久無料キャンペーン（サインアップ順で自動付与）
- ファン支援（アーティストへの月額サブスク）は現在停止中

### 管理
- 管理画面（ユーザー・案件のモデレーション）

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
| http://localhost:3001 | Hono API サーバー（ローカル開発用） |
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
```

## 環境変数

`apps/web/.env.local` と `apps/api/.env` に設定。詳細は `.env.example` を参照。

### 最低限必要な変数（ローカル開発）

```env
# DB（docker-compose で自動設定）
DATABASE_URL="postgresql://creator:creator_pass@localhost:5432/creator_links_dev"

# Auth.js v5（任意の文字列でOK）
AUTH_SECRET="local-dev-secret"

# RevenueCat Web Billing（任意・未設定なら PRO 課金ボタンでエラー表示）
NEXT_PUBLIC_REVENUECAT_WEB_BILLING_PUBLIC_API_KEY="rcb_..."
NEXT_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID="pro"
REVENUECAT_WEBHOOK_SIGNING_SECRET="whsec_..."
```

### オプション（機能別）

| 機能 | 環境変数 | 未設定時の動作 |
|---|---|---|
| Google ログイン | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google 認証ボタン非表示・パスワード認証のみ |
| ファイルアップロード（本番） | `BLOB_READ_WRITE_TOKEN`（Vercel Blob トークン） | アップロード不可 |
| RevenueCat PRO プラン | `NEXT_PUBLIC_REVENUECAT_WEB_BILLING_PUBLIC_API_KEY`, `REVENUECAT_WEBHOOK_SIGNING_SECRET` | Checkout ボタンでエラー・Webhook 401 |
| リアルタイムチャット | `PUSHER_APP_ID`, `PUSHER_SECRET`, `NEXT_PUBLIC_PUSHER_KEY` | 3 秒ポーリングで動作 |
| メール通知 | `RESEND_API_KEY` + Inngest Cloud | コンソールログのみ |

## デプロイ（Vercel）

### 設定
- **Root Directory**: `apps/web`
- **Build Command**（`apps/web/vercel.json` に記述）:
  ```
  (cd ../api && npx prisma db push --accept-data-loss) && npx turbo build --filter=@creator-links/web
  ```
- **必須環境変数**: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, `BLOB_READ_WRITE_TOKEN`

### 自動マイグレーション
ビルド時に `prisma db push` が走るので、Prisma スキーマを変更してプッシュするだけで本番 DB のカラムも自動追加されます。

### 画像アップロードの仕組み
- ブラウザ側で **Canvas API による圧縮**（WebP 変換 + リサイズ）を実施
- `@vercel/blob/client` の `upload()` でブラウザ → CDN に直接 PUT（Next.js サーバーを経由しない＝ボディサイズ制限なし）
- `/api/blob` ルートはクライアントトークン発行と完了通知のみ処理（**Edge Runtime** でコールドスタートを最小化、Auth.js JWT で軽量認証）

## 実装済み機能

- [x] 認証（メール/パスワード・Google OAuth）
- [x] アーティストプロフィール（**ジャケット画像 + トプ画 + 自己紹介 + ジャンル**）
- [x] ポートフォリオ登録（画像・音声・動画、Canvas 圧縮、進捗表示付き）
- [x] アーティスト一覧（縦型カード + 無限スクロール）
- [x] 案件 CRUD（作成・一覧・詳細）
- [x] マッチング（応募・承認・却下）
- [x] チャット（Pusher / ポーリングフォールバック）
- [x] 納品完了・レビュー投稿・評価集計
- [x] 管理画面
- [x] **Vercel Blob ファイルアップロード**（ブラウザ → CDN 直接、自動 WebP 圧縮）
- [x] RevenueCat Web Billing 課金（PRO プラン、Webhook で role 同期）
- [x] 先着 30 名 PRO 永久無料キャンペーン（サインアップ順で自動付与、Webhook では剥奪しない）
- [x] Pusher リアルタイムチャット（環境変数設定時のみ有効・未設定はポーリング）
- [x] メール通知（Resend + Inngest バックグラウンドジョブ）
- [x] **トップページヒーロースライドショー**（自動切替・サブスク継続案件訴求）
- [x] Vitest 単体テスト（スキーマ・tRPC ルーター・権限チェック）
- [x] Playwright E2E テスト（認証・案件 CRUD・マッチング・チャット）
