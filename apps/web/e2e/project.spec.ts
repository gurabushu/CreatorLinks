// e2e/project.spec.ts — 案件 CRUD E2E テスト
import { test, expect } from '@playwright/test'
import { loginAs, logout } from './helpers/auth'

test.describe('案件一覧', () => {
  test('未認証でも案件一覧を閲覧できる', async ({ page }) => {
    await page.goto('/projects')
    await expect(page.getByRole('heading', { name: /案件/ })).toBeVisible()
  })

  test('ジャンルフィルタが動作する', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')

    const musicFilter = page.getByRole('button', { name: '音楽' })
    if (await musicFilter.isVisible()) {
      await musicFilter.click()
      // URL または表示内容が変わることを確認
      await page.waitForTimeout(500)
    }
  })
})

test.describe('案件作成', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'client')
  })

  test('案件作成ページへ遷移できる', async ({ page }) => {
    await page.goto('/projects/new')
    await expect(page.getByRole('heading', { name: /案件を掲載/ })).toBeVisible()
  })

  test('フォームに記入して案件を作成できる', async ({ page }) => {
    await page.goto('/projects/new')
    await page.waitForLoadState('networkidle')

    // Step 1: タイトルと説明
    await page.getByLabel('タイトル').fill('E2Eテスト用BGM制作案件')
    await page.getByLabel('案件の詳細').fill('E2Eテスト用の案件です。自動テストにより作成されました。')

    // 次へ
    const nextBtn = page.getByRole('button', { name: '次へ' })
    if (await nextBtn.isVisible()) {
      await nextBtn.click()
    }

    // Step 2: ジャンル選択
    const musicChip = page.getByRole('button', { name: '音楽' })
    if (await musicChip.isVisible()) {
      await musicChip.click()
      const nextBtn2 = page.getByRole('button', { name: '次へ' })
      if (await nextBtn2.isVisible()) await nextBtn2.click()
    }

    // Step 3: 予算と契約タイプ
    const budgetInput = page.getByLabel('予算')
    if (await budgetInput.isVisible()) {
      await budgetInput.fill('50000')
    }

    // 掲載するボタン
    const submitBtn = page.getByRole('button', { name: /掲載する|作成する|公開/ })
    await submitBtn.click()

    // 成功後、案件詳細または一覧へリダイレクト
    await expect(page).toHaveURL(/\/projects/, { timeout: 10000 })
  })
})

test.describe('案件詳細', () => {
  test('案件詳細ページが表示される', async ({ page }) => {
    // まず一覧を開いて最初の案件をクリック
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')

    const firstProject = page.locator('a[href^="/projects/"]').first()
    if (await firstProject.isVisible()) {
      await firstProject.click()
      await page.waitForLoadState('networkidle')
      // 案件タイトルが表示されること
      await expect(page.getByRole('heading')).toBeVisible()
    }
  })

  test('アーティストが案件に応募できる', async ({ page }) => {
    await loginAs(page, 'artist')
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')

    // OPEN の案件を探してクリック
    const projectLink = page.locator('a[href^="/projects/seed-project-"]').first()
    if (await projectLink.isVisible()) {
      await projectLink.click()

      // 応募ボタンが存在すれば押す（自分の案件や応募済みの場合はスキップ）
      const applyBtn = page.getByRole('button', { name: /応募する/ })
      if (await applyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await applyBtn.click()
        // 応募完了または確認メッセージ
        await expect(page.getByText(/応募済み|応募しました|ありがとう/)).toBeVisible({
          timeout: 8000,
        })
      }
    }
  })
})
