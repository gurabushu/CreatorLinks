// e2e/helpers/auth.ts — 認証ヘルパー
import { Page } from '@playwright/test'

export const TEST_ACCOUNTS = {
  artist: { email: 'yamada@example.com', password: 'pro12345', name: '山田 太郎' },
  general: { email: 'sato@example.com', password: 'user1234', name: '佐藤 花' },
  client: { email: 'client@example.com', password: 'user1234', name: '株式会社サンプル' },
  admin: { email: 'admin@creatorlinks.jp', password: 'admin1234', name: '管理者' },
}

export async function loginAs(page: Page, account: keyof typeof TEST_ACCOUNTS) {
  const { email, password } = TEST_ACCOUNTS[account]

  await page.goto('/auth')
  await page.waitForLoadState('networkidle')

  // ログインタブを選択（デフォルトがログインの場合はそのまま）
  const loginTab = page.getByRole('tab', { name: 'ログイン' })
  if (await loginTab.isVisible()) {
    await loginTab.click()
  }

  await page.getByLabel('メールアドレス').fill(email)
  await page.getByLabel('パスワード').fill(password)
  await page.getByRole('button', { name: 'ログイン' }).click()

  // ダッシュボードへのリダイレクトを待機
  await page.waitForURL(/\/(dashboard|$)/, { timeout: 10000 })
}

export async function logout(page: Page) {
  await page.goto('/')
  const signOutBtn = page.getByRole('button', { name: 'サインアウト' })
  if (await signOutBtn.isVisible()) {
    await signOutBtn.click()
    await page.waitForURL('/')
  }
}
