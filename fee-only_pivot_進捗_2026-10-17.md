# EncoreCue fee-only pivot 進捗記録 (2026-10-17)

**目的:** AI セッションを跨いで作業を再開できるようにするための引き継ぎ Doc。
PRO サブスク全廃 → Platform fee のみ + 認証バッジ買切 + Founding Supporter 優遇
への pivot を実装中。

---

## 1. 設計の骨子（AskUserQuestion で合意済み）

```
┌─────────────────────────────────────────────┐
│ 全員 Free                                   │
│  F1-F7 すべて解放・月額なし                │
└──────────────────┬──────────────────────────┘
                   ↓ 使う人だけ
┌─────────────────────────────────────────────┐
│ 収益: Platform fee 7% (案件決済のみ)        │
│  escrow + 税支援 + 揉め事仲裁 の対価        │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 濾過剤 Layer 1: 本人確認バッジ (無料)       │
│  Stripe Connect オンボ完了で自動付与        │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 濾過剤 Layer 2: 認証バッジ (¥3,000 買切)    │
│  完全任意・一度払えば永久                   │
│  "本気度 + 運営応援" のお布施モデル         │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Founding Supporter (招待制)                 │
│  ヒアリング協力者を手動付与                 │
│  Platform fee 0% + 認証バッジ無償付与       │
│  バッジのみ公開、リストは非公開             │
└─────────────────────────────────────────────┘
```

### 決定事項
- 認証バッジ Layer 2 = **¥3,000 買切**（¥1,000 弱すぎ、¥5,000 購入率低い）
- Founding Supporter は **バッジのみ公開、内部リスト非公開**
- 既存 PRO ユーザーは **全員 Founding Supporter に安全振替**
- 理念: "金で露出買えない / 搾取的でない" (ランサーズ 16-22% 比較で 7% は最低水準)

関連 memory:
- `project_encorecue_fee_only_pivot.md` (今日追加、設計根拠)
- `project_creatorlinks_stripe_escrow.md` (RevenueCat 分離方針を撤回)

---

## 2. 完了済み（8 Phase / 8 — fee-only pivot 実装完了）

| Phase | 内容 | commit |
|---|---|---|
| **A** | `User.isVerified` field + migration | `b8a2964` |
| **G** | RevenueCat 連携完全削除 (lib/revenuecat, webhook, @revenuecat/purchases-js) | `d63e2be` |
| **B** | F1-F7 / S2-S4 の PRO 分岐全撤廃 (28 ファイル / +127 -554) | `00fff50` |
| **F** | 既存 PRO → Founding Supporter migration script | `ad117eb` |
| **A2** | UserRole enum から `PRO` 削除、Early Bird cron 撤去 | `5e61978` |
| **D** | Supporter 管理 Admin UI (`/admin/supporters`) | `38e830b` |
| **C** | 認証バッジ買切 ¥3,000 Stripe Checkout + webhook 分岐 | `9ddb6ee` |
| **E** | LP / FAQ / footer / terms / tokutei の PRO 条項全削除 | `572f80a` / `c699620` / `6ecaffa` |

### 完了内容の要点

- **DB schema**: `User.isVerified: boolean @default(false)` 追加、`UserRole` enum は `GENERAL | ADMIN` の 2 値のみ
- **Platform fee**: 全員 7% 固定、`User.isFounderExempt=true` のみ 0%
- **RevenueCat 完全撤去**: パッケージ依存・webhook・SDK dynamic import 全削除
- **F1-F7 無料開放**: ポートフォリオ無制限、プロフィール分析 (`/dashboard/analytics`)、CRM、源泉徴収税列・月次集計、案件テンプレート、全員利用可能
- **S2-S4 upsell 削除**: マッチ一覧・案件詳細・ダッシュボードから PRO 誘導 UI 全撤去
- **cron 撤去**: `expire-early-bird-free-tier` + `notify-early-bird-expiring` を削除（PRO 期限切れ概念が消えた）
- **既存 PRO migration**: `yamada@example.com` を Founding Supporter に振替済み（local dev DB）
- **Admin UI**: `/admin/supporters` で手動付与・取消が可能

### テスト状態

- Vitest: **8 ファイル / 78 tests pass**（Phase C で webhook verify_badge 分岐 2 ケース追加）
- 既存 `stripe.test.ts`、`portfolio.test.ts`、`project-template.test.ts` は fee-only 向けに書き換え済み
- `tsc --noEmit`: green

---

## 3. 残作業（なし — ドキュメント化と本番適用のみ）

fee-only pivot の実装は全 Phase 完了。残っているのはユーザー側の本番適用作業（§5）のみ。

---

## 4. 次回セッション 再開手順

### a. 環境確認（最初に実行）

```bash
cd "/Users/apple/Desktop/開発・クリエイト・DAW/EncoreCue_"

# git state
git status
git log --oneline -10

# dev DB (docker-compose port 5433)
docker ps --filter name=creator | head -3
# 停止していれば: docker compose up -d

# test green であることを確認
pnpm --filter @creator-links/web test
pnpm --filter @creator-links/web exec tsc --noEmit
```

### b. 現在の DB state（dev）

- 本流 repo: `/Users/apple/Desktop/開発・クリエイト・DAW/EncoreCue_/` （旧 `creatorLinks` は空）
- Docker: `creator_links_db` on `localhost:5433`
- DB name: `creator_links_dev`
- Migrations applied: `20261016235435_baseline`, `20261017045206_add_user_is_verified`, `20261017051833_drop_user_role_pro`
- Seed users:
  - admin@creatorlinks.jp / admin1234 (ADMIN)
  - yamada@example.com / pro12345 → **Founding Supporter 化済み** (role=GENERAL, isFounderExempt=t, isVerified=t)
  - sato@example.com / user1234 (GENERAL)
  - client@example.com / user1234 (GENERAL)
  - tonokyama@gmail.com (OFFICIAL)

### c. dev 起動

```bash
cd "/Users/apple/Desktop/開発・クリエイト・DAW/EncoreCue_"
pnpm dev
# web: http://localhost:3000
# api: http://localhost:3001
```

### d. Phase C に着手する時のプロンプト例

> fee-only_pivot_進捗_2026-10-17.md の Phase C に着手。
> /verify ページで ¥3,000 認証バッジを Stripe PaymentIntent で買切購入できるようにする。
> Checkout Session metadata に `purpose: 'verify_badge'` を入れて、webhook で分岐して
> User.isVerified=true に更新する。既存の案件決済 webhook と衝突しない設計で頼む。

### e. Phase E に着手する時のプロンプト例

> fee-only_pivot_進捗_2026-10-17.md の Phase E に着手。
> /pro/subscribe を /verify にリダイレクトし、LP の PRO 価格表・pricing-comparison コンポーネント
> を認証バッジ案内に書き換え。terms/tokutei の PRO サブスク条項も削除。

---

## 5. 本番適用に必要なユーザー作業（まだ未実施）

1. **本番 DB migrate deploy**
   ```bash
   DATABASE_URL="<PROD>" npx prisma migrate deploy
   ```
   新 migration 2 本（isVerified 追加、PRO enum 削除）が適用される。

2. **本番 PRO ユーザーの振替**
   ```bash
   DATABASE_URL="<PROD>" pnpm --filter @creator-links/api \
     tsx scripts/migrate-pro-to-founding-supporter.ts --dry-run
   # 件数確認後 --dry-run を外して本実行
   ```

3. **Vercel Production env の 投入**
   - 既存の `scripts/check-vercel-env.sh` で現状確認
   - 不足分（Stripe / Pusher / Sentry / CRON_SECRET 等）を投入
   - RevenueCat 系 env (`NEXT_PUBLIC_REVENUECAT_*`, `REVENUECAT_WEBHOOK_SIGNING_SECRET`) は **削除してよい**（コード側で参照なし）

4. **Stripe Webhook endpoint 設定**
   - 既存の案件決済 webhook (`payment_intent.succeeded` 等) に加え、Phase C 完了後は認証バッジ用 metadata の処理が同じ endpoint に乗る
   - 追加設定は不要（同じ URL / 同じ events で受ける）

---

## 6. 既知の課題 / 後続整理候補

- **FoundingMemberBadge の名称**: コンポーネント名は旧名のまま。memory 上は "Founding Supporter" に統一したが、component rename は未実施（UI 文言は変わらないので優先度低）
- **`EARLY_BIRD_TOTAL` 定数**: 100 名制限が残っている。fee-only では無制限にできるが、現状は creative constraint として残す判断もあり。要議論
- **`FREE_PORTFOLIO_LIMIT` 定数**: `lib/portfolio-limits.ts` に残置。使用箇所なし。削除可
- **`PLATFORM_FEE_RATE_PRO` 定数**: `lib/stripe.ts` に `@deprecated` で残置。他 import 元があれば順次 `PLATFORM_FEE_RATE` へ差替
- **`hasFreeProAccess` / `hasLifetimeFreePro`**: Early Bird 系の無料アクセス判定ヘルパ。Phase C/E 完了後に順次削除候補

---

## 7. 関連 commit 一覧（今日のセッション）

```
38e830b feat(admin): Supporter 管理 UI 追加 (Phase D)
5e61978 feat(fee-only): UserRole enum から PRO 値を削除 (Phase A2)
ad117eb feat(fee-only): 既存 PRO ユーザーを Founding Supporter に振替える migration script (Phase F)
00fff50 feat(fee-only): F1-F7 / S2-S4 の PRO 限定分岐を全撤廃 (Phase B)
d63e2be chore(revenuecat): RevenueCat 連携を完全削除 (Phase G)
b8a2964 feat(db): User.isVerified 追加 + baseline migration の stderr noise 除去
```

さらに前の作業（本日前半、2 トーン UI 系）:
```
6540c02 refactor(ui): サイト全体を 2 トーン (zinc + purple-600) に統一 (Step 2)
eadc213 feat(scripts): Vercel Production env の充足チェックスクリプト追加
249bade feat(pro): PRO サブスク UI を再有効化 (後に Phase G で reverted)
022ffbb test(server-actions): PRO role guard の回帰テストを追加 (後に Phase B で書き換え)
bdac779 chore(db): Prisma migration baseline 化 + vercel-build を migrate deploy に切替
e0aa538 feat(official): 遡及ウェルカム DM スクリプト追加
ef16968 chore: gitignore で .env.preview/development/vercel を追加 + メンター資料 track
4172491 fix(artist): Encore 相性カウント raw SQL のカラム名を camelCase に修正
```

---

**作成者:** Claude Code (Opus 4.7) + 沖山（TobojoLabs）
**次回セッション想定開始:** Credits リセット後
