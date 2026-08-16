// プロフィール分析 (PRO 特典) ページ。
// PV / フォロワー / 応募成約率 / 完了件数 を過去 30 日で集計表示。
// PRO 会員 (課金 / Early Bird / hasLifetimeFreePro / isFounderExempt) のみアクセス可。

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { getAnalyticsSummary } from '@/lib/profile-analytics'
import { hasFreeProAccess } from '@/lib/early-bird'

export const metadata: Metadata = { title: 'プロフィール分析' }
export const dynamic = 'force-dynamic'

const WINDOW_DAYS = 30

export default async function AnalyticsPage() {
  const session = await auth()
  if (!session) redirect('/auth?next=' + encodeURIComponent('/dashboard/analytics'))

  // PRO ゲート: 課金 / Early Bird / 永年無料 / 恩人枠 のいずれか
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      earlyBirdSlot: true,
      earlyBirdExpiresAt: true,
      hasLifetimeFreePro: true,
      isFounderExempt: true,
    },
  })
  if (!me) redirect('/auth')

  const isPro = me.role === 'PRO' || hasFreeProAccess(me)
  if (!isPro) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <h1 className="text-xl font-bold mb-2">プロフィール分析 (PRO 特典)</h1>
        <p className="text-gray-500 mb-8">
          このページは PRO 会員限定の特典です。
          <br />
          プロフィールの閲覧数・フォロワー増加・応募成約率が可視化できます。
        </p>
        <Link
          href="/pro/subscribe"
          className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-purple-700 transition"
        >
          PRO プランを見る →
        </Link>
      </div>
    )
  }

  const summary = await getAnalyticsSummary(session.user.id, WINDOW_DAYS)

  return (
    <div className="max-w-5xl mx-auto py-8 sm:py-10 px-4">
      <div className="mb-6">
        <p className="text-xs text-purple-700 font-semibold mb-1">PRO 特典</p>
        <h1 className="text-2xl font-bold">プロフィール分析</h1>
        <p className="text-sm text-gray-500 mt-1">直近 {summary.windowDays} 日間の指標</p>
      </div>

      {/* 主要 KPI 4 枚 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <MetricCard
          label="プロフィール閲覧"
          value={summary.views.total.toLocaleString()}
          unit="回"
          hint={`ログイン ${summary.views.byLoggedIn} · 匿名 ${summary.views.byAnonymous}`}
          tone="purple"
        />
        <MetricCard
          label="ユニーク訪問者 (ログイン)"
          value={summary.views.uniqueLoggedInViewers.toLocaleString()}
          unit="人"
          hint="同一ユーザーは 1 とカウント"
          tone="indigo"
        />
        <MetricCard
          label="新規フォロワー"
          value={summary.follows.gained.toLocaleString()}
          unit="人"
          hint={`現在 ${summary.follows.current} 人`}
          tone="pink"
        />
        <MetricCard
          label="応募成約率"
          value={summary.matches.acceptanceRatePct.toString()}
          unit="%"
          hint={`${summary.matches.accepted}件承認 / ${summary.matches.totalIncoming}件応募`}
          tone="emerald"
        />
      </div>

      {/* Match 内訳 */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">案件成果 (直近 {summary.windowDays} 日)</h2>
        <div className="bg-white border rounded-2xl p-5">
          <dl className="grid grid-cols-3 gap-4 text-center">
            <div>
              <dt className="text-xs text-gray-500 mb-1">総応募/オファー</dt>
              <dd className="text-2xl font-bold text-gray-800">{summary.matches.totalIncoming}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 mb-1">承認 (ACCEPTED+)</dt>
              <dd className="text-2xl font-bold text-emerald-700">{summary.matches.accepted}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 mb-1">完了 (COMPLETED)</dt>
              <dd className="text-2xl font-bold text-blue-700">{summary.matches.completed}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* 使い方ヒント */}
      <div className="text-xs text-gray-500 leading-relaxed">
        <p className="mb-2">
          <span className="font-semibold text-gray-700">PV の記録ルール:</span>{' '}
          ログインユーザーは 1 プロフィール × 30 分に 1 回まで、匿名は同一 IP × 30 分に 1 回までカウント。
          自分自身のアクセスは除外。ゲストプロフィールへの PV は集計対象外。
        </p>
        <p>
          <span className="font-semibold text-gray-700">応募成約率:</span>{' '}
          自分に来た応募 + オファーのうち、承認 (ACCEPTED) 相当以上になった割合。
          チャットで返信するだけでは成約に含まれず、正式承認・進行が判定条件。
        </p>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  unit,
  hint,
  tone,
}: {
  label: string
  value: string
  unit: string
  hint?: string
  tone: 'purple' | 'indigo' | 'pink' | 'emerald'
}) {
  const toneClass = {
    purple: 'text-purple-700 bg-purple-50/60 border-purple-200/60',
    indigo: 'text-indigo-700 bg-indigo-50/60 border-indigo-200/60',
    pink: 'text-pink-700 bg-pink-50/60 border-pink-200/60',
    emerald: 'text-emerald-700 bg-emerald-50/60 border-emerald-200/60',
  }[tone]
  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-xs text-gray-600 font-medium mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <p className="text-3xl font-bold">{value}</p>
        <span className="text-sm">{unit}</span>
      </div>
      {hint && <p className="text-[10px] text-gray-500 mt-2">{hint}</p>}
    </div>
  )
}
