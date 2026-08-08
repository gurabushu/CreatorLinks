// Stripe Connect (Express) 連携: サーバー側ユーティリティ
// - 依頼主 → アーティスト間の報酬決済に使用（Separate Charges & Transfers 方式）
// - クライアント決済は Platform (自社) が受領してエスクロー保管、完了確認後に Transfer で送金
// - PRO サブスクリプション決済は RevenueCat 側 (lib/revenuecat.ts) を継続利用

import Stripe from 'stripe'

// プラットフォーム手数料率（LP・案件詳細ページの記載と一致させる）
export const PLATFORM_FEE_RATE = 0.07

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
    // apiVersion はアカウントの既定版を使用。将来固定したい場合はここで指定する
    typescript: true,
  })
  return cachedClient
}

/** 依頼金額から Platform 側の手数料（円・整数）を算出 */
export function calcPlatformFee(amountYen: number): number {
  return Math.round(amountYen * PLATFORM_FEE_RATE)
}

/** 依頼金額からアーティスト受取額（円・整数）を算出 */
export function calcArtistPayout(amountYen: number): number {
  return amountYen - calcPlatformFee(amountYen)
}
