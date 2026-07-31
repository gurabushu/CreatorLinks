import Link from 'next/link'
import {
  EARLY_BIRD_TOTAL,
  EARLY_BIRD_FREE_MONTHS,
  getEarlyBirdRemaining,
} from '@/lib/early-bird'

// トップページ用: 創設メンバー枠（先着 100 名・PRO 6ヶ月無料 + バッジ永久）の残数バナー
// ISR 上で描画され、サインアップ時 revalidatePath('/') で更新される
export async function EarlyBirdBanner() {
  const remaining = await getEarlyBirdRemaining()
  if (remaining === null) return null

  const closed = remaining === 0

  return (
    <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white">
      <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
        <div className="text-center sm:text-left">
          <div className="text-xs sm:text-sm font-semibold tracking-wider opacity-90">
            創設メンバー 先着 {EARLY_BIRD_TOTAL} 名 限定
          </div>
          <div className="text-sm sm:text-lg font-bold">
            PRO {EARLY_BIRD_FREE_MONTHS}ヶ月無料 + 創設メンバーバッジを永久付与
            {closed ? (
              <span className="ml-2 text-xs sm:text-sm font-normal opacity-90">
                （受付終了）
              </span>
            ) : (
              <span className="ml-2 text-xs sm:text-sm font-normal opacity-90">
                残り {remaining} / {EARLY_BIRD_TOTAL} 名
              </span>
            )}
          </div>
        </div>
        {!closed && (
          <Link
            href="/auth"
            className="shrink-0 bg-white text-purple-700 text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2 rounded-full hover:bg-purple-50 transition whitespace-nowrap"
          >
            創設メンバーに登録 →
          </Link>
        )}
      </div>
    </div>
  )
}
