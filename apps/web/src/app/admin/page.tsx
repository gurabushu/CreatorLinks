// app/admin/page.tsx — 管理画面 (SSR / ADMIN のみ)
//
// ゲスト体験ユーザーの活動を目視で追える構造：
// 1. 全体統計 + ゲスト統計を並置
// 2. 最近登録したゲスト一覧に活動指標 (ポートフォリオ/案件/Match/メッセージ数) を出す
// 3. 「編集して触った」判定は updatedAt > createdAt (init から進んでるか)

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// 相対時刻表示。SSR で now を使うので毎リクエスト再計算される
function relTime(d: Date): string {
  const diffMs = Date.now() - new Date(d).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'たった今'
  if (min < 60) return `${min} 分前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 時間前`
  const day = Math.floor(hr / 24)
  return `${day} 日前`
}

export default async function AdminPage() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') redirect('/')

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  let userCount = 0
  let projectCount = 0
  let matchCount = 0
  let proCount = 0
  let guestActive = 0
  let guestNew24h = 0
  let guestNew7d = 0
  type RecentUser = { id: string; name: string; email: string; role: string; createdAt: Date }
  let recentUsers: RecentUser[] = []
  type GuestRow = {
    id: string
    name: string
    email: string
    createdAt: Date
    updatedAt: Date
    _count: { portfolios: number; projectsAsClient: number; matchesAsArtist: number; sentMessages: number }
  }
  let recentGuests: GuestRow[] = []

  try {
    ;[
      userCount,
      projectCount,
      matchCount,
      proCount,
      guestActive,
      guestNew24h,
      guestNew7d,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.match.count(),
      prisma.user.count({ where: { role: 'PRO' } }),
      prisma.user.count({ where: { isGuest: true } }),
      prisma.user.count({ where: { isGuest: true, createdAt: { gte: dayAgo } } }),
      prisma.user.count({ where: { isGuest: true, createdAt: { gte: weekAgo } } }),
    ])

    recentUsers = await prisma.user.findMany({
      where: { isGuest: false },
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })

    recentGuests = await prisma.user.findMany({
      where: { isGuest: true },
      take: 30,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            portfolios: true,
            projectsAsClient: true,
            matchesAsArtist: true,
            sentMessages: true,
          },
        },
      },
    })
  } catch {
    // DB unreachable — show zeros
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-8">管理画面</h1>

      {/* 統計 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'ユーザー数', value: userCount },
          { label: 'PRO ユーザー', value: proCount },
          { label: '案件数', value: projectCount },
          { label: 'マッチング数', value: matchCount },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border rounded-xl p-5 text-center">
            <p className="text-gray-500 text-sm">{stat.label}</p>
            <p className="text-3xl font-bold text-purple-600">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ゲスト統計 */}
      <div className="bg-purple-50/60 border border-purple-200/60 rounded-2xl p-5 mb-6">
        <div className="flex items-baseline gap-2 mb-3">
          <h2 className="text-lg font-bold text-purple-900">🧪 ゲスト体験ユーザー</h2>
          <span className="text-xs text-purple-700/80">24 時間で自動削除</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '現在アクティブ', value: guestActive },
            { label: '24h 新規', value: guestNew24h },
            { label: '7 日 新規', value: guestNew7d },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-purple-700">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ゲスト活動ファネル: 直近 30 名の recentGuests から集計。
          初期状態のまま消えるゲストを可視化して、体験導線のどこで離脱しているかを把握する。 */}
      {recentGuests.length > 0 && (() => {
        const total = recentGuests.length
        const editedProfile = recentGuests.filter(
          (g) => new Date(g.updatedAt).getTime() - new Date(g.createdAt).getTime() > 5000,
        ).length
        const withPortfolio = recentGuests.filter((g) => g._count.portfolios > 0).length
        const withProject = recentGuests.filter((g) => g._count.projectsAsClient > 0).length
        const withMatch = recentGuests.filter((g) => g._count.matchesAsArtist > 0).length
        const withMessage = recentGuests.filter((g) => g._count.sentMessages > 0).length
        const anyActivity = recentGuests.filter(
          (g) =>
            new Date(g.updatedAt).getTime() - new Date(g.createdAt).getTime() > 5000 ||
            g._count.portfolios > 0 ||
            g._count.projectsAsClient > 0 ||
            g._count.matchesAsArtist > 0 ||
            g._count.sentMessages > 0,
        ).length

        const steps = [
          { label: '登録', value: total, color: 'bg-gray-500' },
          { label: '触った', value: anyActivity, color: 'bg-emerald-500', hint: '編集/PF/案件/Match/msg いずれか' },
          { label: 'プロフィール編集', value: editedProfile, color: 'bg-purple-500' },
          { label: 'ポートフォリオ登録', value: withPortfolio, color: 'bg-indigo-500' },
          { label: '案件作成', value: withProject, color: 'bg-blue-500' },
          { label: 'Match 発生', value: withMatch, color: 'bg-teal-500' },
          { label: 'メッセージ送信', value: withMessage, color: 'bg-pink-500' },
        ]

        return (
          <div className="bg-white border rounded-2xl p-5 mb-10">
            <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
              <h3 className="font-bold text-gray-800">🚀 ゲスト活動ファネル</h3>
              <span className="text-xs text-gray-500">直近 {total} 名のゲストから集計</span>
            </div>
            <ul className="space-y-2">
              {steps.map((step, i) => {
                const prev = i === 0 ? null : steps[i - 1]
                const pctOfTotal = total > 0 ? Math.round((step.value / total) * 100) : 0
                const pctOfPrev =
                  prev && prev.value > 0 ? Math.round((step.value / prev.value) * 100) : null
                return (
                  <li key={step.label} className="flex items-center gap-3">
                    <div className="w-40 shrink-0 text-sm">
                      <div className="font-medium text-gray-800">{step.label}</div>
                      {step.hint && <div className="text-[10px] text-gray-400">{step.hint}</div>}
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden relative">
                      <div
                        className={`${step.color} h-full rounded-full transition-all`}
                        style={{ width: `${pctOfTotal}%` }}
                      />
                      <div className="absolute inset-0 flex items-center px-3 text-xs font-mono text-gray-800">
                        <span className="font-bold">{step.value}</span>
                        <span className="text-gray-500 ml-1">/ {total} 人 ({pctOfTotal}%)</span>
                        {pctOfPrev !== null && (
                          <span className="ml-auto text-[10px] text-gray-500">
                            前段階から {pctOfPrev}%
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
            <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
              各段階の分母は「登録」= 直近 {total} 名。前段階からの残存率も表示。
              「触った」以下の 5 行は排他ではなく重複可 (プロフィール編集した人がメッセージも送っていれば両方カウント)。
            </p>
          </div>
        )
      })()}

      {/* 最近のゲスト活動 */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">最近登録したゲスト（活動指標付き）</h2>
        <p className="text-xs text-gray-500 mb-3">
          「触った」= プロフィール編集・ポートフォリオ登録・案件作成・Match 作成・メッセージ送信 のいずれかがあること。
          初期状態のまま消えるゲストは、体験してもらえていない可能性が高い。
        </p>
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-purple-50/60">
                <tr>
                  <th className="text-left px-4 py-3">名前</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">登録</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">最終更新</th>
                  <th className="text-center px-3 py-3" title="ポートフォリオ数">📁</th>
                  <th className="text-center px-3 py-3" title="作成した案件数">📋</th>
                  <th className="text-center px-3 py-3" title="Match 数（アーティスト側）">🤝</th>
                  <th className="text-center px-3 py-3" title="送信メッセージ数">💬</th>
                  <th className="text-center px-3 py-3" title="触った判定">✨</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentGuests.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center text-gray-500 py-6 text-sm">
                      ゲストは現在いません（配布して待ちましょう）
                    </td>
                  </tr>
                )}
                {recentGuests.map((g) => {
                  // 触った判定: updatedAt が createdAt より 5 秒以上進んでいる、または各種活動がある
                  const initDelta = new Date(g.updatedAt).getTime() - new Date(g.createdAt).getTime()
                  const anyActivity =
                    g._count.portfolios > 0 ||
                    g._count.projectsAsClient > 0 ||
                    g._count.matchesAsArtist > 0 ||
                    g._count.sentMessages > 0
                  const touched = anyActivity || initDelta > 5000
                  return (
                    <tr key={g.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 truncate max-w-[180px]">{g.name}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{relTime(g.createdAt)}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {initDelta > 5000 ? relTime(g.updatedAt) : <span className="text-gray-400">未編集</span>}
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-xs">
                        {g._count.portfolios > 0 ? g._count.portfolios : <span className="text-gray-300">·</span>}
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-xs">
                        {g._count.projectsAsClient > 0 ? g._count.projectsAsClient : <span className="text-gray-300">·</span>}
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-xs">
                        {g._count.matchesAsArtist > 0 ? g._count.matchesAsArtist : <span className="text-gray-300">·</span>}
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-xs">
                        {g._count.sentMessages > 0 ? g._count.sentMessages : <span className="text-gray-300">·</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {touched ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">✓ 触った</span>
                        ) : (
                          <span className="text-xs text-gray-400">未</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 通常ユーザー一覧 */}
      <section>
        <h2 className="text-xl font-bold mb-4">最近登録したユーザー（ゲスト以外）</h2>
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3">名前</th>
                  <th className="text-left px-4 py-3">メール</th>
                  <th className="text-left px-4 py-3">ロール</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">登録日</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 truncate max-w-[180px]">{u.name}</td>
                    <td className="px-4 py-3 text-gray-500 truncate max-w-[220px]">{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          u.role === 'PRO'
                            ? 'bg-amber-100 text-amber-700'
                            : u.role === 'ADMIN'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString('ja-JP')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
