// アプリの公開 URL を解決する共通ヘルパー。
// - サーバー / クライアント / build 時 いずれからも安全に呼べる (依存なし)
// - 招待 URL / メール本文 / OGP canonical / sitemap で localhost が漏れる事故を防ぐ多段防御
//
// 解決順:
//   1. NEXT_PUBLIC_APP_URL (明示設定・カスタムドメイン設定時に使用)
//   2. VERCEL_PROJECT_PRODUCTION_URL (Vercel 自動注入・stable prod alias)
//   3. VERCEL_URL (Vercel 自動注入・per-deployment URL)
//   4. http://localhost:3000 (local dev)
export function resolveAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}
