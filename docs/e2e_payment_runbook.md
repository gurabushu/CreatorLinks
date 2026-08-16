# Stripe エスクロー案件決済 E2E テスト 実行手順

**目的:** メンター資料 §8-1「Stripe Connect の end-to-end 動作テスト — 未実施」の解消。
「Match ACCEPTED → 発注者支払い → HELD → 検収 → releasePayment → RELEASED」の一連の流れを
実際の Stripe test mode API で通し、DB とStripe 両側の整合を verify する。

**スクリプト:** `apps/web/scripts/e2e-payment.ts`

**所要:** 30 秒〜1 分（Stripe API 遅延次第）

---

## 前提条件

1. **Docker で local dev DB が起動中**
   ```bash
   docker compose ps  # creator_links_db が healthy
   ```

2. **Stripe CLI がログイン済み（test mode key が有効）**
   Stripe test key は数日で失効するので、実行前に必ず確認:
   ```bash
   stripe config --list | grep test_mode_key_expires_at
   ```
   失効している場合:
   ```bash
   ! stripe login
   # ブラウザで承認 → CLI に戻る
   ```

3. **apps/web/.env.local に STRIPE_SECRET_KEY (sk_test_…) が設定済み**
   `stripe login` 後、以下で値をコピー:
   ```bash
   stripe config --list | grep test_mode_api_key
   ```
   `apps/web/.env.local` の `STRIPE_SECRET_KEY` に貼付。

---

## 実行

```bash
cd apps/web
pnpm e2e:payment
```

正常時のログ例:
```
=== Stripe エスクロー案件決済 E2E テスト ===
  · 実行 ID: abc12345  (email 接頭辞 e2e-test-abc12345-*)
  · 予算: ¥10,000 / 想定 手数料 ¥700 / 想定 受取 ¥9,300

[1] Test artist を作成 + Stripe Connect Express アカウント作成
  ✓ Connect account 作成: acct_1XXX
[2] Test buyer を作成
[3] Test Project + Match(ACCEPTED) を作成
[4] PaymentIntent 作成 + test カードで confirm
  ✓ PaymentIntent 作成 + confirm: pi_XXX status=succeeded
  ✓ Charge 生成: ch_XXX
[5] Payment を HELD に更新（webhook 相当）
  ✓ Payment status = HELD, chargeId 保存済み
[6] Match を COMPLETED に更新（検収完了）
[7] releasePayment(paymentId) を実行
  ✓ Transfer 作成: tr_XXX
[8] DB verify: Payment.status = RELEASED + stripeTransferId 保存
[9] Stripe API verify: Transfer amount / destination / source_transaction
[10] 冪等性 verify: releasePayment を再度呼んでも Transfer 増えない

✓ E2E テスト完了
  Buyer 支払い: ¥10,000
  Platform 手数料: ¥700 (7%)
  Artist 受取: ¥9,300
```

Stripe Dashboard で PaymentIntent と Transfer が確認できる URL がログ末尾に出力される。

---

## 検証項目（スクリプト内 assert）

| 検証内容 | 期待 |
|---|---|
| PaymentIntent 作成 | `status === 'succeeded'` |
| Charge 生成 | `latest_charge` が取得できる |
| Payment.status 遷移 | AWAITING → HELD → RELEASED |
| stripeTransferId 保存 | DB と Stripe API が一致 |
| Transfer.amount | 予算 - 手数料 = ¥9,300 |
| Transfer.destination | Test Connect account ID と一致 |
| Transfer.source_transaction | Charge ID と一致 |
| Transfer.currency | `jpy` |
| 冪等性 | 2 回目の releasePayment は `not_held` で拒否 |

---

## 何をテストしていないか

- **Webhook 経路**: `stripe listen` を経由した webhook 受信は別テスト（unit test `webhook/route.test.ts` でカバー）
- **Checkout Session**: ブラウザ経由の Checkout は手動テスト対象
- **返金・紛争処理**: 次フェーズで別スクリプト
- **PRO 手数料 5% / 恩人枠 0%**: 別途 stripe.test.ts (unit) でカバー済み、E2E でも将来オプション追加可

---

## 後始末

スクリプトは `finally` で以下を自動削除:
- DB: E2E 用に作った User (2), Project, Match, Payment
- Stripe: Test Connect Express account

以下は Stripe test mode に残る（監査・確認用途で有益なため）:
- PaymentIntent / Charge / Transfer

Stripe test data を一括削除したい場合:
```
Dashboard → Developers → Test data → Delete all test data
```

---

## トラブルシューティング

**`STRIPE_SECRET_KEY is not configured`**  
`stripe login` して test key を取得、`apps/web/.env.local` に貼付。

**`Expired API Key provided`**  
Test key が失効（Stripe test key は数日で expire）。`stripe login` で再取得。

**`PaymentIntent が succeeded にならず`**  
Stripe 側の障害 or `pm_card_visa` が拒否される稀ケース。Stripe status ページを確認。

**`Transfer が失敗 (destination_account_not_active)`**  
Connect account の `transfers` capability が有効化されていない。作成直後は数秒待って再試行。

**cleanup 中エラー**  
一部リソースが残る。DB 側は `DELETE FROM users WHERE email LIKE 'e2e-test-%'` で全削除可能。

---

## 変更履歴

- 2026-08-16: 初版
