// e2e/auth.spec.ts — 認証フロー E2E テスト
import { test, expect } from '@playwright/test'
import { loginAs, logout, TEST_ACCOUNTS } from './helpers/auth'

test.describe('認証フロー', () => {
  test.beforeEach(async ({ page }) => {
    await logout(page)
  })

  test('ログインページが表示される', async ({ page }) => {
    await page.goto('/auth')
    await expect(page).toHaveTitle(/ログイン|CreatorLinks/)
    await expect(page.getByLabel('メールアドレス')).toBeVisible()
    await expect(page.getByLabel('パスワード')).toBeVisible()
  })

  test('正しい認証情報でログインできる', async ({ page }) => {
    await loginAs(page, 'client')
    // ダッシュボードまたはトップページにリダイレクト
    await expect(page).toHaveURL(/\/(dashboard|$)/)
  })

  test('誤ったパスワードではログインできない', async ({ page }) => {
    await page.goto('/auth')
    await page.getByLabel('メールアドレス').fill('client@example.com')
    await page.getByLabel('パスワード').fill('wrongpassword')
    await page.getByRole('button', { name: 'ログイン' }).click()

    // エラーメッセージが表示される
    await expect(page.getByText(/パスワード|認証|エラー/)).toBeVisible({ timeout: 5000 })
    // ログインページに留まる
    await expect(page).toHaveURL(/\/auth/)
  })

  test('新規会員登録ができる', async ({ page }) => {
    const timestamp = Date.now()
    const testEmail = `e2e-test-${timestamp}@example.com`

    await page.goto('/auth')

    // 新規登録タブに切り替え
    await page.getByRole('tab', { name: '新規登録' }).click()

    await page.getByLabel('名前').fill('E2Eテストユーザー')
    await page.getByLabel('メールアドレス').fill(testEmail)
    await page.getByLabel('パスワード').fill('testpass123')
    await page.getByRole('button', { name: '登録する' }).click()

    // 登録成功後ダッシュボードへ
    await expect(page).toHaveURL(/\/(dashboard|$)/, { timeout: 10000 })
  })

  test('未認証ユーザーはダッシュボードにアクセスできない', async ({ page }) => {
    await page.goto('/dashboard')
    // ログインページへリダイレクト
    await expect(page).toHaveURL(/\/auth/, { timeout: 5000 })
  })

  test('PRO アーティストとしてログインすると正しいロールが表示される', async ({ page }) => {
    await loginAs(page, 'artist')
    await page.goto('/dashboard')
    // PRO バッジが何らかの形で存在することを確認
    await expect(page.getByText('PRO')).toBeVisible()
  })
})
