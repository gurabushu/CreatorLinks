// app/admin/page.tsx — 管理画面 (SSR / ADMIN のみ)

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export default async function AdminPage() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') redirect('/')

  let userCount = 0, projectCount = 0, matchCount = 0, proCount = 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let recentUsers: any[] = []
  try {
    ;[userCount, projectCount, matchCount, proCount] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.match.count(),
      prisma.user.count({ where: { role: 'PRO' } }),
    ])
    recentUsers = await prisma.user.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })
  } catch {
    // DB unreachable — show zeros
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-8">管理画面</h1>

      {/* 統計 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'ユーザー数', value: userCount },
          { label: 'PROユーザー', value: proCount },
          { label: '案件数', value: projectCount },
          { label: 'マッチング数', value: matchCount },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border rounded-xl p-5 text-center">
            <p className="text-gray-500 text-sm">{stat.label}</p>
            <p className="text-3xl font-bold text-purple-600">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ユーザー一覧 */}
      <section>
        <h2 className="text-xl font-bold mb-4">最近登録したユーザー</h2>
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3">名前</th>
                <th className="text-left px-4 py-3">メール</th>
                <th className="text-left px-4 py-3">ロール</th>
                <th className="text-left px-4 py-3">登録日</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentUsers.map((u: { id: string; name: string | null; email: string; role: string; createdAt: Date }) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
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
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(u.createdAt).toLocaleDateString('ja-JP')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
