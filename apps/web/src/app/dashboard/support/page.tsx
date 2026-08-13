// /dashboard/support — 公式サポート窓口への redirect ページ
// - サイドバー / Chat ヘッダーの「サポートに問い合わせ」動線からこのルートに来る
// - ユーザーと公式アカウントの P2P Match ID を解決 → /dashboard/chat/[matchId] へ redirect
// - 公式未シード / ゲスト / 公式本人 は /dashboard に fallback

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { ensureSupportMatchId } from '@/lib/support'

export const dynamic = 'force-dynamic'

export default async function SupportRedirectPage() {
  const session = await auth()
  if (!session) redirect('/auth')

  const matchId = await ensureSupportMatchId(session.user.id)
  if (!matchId) redirect('/dashboard')

  redirect(`/dashboard/chat/${matchId}`)
}
