# ベータデプロイ Runbook

**作成日:** 2026-08-11
**対象:** 音楽業界体験ユーザー（5〜10 名想定）にベータとして配布するまでの外部作業一覧

このドキュメントは、コード改修では対処できない **外部サービス側の操作**（Vercel Dashboard・Stripe Dashboard・Sentry ダッシュボード・DB 操作・手動 E2E）を、順を追って実行可能な形で列挙する。

コードで既に対応済みの項目（法務ページ・公式アカウント seed・Sentry セットアップ・Vitest 53 件）は別 md／README を参照。

---

## 目次

1. [Vercel 環境変数を投入](#1-vercel-環境変数を投入)
2. [Stripe Dashboard で本番 Webhook を登録](#2-stripe-dashboard-で本番-webhook-を登録)
3. [Sentry プロジェクト作成 + DSN 取得](#3-sentry-プロジェクト作成--dsn-取得)
4. [法務ページのプレースホルダを埋める](#4-法務ページのプレースホルダを埋める)
5. [公式アカウント seed を本番 DB に流す](#5-公式アカウント-seed-を本番-db-に流す)
6. [Prisma migration baseline 化](#6-prisma-migration-baseline-化)
7. [決済フロー E2E を Stripe テストキーで手動 1 周](#7-決済フロー-e2e-を-stripe-テストキーで手動-1-周)
8. [ベータ配布前の最終チェックリスト](#8-ベータ配布前の最終チェックリスト)

---

## 1. Vercel 環境変数を投入

**目的:** 本番で決済・メール・レートリミット・エラー監視・cron を機能させる。

### 1.1 Vercel Dashboard で設定するもの

`Vercel → プロジェクト → Settings → Environment Variables` から、Environment = `Production`（必要に応じて `Preview` にも）で登録する。

| 変数 | 値 | 取得元 |
|---|---|---|
| `DATABASE_URL` | `postgresql://...` | Railway ダッシュボード → Postgres サービス → Variables |
| `AUTH_SECRET` | 32 文字以上のランダム文字列 | `openssl rand -base64 32` で生成 |
| `NEXTAUTH_URL` | `https://<本番ドメイン>` | 本番ドメイン確定後 |
| `NEXT_PUBLIC_APP_URL` | 同上 | 同上 |
| `GOOGLE_CLIENT_ID` | Google Cloud Console から | OAuth 2.0 クライアント ID |
| `GOOGLE_CLIENT_SECRET` | 同上 | 同上 |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob | Vercel Storage → Blob → `.env.local` からコピー |
| `STRIPE_SECRET_KEY` | `sk_live_...` | Stripe Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | §2 で登録した Webhook の Signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Stripe Dashboard → Developers → API keys |
| `NEXT_PUBLIC_REVENUECAT_WEB_BILLING_PUBLIC_API_KEY` | `rcb_...` | RevenueCat → プロジェクト → API Keys |
| `NEXT_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID` | `pro` | RevenueCat → Entitlements |
| `REVENUECAT_WEBHOOK_SIGNING_SECRET` | `whsec_...` | RevenueCat → Integrations → Webhooks → HMAC secret |
| `PUSHER_APP_ID` / `PUSHER_KEY` / `PUSHER_SECRET` | Pusher Channels | Pusher ダッシュボード → App Keys |
| `PUSHER_CLUSTER` | `ap3`（東京） | 同上 |
| `NEXT_PUBLIC_PUSHER_KEY` / `NEXT_PUBLIC_PUSHER_CLUSTER` | 同上 | 同上 |
| `RESEND_API_KEY` | `re_...` | Resend → API Keys |
| `RESEND_FROM_EMAIL` | `noreply@<認証ドメイン>` | 送信元は SPF/DKIM/DMARC 通過が必要（下記 §1.3） |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | Inngest Cloud | Inngest → App → Keys |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Vercel Marketplace | Storage → Upstash for Redis → 1 クリック作成後、自動で ENV に注入される |
| **`CRON_SECRET`** | 32 文字以上のランダム文字列 | `openssl rand -hex 32`。**未設定なら `/api/cron/*` を第三者が叩ける** |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Sentry | §3 で取得 |
| `SENTRY_ORG` / `SENTRY_PROJECT` | Sentry | source map upload に使用 |
| `SENTRY_AUTH_TOKEN` | Sentry | Settings → Auth Tokens で `project:releases` 権限のトークン発行 |

### 1.2 Vercel CLI での一括投入（任意）

`vercel env add` で 1 個ずつ。まとめて投入したいなら `pull → 編集 → push` パターン：

```bash
cd apps/web
vercel env pull .env.production.local
# ↑ Vercel の Production 環境変数がローカルの .env.production.local に降りてくる
# ローカルで編集して...
vercel env push production .env.production.local
```

### 1.3 メール送信元ドメインの認証（Resend）

`noreply@creatorlinks.jp` 等の独自ドメインを送信元に使う場合、DNS に以下を追加：

1. Resend Dashboard → Domains → Add Domain
2. 表示された **SPF**（TXT レコード）を DNS に追加
3. **DKIM**（TXT レコード×2）を DNS に追加
4. **DMARC**（`v=DMARC1; p=quarantine` 等）を DNS に追加
5. Resend Dashboard で "Verified" になるまで待つ（通常 数分〜数時間）

未認証のまま送るとほぼ確実に迷惑箱行き。ベータユーザー 5〜10 名なら Gmail 系は特に厳しい。

---

## 2. Stripe Dashboard で本番 Webhook を登録

**目的:** 決済ライフサイクル（`payment_intent.succeeded` 等）をアプリ側 DB に反映する。

### 2.1 Webhook Endpoint を作成

1. Stripe Dashboard → Developers → **Webhooks** → **Add endpoint**
2. **Endpoint URL:** `https://<本番ドメイン>/api/stripe/webhook`
3. **Events to send:** 以下 5 種を選択

   | イベント | 用途 |
   |---|---|
   | `payment_intent.succeeded` | Payment: AWAITING → HELD |
   | `payment_intent.payment_failed` | Payment: AWAITING → FAILED |
   | `charge.refunded` | Payment: HELD → REFUNDED |
   | `account.updated` | User: Stripe Connect Onboarding フラグ同期 |
   | `transfer.created` | ログ用（DB 更新は releasePayment 側で完了済） |

4. **Save** → Signing secret（`whsec_...`）が表示される
5. その `whsec_...` を Vercel 環境変数 `STRIPE_WEBHOOK_SECRET` にコピー

### 2.2 Stripe Connect の有効化

1. Stripe Dashboard → Settings → **Connect** → **Get Started**
2. **アカウントタイプ**: Express を選択（Stripe が KYC を代行）
3. Business Profile を埋める（会社概要・URL・カスタマーサポート email）
4. Test → Live 切替: プラットフォーム自身の本人確認が必要（法人 or 個人事業主）
5. Live キーが有効化されたら §1 の `STRIPE_SECRET_KEY` を `sk_test_` から `sk_live_` に切り替え

### 2.3 動作確認

Vercel に環境変数投入 + デプロイ後、Stripe Dashboard の Webhooks 画面で `Send test webhook` を叩き、Vercel Function Logs で `POST /api/stripe/webhook 200` を確認。

---

## 3. Sentry プロジェクト作成 + DSN 取得

**目的:** 本番例外の可視化。既にコード側は `@sentry/nextjs` を導入済み（`sentry.*.config.ts` + `instrumentation.ts` + `next.config.ts` の withSentryConfig）。DSN 未設定時は完全 no-op で無害。

1. https://sentry.io/ でアカウント作成 → Organization 作成
2. **Create Project** → Platform: **Next.js** → Alert Rule: **When any event occurs**（推奨）
3. `SENTRY_DSN`（例: `https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@oXXXXXX.ingest.sentry.io/XXXXXXX`）を取得
4. Vercel 環境変数 `SENTRY_DSN` と `NEXT_PUBLIC_SENTRY_DSN` に同じ値を設定
5. Sentry → Settings → **Auth Tokens** → **Create New Token** → Scope: `project:releases` + `project:write` → 生成された値を `SENTRY_AUTH_TOKEN` に
6. `SENTRY_ORG`（Organization slug）と `SENTRY_PROJECT`（Project slug）も投入

### 3.1 動作確認

デプロイ後、任意のページで手動で例外を投げる（例: 一時的に `throw new Error('sentry test')` を Server Action に仕込む）。Sentry の Issues 画面に到着すれば OK。確認後、テスト用 throw は必ず削除。

---

## 4. 法務ページのプレースホルダを埋める

**目的:** `/terms` `/privacy` `/tokutei` に散らばる `【要記入：...】` を実データに置換する。

### 4.1 埋めるべき項目

- `apps/web/src/app/tokutei/page.tsx`
  - 販売事業者名（法人名 or 個人事業主氏名）
  - 運営統括責任者
  - 所在地（省略の場合は「請求により遅滞なく開示」の運用に）
  - 電話番号（同上）
  - メールアドレス
- `apps/web/src/app/terms/page.tsx`
  - 第 13 条の管轄裁判所（第一審専属的合意管轄。事業所所在地の地裁を推奨）
  - 冒頭の事業者名
- `apps/web/src/app/privacy/page.tsx`
  - 冒頭の事業者名
  - 第 10 章「お問い合わせ窓口」— 事業者名・担当者氏名・メール

### 4.2 使い方

各ファイルで `【要記入：` を全文検索して置換。プレースホルダは日本語なので誤検知しにくい。

### 4.3 補足（法律面の最終レビュー）

上記テンプレートは Stripe Connect + サブスク + マーケットプレイス構成の一般的雛形。本番配信前に必ず**弁護士 or リーガルテンプレート（Cloudsign / GVA / freee サイン等）の法務レビュー**を通すこと。特に：

- 反社会的勢力排除条項の具体化
- 消費者契約法・電子契約法との整合
- 越境データ移転（第 3 者提供先が米国 SaaS に集中）に対する同意設計
- サブスクの解約導線と自動更新の告知タイミング（消費者庁の詐欺的サブスク対応強化に注意）

---

## 5. 公式アカウント seed を本番 DB に流す

**目的:** `isOfficial=true` のアカウントを本番 DB に 1 つ用意する。ウェルカム DM・全体お知らせ・サポート窓口・キュレーションの全てがこのアカウントを起点にする。

### 5.1 コード側

`apps/api/prisma/seed.ts` の `admin@creatorlinks.jp` upsert が **isOfficial=true + role=ADMIN + displayName='運営公式' + bio** を持つように更新済み（当セッションで反映）。既存 DB でも `update: { isOfficial: true, role: 'ADMIN' }` により追いつく。

### 5.2 本番実行

**注意:** 本番の `admin@creatorlinks.jp` 用パスワードは seed の平文（`admin1234`）とは別物に事前ローテーションしておくこと（既存の secret rotation スクリプト参照）。

```bash
cd apps/api

# 本番 DB URL を一時的にセット
export DATABASE_URL="<Railway 本番 DATABASE_URL>"

# seed を本番に流す（既存レコードは update: 部分だけ適用される upsert なので冪等）
npx prisma db seed
```

seed 完了後、Prisma Studio か SQL で `SELECT id, email, "isOfficial", role FROM users WHERE "isOfficial" = true;` を実行し、1 行だけ返ることを確認。

---

## 6. Prisma migration baseline 化

**目的:** 本番の schema 反映を `db push --accept-data-loss` から `migrate deploy` に切り替える。

### 6.1 既存の詳細プラン

`docs/migration_baseline_plan.md` に Prisma 公式手順に沿った 5 ステップ（現行 introspect → baseline SQL 生成 → migrations 差替え → `migrate resolve --applied` → vercel-build.sh 修正）が既にある。**そちらを主参照とする**。

### 6.2 当セッションで追加した artifact

- `docs/migration_baseline_candidate.sql` — `prisma migrate diff --from-empty --to-schema-datamodel` の出力（623 行）。これが Step 2 の生成結果に相当するので、時間短縮のためこの SQL を新規 `apps/api/prisma/migrations/<timestamp>_baseline/migration.sql` にコピーして使える。

**フロー要約（詳細は既存プラン参照）:**
1. 本番 DB のフルバックアップ
2. `git checkout` で backup branch を作る
3. `apps/api/prisma/migrations/20260510044358_init/` を削除
4. `apps/api/prisma/migrations/20260811000000_baseline_before_phase_a/migration.sql` に `docs/migration_baseline_candidate.sql` の中身をコピー
5. 本番 DB で `DELETE FROM _prisma_migrations;` 実行後、`npx prisma migrate resolve --applied 20260811000000_baseline_before_phase_a`
6. ローカル DB でも同様に resolve
7. `apps/web/scripts/vercel-build.sh` の `db push --accept-data-loss` を `migrate deploy` に置換
8. Phase A のスキーマ変更は今後 `prisma migrate dev` で通常フロー

**注意:** これは本番 DB を直接触る作業。深夜帯 + 事前告知 + バックアップ必須。

---

## 7. 決済フロー E2E を Stripe テストキーで手動 1 周

**目的:** Checkout → 支払い → HELD → 検収 → RELEASED まで実キーで通す。当セッションで書いた Vitest 53 件はモック前提なので、本物の Stripe とつなぐ確認は別途必要。

### 7.1 事前準備

- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` が **テストキー** で設定済みの `.env.local`
- ローカル DB (docker) が起動、seed 済み
- Stripe CLI をインストール（`brew install stripe/stripe-cli/stripe`）
- Stripe CLI でログイン（`stripe login`）

### 7.2 実行手順

**Terminal 1:** dev サーバー
```bash
pnpm dev
```

**Terminal 2:** Stripe → localhost に webhook を forwarding
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
表示される `whsec_...` を `.env.local` の `STRIPE_WEBHOOK_SECRET` に入れて `pnpm dev` を再起動。

**Terminal 3:** アーティスト側で Stripe Connect Onboarding
1. `yamada@example.com / pro12345` でログイン
2. `/dashboard/payouts` → 「Stripe で入金設定を開始」
3. Stripe テスト用ダミー情報で Onboarding を完走
4. `refresh_url` で戻り → `stripeChargesEnabled` `stripePayoutsEnabled` が両方 true になるのを Prisma Studio で確認

**Terminal 3 続き:** 発注者側で Checkout → 支払い
1. `client@example.com / user1234` でログイン
2. `seed-match-1`（ACCEPTED マッチ）の chat 画面へ
3. 「支払う ¥XX,XXX」ボタン押下 → Stripe Checkout にリダイレクト
4. カード番号: `4242 4242 4242 4242` / 有効期限: `12/34` / CVC: `123` / 名義: 任意
5. 支払い完了 → `/dashboard/chat/seed-match-1?paid=1` にリダイレクト
6. Terminal 2 の Stripe CLI ログで `payment_intent.succeeded [200]` を確認
7. チャット画面のバッジが「支払い済み（保管中）」になっていること

**Terminal 3 続き:** 納品完了 → 送金確認
1. アーティスト（yamada）で再ログイン → 同 chat 画面
2. 「納品完了」ボタン押下 → Match が COMPLETED
3. 発注者（client）で再ログイン → 「送金確認」ボタン押下
4. Terminal 2 で `transfer.created [200]` を確認
5. チャット画面のバッジが「送金完了」になっていること
6. Prisma Studio で Payment の `status = RELEASED`, `stripeTransferId` が set されていること

### 7.3 自動リリース経路の確認

7 日待ちたくないので `apps/web/src/lib/stripe.ts` の `AUTO_RELEASE_DAYS = 7` を一時的に `0` にして cron を叩く：

```bash
curl -X GET http://localhost:3000/api/cron/release-payments \
  -H "Authorization: Bearer <CRON_SECRET を設定していれば>"
```

レスポンスの `released` が想定件数になっていれば OK。確認後は `AUTO_RELEASE_DAYS = 7` に戻す。

### 7.4 既存 E2E スペック

`apps/web/e2e/payments.spec.ts` に Playwright スペックがある。`STRIPE_SECRET_KEY` を set 済みなら `pnpm --filter @creator-links/web test:e2e -- payments.spec.ts` で自動化した検証も可能（Stripe UI 変更で selector が変わっていれば要修正）。

---

## 8. ベータ配布前の最終チェックリスト

配布 URL をユーザーに送る前に、以下を全て通す。

### 8.1 デプロイ健全性

- [ ] `pnpm type-check` — 全 package 緑
- [ ] `pnpm test` — API 51/51 + web 53/53 = 104/104 緑
- [ ] `pnpm build` — 全ルート compile 成功
- [ ] Vercel Production デプロイ成功、`/api/health` で 200 応答
- [ ] Vercel Function Logs にエラーなし（直近 30 分）

### 8.2 環境変数

- [ ] §1 の必須 ENV が全て `Production` scope に入っている（`vercel env ls` で確認）
- [ ] Stripe / RevenueCat / Sentry / Upstash Redis の DSN・キーが本物
- [ ] `CRON_SECRET` が設定されている
- [ ] `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL` が本番ドメインを指している

### 8.3 決済

- [ ] Stripe Dashboard で本番 Webhook が「有効」ステータス
- [ ] `stripe events resend evt_xxxx` でテスト送信 → Vercel Log で 200
- [ ] アーティスト側 Stripe Connect Onboarding が本番モードで完走できる（要日本の本人確認書類）

### 8.4 コンテンツ

- [ ] `/terms` `/privacy` `/tokutei` の `【要記入：...】` が全て埋まっている
- [ ] Footer から 3 ページ全てに遷移できる
- [ ] トップページに Encore ネーミング（現時点は暫定）が反映されている
- [ ] 公式アカウント（isOfficial=true）が本番 DB に 1 人だけ存在

### 8.5 監視

- [ ] Sentry に接続され、テスト例外が届く
- [ ] Vercel Analytics（任意）or GA4 が計測している

### 8.6 法務

- [ ] 弁護士 or リーガルテンプレートで規約類のレビュー完了
- [ ] Resend 送信元ドメインの SPF/DKIM/DMARC 検証済み
- [ ] プライバシーポリシー掲載の外部サービスに変更がない（追加してたら更新）

### 8.7 UX（ベータユーザー体験）

- [ ] 招待メールの文面用意（Encore の位置づけ、フィードバック依頼、締切）
- [ ] フィードバック受付経路（サポート窓口 or Google Form）
- [ ] 想定操作フロー（登録 → プロフィール → 案件 or アーティスト検索 → チャット）を実機で 1 周
- [ ] エラー時のリカバリ経路が UI 上で分かる

---

## 補足: このセッションでコード側に反映済みの項目

| 項目 | 反映先 |
|---|---|
| 決済アクションの復活実装 | `apps/web/src/server/actions/payments.ts` |
| Vitest テスト 53 件 | `apps/web/src/**/__tests__/` |
| Playwright E2E スペック | `apps/web/e2e/payments.spec.ts` |
| 法務ページ 3 本 | `apps/web/src/app/{terms,privacy,tokutei}/page.tsx` |
| Footer に 3 リンク追加 | `apps/web/src/components/layout/footer.tsx` |
| 公式アカウント seed | `apps/api/prisma/seed.ts` |
| Sentry 導入 | `apps/web/sentry.*.config.ts` / `instrumentation.ts` / `next.config.ts` |
| migration baseline SQL 候補 | `docs/migration_baseline_candidate.sql` |
| 本ドキュメント | `docs/beta_deploy_runbook.md` |

**外部作業（Runbook §1〜§7）は Claude 側では実行不可**。ユーザーがダッシュボード or シェルから手作業で行う必要がある。
