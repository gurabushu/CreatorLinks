# 恩人向け PRO 永年無料 プロモコード 運用手順

**目的:** 音楽業界の先輩・恩師・ベータテスター・意見をくれた人など「日頃の恩人」に対して、PRO プランを永年無料で贈る運用ルールとオペレーション。

**背景:** 通常 PRO は月額 ¥980 で販売するが、選考制で少数（当面 10 名前後）に永年無料で贈呈する。PRO 特典は:
- プラットフォーム手数料 7% → 5%（受注時にそのまま手取り +2%）
- アーティスト一覧で優先表示
- PRO バッジ

## 贈呈対象

以下のいずれかに該当する人を、沖山さん個別裁量で選定:

- 音楽業界の先輩・恩師（ミュージシャン、レコーディングエンジニア、PA、講師 等）
- ベータテスト協力者・意見をくれた人・レビュアー

**対象外（贈っても価値がない・意図と外れる）:**
- 非ミュージシャン（PRO 特典はアーティスト側の恩恵のみ）
- ゲストアカウント（`isGuest = true`、redeem 側で拒否される）
- 既に `hasLifetimeFreePro = true` のユーザー（redeem 側で拒否される）

## 発行フロー

### 1. 対象者を選定
沖山さん個別裁量。Encore 上に既にアカウントがある場合はその email を控える。まだ登録していない場合は「Encore に登録してから、このコードを入れてください」と依頼する。

### 2. プロモコードを SQL で発行

Admin UI は未実装のため、当面は本番 DB に直接 INSERT する。

```sql
-- 例: 山田太郎さんへのコード
INSERT INTO "promo_codes" (
  id, code, label,
  "maxRedemptions", "redemptionCount",
  "createdById", "createdAt"
) VALUES (
  gen_random_uuid()::text,
  'THANKS-YAMADA-2026',                 -- 対象者識別 + 年
  '山田太郎さんへの感謝コード',              -- 内部メモ
  1,                                     -- 1 名限定
  0,
  '<沖山さんの admin User id>',           -- SELECT id FROM users WHERE isOfficial = true LIMIT 1;
  NOW()
);
```

**コード命名規則:**
- `THANKS-<TARGET>-<YEAR>` 形式（例: `THANKS-YAMADA-2026`）
- 対象者が推測しやすく、被贈呈者が「自分専用」と分かる形が望ましい
- 誤入力防止のため 32 文字以内、大文字英数字＋ハイフン＋アンダースコアのみ

**制約:**
- `maxRedemptions = 1` で 1 名しか使えない設定
- 有効期限 (`expiresAt`) は基本 null (無期限) だが、意思確認後に一定期間で失効させたい場合は日付を指定

### 3. 対象者に個別に送付

LINE / メール / DM いずれかで、以下のテンプレを叩き台に個別カスタムして送る。

**文言テンプレ (基本):**

```
◯◯さん

いつもお世話になっております、沖山です。
突然のご連絡すみません。

新しく音楽業界向けの依頼管理サービス Encore を作りました。
https://creator-links-web.vercel.app

◯◯さんに日頃からお世話になっている感謝を込めて、
Encore の PRO プランを永年無料でお受け取りいただければと思っています。

▼ 受け取り方
1. Encore に登録（未登録の場合）
2. /pro/subscribe ページを開く
3. 「特典コードをお持ちの方」欄に以下のコードを入力

コード: THANKS-YAMADA-2026

▼ PRO の主な特典
- プラットフォーム手数料 7% → 5%（受注案件の手取りが 2% 上がります）
- アーティスト一覧での優先表示
- PRO バッジ

もし気になれば、Encore 経由で案件を受けていただけると励みになります。
使い方の質問等はいつでもどうぞ。

引き続きよろしくお願いいたします。
```

**文言テンプレ (ベータテスター・意見をくれた人向け):**

```
◯◯さん

Encore へのご意見・テスト協力ありがとうございました。
おかげさまで △△ の部分を大きく改善できました。

感謝のしるしに PRO プラン (通常 月額 ¥980) を永年無料でお使いください。

▼ 受け取り方
1. /pro/subscribe ページを開く
2. 「特典コードをお持ちの方」欄に以下のコードを入力

コード: THANKS-YAMADA-2026

引き続き Encore の成長を見守っていただければ幸いです。
```

### 4. Redeem 後の確認

redeem 成功後、以下が自動的に反映される:
- `users.hasLifetimeFreePro = true`（永年無料フラグ）
- `users.role = 'PRO'`（PRO ロール）
- 以降の受注案件は手数料 5% に自動減額
- 一覧で優先表示、プロフィールに PRO バッジ

**redeem 確認用 SQL:**
```sql
SELECT u.email, u.name, u.role, u."hasLifetimeFreePro", pr."createdAt" AS redeemed_at
FROM users u
JOIN promo_redemptions pr ON pr."userId" = u.id
JOIN promo_codes pc ON pc.id = pr."codeId"
WHERE pc.code = 'THANKS-YAMADA-2026';
```

## 想定 Q&A

**Q: 対象者が既に登録済みの PRO 課金ユーザーだったら？**  
A: `hasLifetimeFreePro = true` にすると失効 cron の対象外になる。ただし RevenueCat の課金は別途キャンセルするよう案内する必要がある。

**Q: 対象者に「贈呈されたこと」を外部に公開しますか？**  
A: いいえ。DB 上は `hasLifetimeFreePro` フラグで判別可能だが、UI 上は通常の PRO バッジのみで、贈呈事実は表示されない。

**Q: 対象者が退会したらコードはどうなる？**  
A: 退会は soft-delete (`deletedAt` セット) 方式。`PromoRedemption` レコードは残るが、User の PRO 状態は無効化される。コードは既に使用済み (`redemptionCount = 1`) なので他者は使えない。

**Q: 転売されたら？**  
A: プロモコードは email 紐付けではなく、コード知っている人が誰でも redeem できる形式。ただし `maxRedemptions = 1` なので 1 名しか使えない。転売リスクはあるが、対象が信頼できる人に限定される前提の運用。

## 今後の課題

- **Admin UI (プロモコード発行 UI)** — 10 名を超えたら実装を検討
- **email 紐付け発行** — 転売防止したい場合、Redeem 時に email 一致チェックを追加
- **贈呈履歴のダッシュボード** — 誰にいつ贈ったかを追跡する内部ページ

## 変更履歴

- 2026-08-15: 初版作成、PRO 手数料 5% 減額と併せて運用開始
