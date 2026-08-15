// Stripe Connect (Express) 連携: サーバー側ユーティリティ
// - 依頼主 → アーティスト間の報酬決済に使用（Separate Charges & Transfers 方式）
// - クライアント決済は Platform (自社) が受領してエスクロー保管、完了確認後に Transfer で送金
// - PRO サブスクリプション決済は RevenueCat 側 (lib/revenuecat.ts) を継続利用

import Stripe from 'stripe'

// プラットフォーム手数料率（LP・案件詳細ページ・利用規約と一致させる）
// 通常 7%。受注アーティストが PRO の場合は 5% に減額（PRO 特典）。
// 依頼主の支払総額は変わらず、差 2% がそのままアーティスト受取に上乗せされる。
export const PLATFORM_FEE_RATE = 0.07
export const PLATFORM_FEE_RATE_PRO = 0.05

// アーティスト完了報告後、自動で Transfer をリリースするまでの日数
// この期間中はクライアントが手動で「送金確認」ボタンを押すこともできる
export const AUTO_RELEASE_DAYS = 7

// JPY はゼロデシマル通貨。amount は円単位の整数で扱う。
export const CURRENCY = 'jpy' as const

let cachedClient: Stripe | null = null

/**
 * Stripe クライアントを遅延取得する。
 * サーバー側でのみ呼ぶこと（Node ランタイム必須）。
 * env が未設定なら明示的にエラーを投げる（サイレントに壊れないように）。
 */
export function getStripe(): Stripe {
  if (cachedClient) return cachedClient
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  cachedClient = new Stripe(secretKey, {
    // SDK (stripe@22.4.0) が pin している版に合わせる。TypeScript 型と実 API レスポンスの
    // ズレを防ぐため、アカウント既定版 fallback には頼らず明示指定する。
    apiVersion: '2026-07-29.dahlia',
    typescript: true,
  })
  return cachedClient
}

export type FeeOpts = {
  /** true なら PRO 用の 5% 率を適用（未指定 = 7%）。判定はアーティスト側の役割で行う。 */
  isProArtist?: boolean
  /** 発注側・受注側いずれか一方でも User.isFounderExempt=true のとき true。手数料を 0 にする。 */
  isFounderExempt?: boolean
}

/** 依頼金額から Platform 側の手数料（円・整数）を算出 */
export function calcPlatformFee(amountYen: number, opts?: FeeOpts): number {
  if (opts?.isFounderExempt) return 0
  const rate = opts?.isProArtist ? PLATFORM_FEE_RATE_PRO : PLATFORM_FEE_RATE
  return Math.round(amountYen * rate)
}

/** 依頼金額からアーティスト受取額（円・整数）を算出 */
export function calcArtistPayout(amountYen: number, opts?: FeeOpts): number {
  return amountYen - calcPlatformFee(amountYen, opts)
}
