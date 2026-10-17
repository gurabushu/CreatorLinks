// 2026-10-17 fee-only pivot: PRO サブスクを全廃。既存の /pro/subscribe は認証バッジ買切
// (/verify) に恒久リダイレクトし、旧 URL (SNS 投稿・ブックマーク等) からの流入を回収する。

import { redirect } from 'next/navigation'

export default function ProSubscribeRedirect(): never {
  redirect('/verify')
}
