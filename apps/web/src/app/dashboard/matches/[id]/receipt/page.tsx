// 領収書 (receipt) ページ。Stripe が発行する公式領収書 URL に redirect する。
// - Encore 側で独自レイアウトを持たない: 印紙税や電子帳簿保存法の解釈を負わないため、
//   Stripe 側の Hosted Receipt をそのまま利用する
// - Stripe receipt_url は署名付き公開 URL で誰でも閲覧可能なため、
//   ここでは権限判定を loader で行った上で redirect のみ実施

import { notFound, redirect } from 'next/navigation'
import { loadDocumentMatch } from '../documents/loader'
import { getStripe } from '@/lib/stripe'

type Params = { params: Promise<{ id: string }> }

export const dynamic = 'force-dynamic'

export const metadata = { title: '領収書' }

export default async function ReceiptPage({ params }: Params) {
  const { id: matchId } = await params
  const loaded = await loadDocumentMatch(matchId)
  if (!loaded.ok) notFound()

  const { match } = loaded
  const chargeId = match.payment?.stripeChargeId
  if (!chargeId) {
    // 未決済 or Charge id 未取得 (webhook 未到達 / エスクロー保管前)
    notFound()
  }

  // Stripe から Charge を取得して receipt_url を引く。
  // Charge が refunded の場合でも receipt_url は残っており、返金領収書として機能する。
  const stripe = getStripe()
  let receiptUrl: string | null = null
  try {
    const charge = await stripe.charges.retrieve(chargeId)
    receiptUrl = charge.receipt_url ?? null
  } catch {
    // Stripe 到達不能 or Charge 削除 (稀)
    notFound()
  }

  if (!receiptUrl) notFound()
  redirect(receiptUrl)
}
