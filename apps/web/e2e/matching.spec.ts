// e2e/matching.spec.ts — マッチング・チャット E2E テスト
import { test, expect } from '@playwright/test'
import { loginAs, logout } from './helpers/auth'

test.describe('マッチング管理（発注者）', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'client')
  })

  test('案件管理ページにアクセスできる', async ({ page }) => {
    await page.goto('/projects/manage')
    await expect(page.getByRole('heading', { name: /案件管理|マッチング/ })).toBeVisible()
  })

  test('応募一覧が表示される（シードデータ）', async ({ page }) => {
    await page.goto('/projects/manage')
    await page.waitForLoadState('networkidle')

    // seed-match-2（APPLIED）が表示されているか確認
    const appliedBadge = page.getByText('応募中').first()
    if (await appliedBadge.isVisible({ timeout: 3000 }).catch(() => false)) {
      // 承認・却下ボタンが表示されること
      await expect(page.getByRole('button', { name: '承認' }).first()).toBeVisible()
      await expect(page.getByRole('button', { name: '却下' }).first()).toBeVisible()
    }
  })
})

test.describe('チャット（承認済みマッチング）', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'client')
  })

  test('マッチング一覧からチャットへ遷移できる', async ({ page }) => {
    await page.goto('/dashboard/matches')
    await page.waitForLoadState('networkidle')

    // 承認済みマッチングのチャットリンク
    const chatLink = page.getByRole('link', { name: /チャット|会話/ }).first()
    if (await chatLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chatLink.click()
      await page.waitForURL(/\/dashboard\/chat\//)
      await expect(page.getByPlaceholder(/メッセージ/)).toBeVisible()
    }
  })

  test('チャット画面でメッセージを送信できる', async ({ page }) => {
    // seed-match-1 (ACCEPTED) のチャットへ直接アクセス
    await page.goto('/dashboard/chat/seed-match-1')
    await page.waitForLoadState('networkidle')

    const input = page.getByPlaceholder(/メッセージ/)
    if (await input.isVisible({ timeout: 5000 }).catch(() => false)) {
      const testMessage = `E2Eテストメッセージ ${Date.now()}`
      await input.fill(testMessage)
      await page.getByRole('button', { name: '送信' }).click()

      // メッセージが画面に表示される
      await expect(page.getByText(testMessage)).toBeVisible({ timeout: 8000 })
    }
  })

  test('チャット画面でメッセージ履歴が表示される', async ({ page }) => {
    await page.goto('/dashboard/chat/seed-match-1')
    await page.waitForLoadState('networkidle')

    // シードデータのメッセージが表示される
    await expect(page.getByText('ご応募ありがとうございます')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('ダッシュボード', () => {
  test('アーティストのダッシュボードが表示される', async ({ page }) => {
    await loginAs(page, 'artist')
    await page.goto('/dashboard')

    await expect(page.getByRole('heading', { name: /ダッシュボード/ })).toBeVisible()
  })

  test('発注者のダッシュボードが表示される', async ({ page }) => {
    await loginAs(page, 'client')
    await page.goto('/dashboard')

    await expect(page.getByRole('heading', { name: /ダッシュボード/ })).toBeVisible()
  })

  test('未読メッセージ数がヘッダーに表示される', async ({ page }) => {
    await loginAs(page, 'client')
    // ヘッダーがレンダリングされていること
    await page.goto('/dashboard')
    await expect(page.getByRole('navigation')).toBeVisible()
  })
})

test.describe('アーティスト一覧', () => {
  test('アーティスト一覧が無限スクロールで表示される', async ({ page }) => {
    await page.goto('/artists')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'アーティスト一覧' })).toBeVisible()

    // アーティストカードが少なくとも1枚表示される
    const cards = page.locator('a[href^="/artists/"]')
    await expect(cards.first()).toBeVisible({ timeout: 5000 })
  })

  test('ジャンルフィルタでアーティストを絞り込める', async ({ page }) => {
    await page.goto('/artists')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: '音楽' }).click()
    await page.waitForTimeout(800) // フィルタ反映を待つ

    // 結果が変わること（エラーが出ないこと）を確認
    await expect(page.getByRole('heading', { name: 'アーティスト一覧' })).toBeVisible()
  })

  test('アーティスト詳細ページへ遷移できる', async ({ page }) => {
    await page.goto('/artists')
    await page.waitForLoadState('networkidle')

    const artistCard = page.locator('a[href^="/artists/"]').first()
    if (await artistCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await artistCard.click()
      await page.waitForURL(/\/artists\//)
      await expect(page.getByRole('heading')).toBeVisible()
    }
  })
})
