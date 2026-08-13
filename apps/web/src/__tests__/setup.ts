// Vitest グローバルセットアップ（web）
// 個別テストで必要なモックは各ファイルの vi.mock() で行う（テスト対象が広いため集中定義しない）

// Stripe SDK 初期化に必要な最低限の環境変数を用意（実際のリクエストはテスト側でモック）
process.env.STRIPE_SECRET_KEY ??= 'sk_test_dummy_for_vitest'
process.env.STRIPE_WEBHOOK_SECRET ??= 'whsec_dummy_for_vitest'
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000'
