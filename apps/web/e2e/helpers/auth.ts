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

  // ログイン / 新規登録はタブではなく plain button。role=tab ではヒットしないので role=button で明示。
  // mode が signup のときのみ切替が必要（defaults to login）。
  const loginSwitch = page.getByRole('button', { name: 'ログイン', exact: true })
  if (await loginSwitch.count() > 1) {
    await loginSwitch.first().click()
  }

  await page.getByLabel('メールアドレス').fill(email)
  // PasswordInput は <input> と visibility toggle <button aria-label="パスワードを表示する"> を含むため、
  // getByLabel('パスワード') だと 2 要素ヒットする。exact マッチで <input> だけに絞る。
  await page.getByLabel('パスワード', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'ログイン', exact: true }).last().click()

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
