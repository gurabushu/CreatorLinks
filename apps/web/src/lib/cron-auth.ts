// Cron / 内部エンドポイント用の共通認証ヘルパー。
// - 本番では CRON_SECRET が未設定なら常に拒否（fail-closed）
// - Vercel Cron は Authorization: Bearer <CRON_SECRET> を送る
// - dev / preview は CRON_SECRET なしでも通す（手動テスト用）

const isProd = process.env.NODE_ENV === 'production'

export type CronAuthResult = { ok: true } | { ok: false; status: number; error: string }

export function checkCronAuth(req: Request): CronAuthResult {
  const secret = process.env.CRON_SECRET

  if (isProd) {
    // 本番: secret 必須 + 一致必須
    if (!secret) {
      return {
        ok: false,
        status: 500,
        error: 'CRON_SECRET が未設定です（本番環境）',
      }
    }
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${secret}`) {
      return { ok: false, status: 401, error: 'unauthorized' }
    }
    return { ok: true }
  }

  // dev / preview: secret が設定されているときだけチェック
  if (secret) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${secret}`) {
      return { ok: false, status: 401, error: 'unauthorized' }
    }
  }
  return { ok: true }
}
