'use server'

// 決済アクション: 停止済み (2026-08-09)
// RevenueCat Web Billing への全面移行に伴い、Stripe Connect エスクロー処理を停止。
// UI からの到達経路は Step 3 で全て消してあるが、defensive として action 側も no-op 化し、
// Payment テーブルへの副作用が発生しないようにする。
//
// 型エクスポート（ReleaseActionResult）は既存 import 元の互換性維持のため保持。
// 物理削除はデータ保管期間後に実施予定（Task 3 Phase 5）。

export type ReleaseActionResult =
  | { success: true }
  | { success: false; error: string }

const RETIRED_MESSAGE = 'この決済機能は終了しました（RevenueCat 移行済み）。'

export async function createCheckoutSessionAction(_matchId: string): Promise<never> {
  throw new Error(RETIRED_MESSAGE)
}

export async function checkPaymentStatusAction(_matchId: string): Promise<void> {
  // 旧 Stripe Checkout からのリダイレクト時に呼ばれていた no-op。
  // 新規決済は発生しないため常に何もしない。
  return
}

export async function releasePaymentAction(_matchId: string): Promise<ReleaseActionResult> {
  return { success: false, error: RETIRED_MESSAGE }
}
