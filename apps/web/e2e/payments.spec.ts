// e2e/payments.spec.ts — Stripe Connect 決済フロー E2E
// 事前条件（未設定なら skip）:
//   1. STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET / NEXT_PUBLIC_APP_URL がテストキーで設定済
//   2. `stripe listen --forward-to localhost:3000/api/stripe/webhook` が別窓で稼働
//   3. seed で ACCEPTED の Match（seed-match-1 想定）が存在し、案件 budget > 0
//   4. 受注アーティストの Connect Onboarding が完了済（stripePayoutsEnabled = true）
//
// 実行:
//   pnpm dev  # 別窓
//   stripe listen --forward-to localhost:3000/api/stripe/webhook  # 別窓
//   STRIPE_TEST_MATCH_ID=seed-match-1 pnpm --filter @creator-links/web test:e2e -- payments.spec.ts

import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

const STRIPE_CONFIGURED = Boolean(process.env.STRIPE_SECRET_KEY)
const MATCH_ID = process.env.STRIPE_TEST_MATCH_ID ?? 'seed-match-1'

test.describe('Stripe Connect 決済フロー', () => {
  test.skip(!STRIPE_CONFIGURED, 'STRIPE_SECRET_KEY 未設定のためスキップ（Stripe テスト環境が必要）')

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'client')
  })

  test('発注者: 支払うボタン → Checkout → 4242 テストカード → HELD 表示', async ({ page, context }) => {
    await page.goto(`/dashboard/chat/${MATCH_ID}`)
    await page.waitForLoadState('networkidle')

    const payButton = page.getByRole('button', { name: /支払う ¥/ })
    await expect(payButton).toBeVisible({ timeout: 5000 })

    // ボタン押下 → Stripe Checkout（同一タブで redirect）
    await Promise.all([
      page.waitForURL(/checkout\.stripe\.com/, { timeout: 15000 }),
      payButton.click(),
    ])

    // Stripe Checkout フォーム入力（Stripe UI 変更で seleector が変わったら要更新）
    await page.locator('input[name="cardNumber"]').fill('4242424242424242')
    await page.locator('input[name="cardExpiry"]').fill('12 / 34')
    await page.locator('input[name="cardCvc"]').fill('123')
    await page.locator('input[name="billingName"]').fill('TARO YAMADA')

    await Promise.all([
      page.waitForURL(new RegExp(`/dashboard/chat/${MATCH_ID}\\?paid=1`), { timeout: 30000 }),
      page.getByTestId('hosted-payment-submit-button').click(),
    ])

    // Webhook 到達で HELD バッジが出るまで待つ（stripe listen が forwarding している前提）
    const heldBadge = page.getByText('支払い済み（保管中）')
    await expect(heldBadge).toBeVisible({ timeout: 15000 })
  })

  test('納品完了後: 送金確認ボタン → RELEASED', async ({ page }) => {
    // 前提: 上のテストで HELD になっている想定。実運用では別 Match を用意する。
    await page.goto(`/dashboard/chat/${MATCH_ID}`)
    await page.waitForLoadState('networkidle')

    // アーティスト側の「納品完了」を手動で先に実行しておく必要あり（別セッションで）。
    // ここでは COMPLETED 前提でボタンの存在確認だけ検証。
    const releaseButton = page.getByRole('button', { name: /送金/ })
    if (!(await releaseButton.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip(true, '前提: Match が COMPLETED 状態でないため送金確認ボタン不在')
      return
    }

    page.on('dialog', (d) => d.accept())
    await releaseButton.click()

    const releasedBadge = page.getByText('送金完了')
    await expect(releasedBadge).toBeVisible({ timeout: 15000 })
  })
})

test.describe('Connect Onboarding 未完了時のブロック', () => {
  test.skip(!STRIPE_CONFIGURED, 'STRIPE_SECRET_KEY 未設定のためスキップ')

  test('相手アーティストが未オンボーディングなら支払いブロック', async ({ page }) => {
    const unblockedMatchId = process.env.STRIPE_TEST_UNCONNECTED_MATCH_ID
    test.skip(!unblockedMatchId, 'STRIPE_TEST_UNCONNECTED_MATCH_ID 未設定のためスキップ')

    await loginAs(page, 'client')
    await page.goto(`/dashboard/chat/${unblockedMatchId}`)
    await page.waitForLoadState('networkidle')

    const payButton = page.getByRole('button', { name: /支払う ¥/ })
    if (await payButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // ボタン押下 → server action が throw → Next のエラーバウンダリで捕捉される想定
      await payButton.click()
      await expect(page.getByText(/入金設定が未完了/)).toBeVisible({ timeout: 10000 })
    }
  })
})
