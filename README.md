# CreatorLinks（→ Encore 改称予定）

音楽業界特化のマッチング＋ミニ DX プラットフォーム。手数料 7%（業界最安）でアーティスト・イベンター・依頼者をつなぐ。

**現在地（2026-08-09）：** 音楽業界特化への**ピボット実施中**。既存のマッチング基盤 (Phase 0) は動作、次は Phase A（イベント告知＋カレンダー）。決済は Stripe Connect エスクローから RevenueCat 全面移行の途中。

---

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

---

## 設計方針 / Encore ピボット (2026-08-09 決定)

### ブランド
- **旧：** CreatorLinks（一般クリエイター向け）
- **新（暫定）：** Encore（音楽業界特化）
- 選定理由：ライブ後の「もう一度」＝また一緒にやりたい、というプラットフォームのコア価値（相性メモ・実績記録・イベント継続）と噛み合う
- **造語化の予定：** 「Encore」は一般語のため、最終的には**造語（コインドワード）へ差し替える方針**。理由は (1) 商標登録の通りやすさ (2) ドメイン取得性 (3) 検索性・想起性の独占。方向性は「Encore の音・意味を継承した派生造語」（例：語尾を変える／2 音節を組み替える／音楽用語と合成する）を検討予定
- **実装との関係：** ネーミング確定を待たず機能実装を先行。UI 上のブランド名は文字列定数化して 1 箇所で差し替えられるよう整理予定

### ポジション
- 「一般クリエイター向け営業プラットフォーム」→「音楽業界特化のマッチング＋ミニ DX 機能」
- 主軸はマッチング（既存路線維持）、ミニ DX 機能を追加

### Phase A（MVP 目安 3ヶ月）— コア指標：**再依頼率**

**Encore = "もう一度一緒に" を仕組みで支える。** ブランド名と実装の focus を一致させる。イベント告知／カレンダーは掲示板そのものではなく、"再依頼のきっかけ" として位置づける。

#### 中心機能（"また一緒に" を促す）
- **相性メモ**: Match 完了後に相手に対する非公開メモを残せる（次回選定の参考）
- **ワンタップ再依頼**: 過去に完了した Match から直接新規案件を作成 → 相手にプレフィル済み依頼が届く
- **"また呼びたい" フラグ**: 完了時にレビューと並列で "また一緒にやりたい" を明示 → 相互一致で **"Encore 相性"** バッジ
- **再依頼サジェスト**: 案件作成時に "過去に依頼して『また呼びたい』済のアーティスト" をトップ表示

#### 補助機能
- **イベント告知**（LIVE / SESSION / RECORDING / WORKSHOP / MEETUP） — 掲示板ではなく "誰と組んだか / 誰を呼びたいか" の起点として実装
- **カレンダー**（個人・公開・iCal export） — 相手の空き状況を見て "また呼びやすく" するため

#### 対象ペルソナ
- 東京の小規模ライブ／セッション主催者
- 出演機会を探すインディーズ演奏者
- （まずは開発者本人のネットワーク内で 5〜10 件のリアル取引を通す）

### Phase B（後回し）
- 依頼者（バンドリーダー・レーベル）向け機能
- ファン向け機能

### KPI（登録者数ではなく、**成立と継続**を測る）

**一次指標:** 30 日以内の再依頼率（同一発注者 → 同一アーティスト）

**二次指標:**
- 案件公開から初回応募までの中央値時間
- 応募 1 件以上が付いた案件の割合
- 応募 → 承認率
- 完了率（承認 → 検収完了）
- 「また呼びたい」相互一致率

**登録者数は監視するが目標にしない。**

### 検証の順序
1. 既存ユーザーへの手動マッチング／ヒアリング（Phase A 実装前）
2. 需要が確認できた案件タイプだけを Phase A で実装
3. 実装後 30 日で上記 KPI を測り、Encore ブランドと数字の整合を確認

### 決済構成（2026-08-09 再修正：役割分離に戻す）
- **RevenueCat**: PRO サブスク・エンタイトルメント管理のみ
- **Stripe Connect**: 案件代金（依頼主 → アーティスト）・プラットフォーム手数料・分割送金・KYC
- **アプリ DB**: 案件・検収・キャンセル・紛争状態の管理
- 用語も「エスクロー」ではなく **「検収後支払い（支払い保留）」** に統一（許認可上の意味を持つ語を避ける）

> **経緯：** 2026-08-08 に「RevenueCat 全面統一」で合意していたが、RevenueCat はサブスク管理プロダクトでマーケットプレイス決済（分割送金・KYC・エスクロー相当）は範囲外のため、その方針を**撤回**。既実装の Stripe Connect コード（P1-P7）は**除去せず継続活用**する。

### モバイル方針（未着手）
- 短期：Web のみ
- 中期候補：**PWA 化**（`manifest.json` + Service Worker、ホーム画面追加対応）
- 長期候補：**Capacitor** で WebView ラップ → iOS/Android バイナリ配布（コード 95%+ 流用）／必要なら React Native + Expo で shared package 再利用
- pnpm workspace に `apps/mobile` を後から足せる構造は既に確保済み

---

## 直近の変更 (2026-10-31)

### Preview 環境・検証インフラの一斉復旧 (2026-10-31)
Fee-only pivot (2026-10-17) 以降、Preview 側で複数の障害が重なってログイン不能になっていた。切り分けと復旧を 1 セッションで実施：

- **Upstash KV（レート制限用 Redis）の消滅を発見・新規 provision**
  - 旧 `upstash-kv-aureolin-fence` が uninstalled → NXDOMAIN
  - middleware の `checkRateLimit` が fail-closed で全ログインを 500 させていた
  - Vercel Marketplace で `upstash-kv-citrine-yacht` (hnd1, Free) を再作成、env prefix `KV` で接続
- **Preview Neon branch の空スキーマを reset + migrate で復旧**
  - 原因: `vercel-build.sh` が Preview では `migrate deploy` を走らせていなかった
  - 対策: `apps/web/scripts/vercel-build.sh` を Production と同じ `resolve + deploy` フローに統一（commit `dfaad18`）
- **ローカル `.env.production` が `[SENSITIVE]` プレースホルダで汚染 → ビルド壊滅**
  - `vercel env pull --environment=production` 由来。削除で復旧。gitignore 済なのでそのまま
- **E2E ログインヘルパの selector drift を修正** (commit `3c8f510`)
  - `getByRole('tab')` → plain button に、`getByLabel('パスワード')` → `exact: true` に
  - `PasswordInput` の visibility toggle が strict mode violation の原因
- **`prisma/seed.ts` の `role: 'PRO'` を GENERAL に差替** (commit `f58c816`)
  - fee-only pivot で廃止された enum で seed が中断していた
- Vercel CLI を 53.3.1 → 65.9.0 にアップデート（旧版は Sensitive env pull で空文字返す bug）

**検証用 preview URL**: https://creator-links-2rcco2dgf-tonokyama-s-projects.vercel.app（Vercel SSO ゲート付）

**自動テスト結果**: type-check / vitest api 51/51 / vitest web 78/78 / build すべて緑

**既知の積み残し**:
- dev server の Sentry vendor-chunks 読み込みエラー（`.next` キャッシュ破損）で、localhost 向け Playwright の login 系が 10s timeout する。`rm -rf apps/web/.next` + dev 再起動で解消見込み
- Playwright E2E は helper 修正後 5/23 pass。残りは上記 Sentry 問題解消後に再測

### 夕方セッション追加成果 (2026-10-31 19:00-)
- **dev server 復旧**: `.next` キャッシュ消去 + 再起動で Sentry vendor-chunks エラー解消
- **Playwright E2E 再測**: **12 pass / 10 fail / 1 skip** (前回 4/19)
  - 残 10 fail はすべて `toBeVisible` 系 = spec selector drift（本番コードは健全、dogfood blocker ではない）
- **認証・権限ガード棚卸し (#15)**: HIGH 0件 / MEDIUM 1件 / 24 ファイル健全 → **本番公開レベル**
- **Neon 分離確認**: cyclamen-cave (Prod, ep-flat-wave) / claret-ball (Preview, ep-mute-heart) → **完全分離済**
- **Production DB 現状**: admin ユーザ 1 名のみ（dogfood はクリーンな状態で開始可能）

### 本番リリース前 手動操作検証
→ **[本番リリース前_操作検証チェックリスト.md](./本番リリース前_操作検証チェックリスト.md)** に 20 カテゴリ・100+ 項目のチェックリスト。
staging.encorecue.jp 上で admin + テストアカウント 2〜3 を使って一通り触って潰す運用。

---

### 一般公開 (M1 beta → M2 一般) に向けた残タスク — 2026-10-31 時点

**本番移行スコープ**: 一般公開（SNS 告知、誰でもサインアップ可、実金決済）

🔴 必須 (この順で実施):
- [ ] **1. ⚠️ Vercel Pro upgrade** (5 分)
      - 現 Hobby 非商用のまま商用運用は ToS §2.3 違反
      - https://vercel.com/tonokyama-s-projects/~/settings/billing → Upgrade to Pro ($20/月)
- [ ] **2. 本番 apex `encorecue.jp` 切替** (10 分)
      - 現状 staging.encorecue.jp のみ稼働、apex を Production デプロイにマップ
      - Vercel dashboard → Settings → Domains → Add `encorecue.jp`
      - DNS: Xserver 側で A/AAAA レコードを Vercel 指定の値に
- [ ] **3. NEXT_PUBLIC_APP_URL 更新** (2 分)
      - `https://encorecue.jp` に差替（Prod + Preview）
      - 招待リンク・OGP・canonical が本番 URL を指すように
- [ ] **4. Stripe Live mode 鍵 3 本切替** (15 分〜数日)
      - Stripe dashboard で "Activate account" (本人確認: 住所・口座・身分証) → 未済なら数日
      - 完了後 Live mode の `pk_live_*` / `sk_live_*` / Webhook secret を取得
      - Vercel env で Test mode 値を Live mode 値に上書き
- [ ] **5. RESEND 送信ドメイン認証** (20 分 + 伝播待ち)
      - 送信元を `noreply@encorecue.jp` にする場合、SPF/DKIM/DMARC の DNS 設定が必要
      - RESEND dashboard → Domains → Add `encorecue.jp` → 表示される TXT レコードを Xserver DNS に追加
      - 無いと招待メール等が迷惑メール行き
- [ ] **6. Stripe dogfood Phase 1-3** (90 分)
      - 個人情報 (15 分) + マッチング (30 分) + Stripe 決済 (45 分)
      - 2 アカウント要（発注者 + アーティスト）
- [ ] **7. ⚠️⚠️ 本番 DB の reset + admin 再投入** (5 分, リリース直前の最後)
      - **理由**: staging.encorecue.jp = Production DB を直接触っているため、dogfood/検証で作ったテストデータ (ユーザー・案件・マッチ・通知) が全て本番 DB に残っている。これを一般ユーザーに見せたくないため、ローンチ当日に 1 回だけクリーンアップする。
      - **手順** (Vercel dashboard から Preview DATABASE_URL_UNPOOLED と同じ要領で Production DATABASE_URL_UNPOOLED を取得 → `/tmp/prod_dburl` に貼る):
        ```bash
        PROD_DB=$(cat /tmp/prod_dburl)
        cd apps/api
        DATABASE_URL="$PROD_DB" PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1 PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION=yes \
          npx prisma migrate reset --force --skip-seed
        # admin のみ再投入
        DATABASE_URL="$PROD_DB" node --input-type=module -e "$(cat <<'EOF'
        import { PrismaClient } from '@prisma/client'
        import bcrypt from 'bcryptjs'
        const p = new PrismaClient()
        const hash = await bcrypt.hash('admin1234', 12)
        await p.user.upsert({
          where: { email: 'admin@creatorlinks.jp' },
          update: { isOfficial: true, role: 'ADMIN', passwordHash: hash },
          create: {
            email: 'admin@creatorlinks.jp', name: '運営', displayName: '運営公式',
            passwordHash: hash, role: 'ADMIN', isOfficial: true, genres: [],
            bio: 'プラットフォーム運営公式アカウントです。',
          },
        })
        await p.\$disconnect()
        EOF
        )"
        rm /tmp/prod_dburl
        ```
      - **一般公開告知の 30 分前が目安**。この後に自分で動作確認してから告知。
      - admin パスワードを変えるなら最後に `admin1234` を強いパスワードに差し替えること。

🟡 推奨 (ベータ中に追加で OK):
- [ ] Pusher env 投入 (chat realtime 復旧、無しだと polling fallback)
- [ ] 招待先 5-10 名リスト + Google Form Q1-5
- [ ] Sentry ORG / PROJECT / AUTH_TOKEN (source map upload 用)
- [ ] Google OAuth 投入 (Credentials 以外の選択肢)

### 既に完了済（本セッション）
- [x] Vercel Pro upgrade: ⚠️ **未着手**（上記 #1）
- [x] ~~Neon PITR 確認~~ → **Free tier 24h 有効 (公式デフォルト) で前提**
- [x] ~~Sentry env 投入 (DSN 2本)~~ → **SENTRY_DSN + NEXT_PUBLIC_SENTRY_DSN 投入済**
- [x] ~~CRON_SECRET 投入~~ → **投入済**（Prod + Preview）
- [x] ~~商標調査~~ → **J-PlatPat で "EncoreCue" 衝突なし確認済**
- [x] #12 Upstash KV 不通 → **解決済**（upstash-kv-citrine-yacht）
- [x] #13 Neon staging/prod 分離 → **cyclamen (Prod) / claret-ball (Preview) で物理分離済**
- [x] #15 認証棚卸し → **HIGH 0件、本番公開レベル**

---

## 直近の変更 (2026-08-08 〜 2026-08-09)

### 品質ゲート復旧 (2026-08-08)
- type-check / vitest 51/51 / next build すべて緑
- `ProfileEditForm.tsx` の schema drift 修正（`name` → `displayName`、`PasswordChangeSection` import 削除）
- `/dashboard/profile` = プロフィール専用、`/dashboard/account` = アカウント情報専用の責務分離を明文化
- 詳細は `動作テスト進捗_2026-08-08.md`

### 公式アカウント基盤 Phase 4: サポート窓口 (2026-08-09)
- `apps/web/src/lib/support.ts` — 公式との既存 Match を検索、無ければ `ACCEPTED` / `projectId=null` で作成し ID を返す
- `apps/web/src/app/dashboard/support/page.tsx` — server component が `/dashboard/chat/[matchId]` へ redirect
- サイドバー: 「サポートに問い合わせ」（LifeBuoy アイコン）
- Chat ヘッダー: 「公式に相談」テキストリンク（相手が公式のときは非表示）
- Phase 1〜3（公式アカウント土台・全体お知らせ・キュレーション）は先行して完了済

### UI 調整 (2026-08-09)
- **ヘッダー**: ログイン後は「機能紹介・ご利用の流れ・料金プラン・よくある質問」を非表示（クリエイター/案件検索の 2 リンクは維持）
- **サイドバー**: 幅 56px の rail に変更、ホバー / フォーカスで 240px に展開（`fixed` overlay でコンテンツは移動しない、`group-hover` で label と "Signed in as" / PRO 昇格ボタンを制御）
- **入金設定 nav 削除**: Stripe 除去先行に伴い一旦非表示

---

## 技術スタック (2026-11-03 現在)

### 基盤
| カテゴリ | 技術 | 用途 |
|---|---|---|
| Monorepo | **Turborepo** 2 + **pnpm** 10 | ワークスペース管理 |
| 言語 | **TypeScript** 5.7 | 全ソース |
| ランタイム | **Node.js** 20+ | サーバー / ビルド |
| ホスティング | **Vercel** (Hobby → Pro 予定) | Next.js + サーバーレス関数 |
| ドメイン | **Xserver Domain** | `encorecue.jp` (staging/本番) |

### フロントエンド (`apps/web`)
| カテゴリ | 技術 |
|---|---|
| フレームワーク | **Next.js 15** (App Router, Turbopack) |
| UI | **React 19** |
| スタイル | **Tailwind CSS 4** + PostCSS |
| フォーム | **React Hook Form** + Zod resolver |
| アイコン | **Lucide React** (大半は自前 inline SVG) |
| ユーティリティ | `clsx` / `class-variance-authority` / `tailwind-merge` |
| 状態管理 | **Zustand** 5 (限定使用、大半は Server Actions) |
| QR | `qrcode` |

### API / バックエンド
| カテゴリ | 技術 |
|---|---|
| サーバー | **Hono** 4 + `@hono/node-server` (`apps/api`) |
| RPC | **tRPC** 11 (`@trpc/server` / `@trpc/client` / `@trpc/react-query`) |
| Server Actions | **Next.js Server Actions** (本番の大半はこっち) |
| JWT | `jose` |

### データ・キャッシュ
| カテゴリ | 技術 |
|---|---|
| DB | **PostgreSQL** (**Neon** Serverless, Vercel Marketplace 統合) |
| ORM | **Prisma** 6 |
| バリデーション | **Zod** 3 |
| シリアライズ | `superjson` |
| Redis / レート制限 | **Upstash Redis** + `@upstash/ratelimit` |
| ストレージ | **Vercel Blob** (`@vercel/blob`) — 画像/動画 |
| ローカル DB | Docker PostgreSQL 16 (port **5433** → コンテナ内 5432) |

### 認証
| カテゴリ | 技術 |
|---|---|
| 認証 | **NextAuth v5 (Auth.js)** + `@auth/prisma-adapter` |
| パスワードハッシュ | **bcryptjs** |
| セッション | JWT ストラテジー (stateless) + Credentials provider |

### 決済
| カテゴリ | 技術 |
|---|---|
| 決済 | **Stripe** (Checkout + Connect Express) |
| エスクロー | 自前 `actions/payments.ts` (手数料 7%、創設メンバー/恩人枠は 0%) |
| 領収書 | Stripe 公式自動発行 |

### 通知・リアルタイム・メール
| カテゴリ | 技術 |
|---|---|
| リアルタイム | **Pusher Channels** (`pusher` / `pusher-js`) |
| バックグラウンドジョブ | **Inngest** |
| メール送信 | **Resend** |
| 永続通知 | 自前 Notification モデル + Pusher broadcast + 30 秒 polling fallback |

### 監視・セキュリティ
| カテゴリ | 技術 |
|---|---|
| エラー監視 | **Sentry** (`@sentry/nextjs`) |
| 認証ガード | 自前 (`lib/blocks.ts`, Admin role check, `isBlockedBetween`) |
| レート制限 | Upstash Redis + sliding window、`middleware.ts` で signin も保護 |

### テスト
| カテゴリ | 技術 |
|---|---|
| ユニット | **Vitest** 2 (api + web) |
| コンポーネント | `@testing-library/react` |
| E2E | **Playwright** 1.59 |

### 開発ツール
| カテゴリ | 技術 |
|---|---|
| TS 実行 | `tsx` |
| フォーマッタ | **Prettier** |
| Lint | **ESLint** 9 + `eslint-config-next` (本格設定は Next 16 対応で整備予定) |

### Vercel Marketplace 統合
- **Neon** (Postgres) — Production / Preview 別 branch
- **Upstash Redis** (`upstash-kv-citrine-yacht`) — レート制限
- **Vercel Blob** — 画像/動画
- **Resend** — トランザクションメール

### 概要 (1 行版、投稿用)

> Next.js 15 (App Router, React 19) + TypeScript / Prisma + Neon (Postgres) / NextAuth v5 / Stripe Connect / Vercel + Vercel Blob / Pusher + Upstash Redis / Resend / Sentry / Vitest + Playwright。モノレポは Turborepo + pnpm。

### fee-only pivot v2 (2026-11-02) で削除された依存
- `@revenuecat/purchases-js` (旧 PRO サブスク、fee-only pivot で廃止)
- 認証バッジ買切 Stripe Checkout (admin 手動付与のみに切替)
- プロモコード redeem 機構 (ユーザー向け課金機能全撤廃)

---

## ディレクトリ構成

```
creatorLinks/
├── apps/
│   ├── web/          # Next.js フロントエンド (port 3000)
│   └── api/          # Hono API サーバー    (port 3001) — ローカル開発用
├── packages/
│   └── shared/       # 共通型定義・Zod スキーマ（将来 mobile と共有）
├── scripts/
│   └── setup.sh      # 初回セットアップスクリプト
└── docker-compose.yml
```

---

## 主要機能

### サイトトップ
- 自動切替ヒーロースライドショー（5 秒間隔・ドットインジケーター付き）
- 新着案件・注目アーティスト・手数料比較
- **公式おすすめアーティスト**セクション（キュレーション）

### アーティスト機能
- プロフィール編集（ジャケット画像 + トプ画 + 自己紹介 + ジャンル + 熟練度 + 楽器）
- ポートフォリオ登録（画像・音声・動画、最大 256MB、Canvas 圧縮）
- アーティスト一覧（カバー画像 + アバター + 自己紹介の縦型カード、ジャンルフィルタ、無限スクロール）

### マッチング
- 案件の作成・一覧・詳細（`commitmentLevel` = HOBBY / SEMI_PRO / PRO 必須）
- 応募・承認・却下フロー
- ポーリング/Pusher リアルタイムチャット
- 納品完了・レビュー投稿・評価集計
- **公式サポート窓口**（サイドバー / Chat ヘッダーから直通）

### 公式アカウント基盤
- サインアップ時にウェルカム DM（公式との Match 自動作成）
- 全体お知らせ（`/announcements` + サイドバー未読バッジ）
- 公式ピックアップ（アーティスト詳細のバナー）
- サポート/争議窓口（Phase 4 完了）

### 課金
- PRO プラン（RevenueCat Web Billing 月額サブスク）
- 創設メンバー枠：先着 100 名に **PRO 6ヶ月無料 + スロット番号入り永久バッジ**（Inngest 日次 cron で自動失効、旧 先着 30 名の永久 PRO 組は継続）
- プロモコード redeem（`hasLifetimeFreePro`、RevenueCat webhook / cron 両対応）

### Phase A で追加予定
- イベント告知（LIVE / SESSION / RECORDING / WORKSHOP / MEETUP）
- カレンダー（個人・公開・iCal export）

---

## はじめかた

### 必要なもの
- Node.js 20+
- pnpm 9+
- Docker Desktop

### 初回セットアップ（1 コマンド）

```bash
bash scripts/setup.sh
```

自動で以下を実行：
1. `.env` ファイルを生成
2. `pnpm install`
3. Docker で PostgreSQL を起動（ホスト側 **5433** に公開）
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

`pnpm db:seed` 実行時に自動作成されます。ロールとメールは `apps/api/prisma/seed.ts` を参照。**認証情報は公開しません**（過去に平文パスワードを掲載していたため、本番同一アカウントは要ローテーション）。

ローカル DB を初期化した直後であれば、seed スクリプトのソースを開いてご確認ください：

```bash
grep -E "email|password" apps/api/prisma/seed.ts
```

---

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

---

## 環境変数

`apps/web/.env.local` と `apps/api/.env` に設定。詳細は `.env.example` を参照。

### 最低限必要な変数（ローカル開発）

```env
# DB（docker-compose で自動設定、ホスト側は 5433 に公開）
DATABASE_URL="postgresql://creator:creator_pass@localhost:5433/creator_links_dev"

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

---

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

> **注意（Phase A に向けて）：** migration の baseline 化は未実施。イベント／カレンダーモデル追加のタイミングで初回 migration を切る予定。

### 画像アップロードの仕組み
- ブラウザ側で **Canvas API による圧縮**（WebP 変換 + リサイズ）を実施
- `@vercel/blob/client` の `upload()` でブラウザ → CDN に直接 PUT（Next.js サーバーを経由しない＝ボディサイズ制限なし）
- `/api/blob` ルートはクライアントトークン発行と完了通知のみ処理（**Edge Runtime** でコールドスタートを最小化、Auth.js JWT で軽量認証）

---

## 実装済み機能

- [x] 認証（メール/パスワード・Google OAuth）
- [x] アーティストプロフィール（ジャケット画像 + トプ画 + 自己紹介 + ジャンル + 熟練度 + 楽器）
- [x] ポートフォリオ登録（画像・音声・動画、Canvas 圧縮、進捗表示付き）
- [x] アーティスト一覧（縦型カード + 無限スクロール）
- [x] 案件 CRUD（作成・一覧・詳細、`commitmentLevel` 必須）
- [x] マッチング（応募・承認・却下）
- [x] チャット（Pusher / ポーリングフォールバック）
- [x] 納品完了・レビュー投稿・評価集計
- [x] 管理画面
- [x] Vercel Blob ファイルアップロード（ブラウザ → CDN 直接、自動 WebP 圧縮）
- [x] RevenueCat Web Billing 課金（PRO プラン、Webhook で role 同期）
- [x] 創設メンバー枠（先着 100 名 PRO 6ヶ月無料 + 永久バッジ、Inngest cron で自動失効）
- [x] Pusher リアルタイムチャット
- [x] メール通知（Resend + Inngest バックグラウンドジョブ）
- [x] トップページヒーロースライドショー
- [x] Vitest 単体テスト（51/51 緑）
- [x] Playwright E2E テスト（認証・案件 CRUD・マッチング・チャット）
- [x] 公式アカウント基盤 Phase 1〜4（バッジ・ウェルカム DM・お知らせ・キュレーション・**サポート窓口**）
- [x] プロモコード redeem（永久 PRO 発行）
- [x] ダッシュボードサイドバー ホバー展開 rail

## 進行中 / 未着手

- [ ] Phase A: イベント告知＋カレンダー
- [ ] Stripe Connect の動作テスト（P1-P7 実装済だがテスト未実施）
- [ ] ブランディングテキストの音楽業界最適化（60〜70% は既に音楽寄り）
- [ ] 公式アカウント Admin UI（お知らせ投稿・featured 追加・プロモコード発行）
- [ ] 既存ユーザー 5 名への遡及ウェルカム DM
- [ ] Prisma migration baseline 化（Phase A のスキーマ追加と同時に実施予定）
- [ ] ESLint 設定初期化（`next lint` は Next.js 16 で deprecated）
- [ ] モバイル対応（PWA 化から着手予定）
