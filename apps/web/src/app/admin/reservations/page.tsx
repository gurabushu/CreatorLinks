// /admin/reservations — 事前登録 (EarlyBirdReservation) の一覧 + CSV bulk import
// Admin 専用。Google Form → CSV ダウンロードした結果を import する運用。

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { listReservationsAction } from '@/server/actions/admin-reservations'
import { EARLY_BIRD_TOTAL } from '@/lib/early-bird'
import { formatDate } from '@/lib/utils'
import { CsvImportForm } from './csv-import-form'

export const dynamic = 'force-dynamic'

export default async function AdminReservationsPage() {
  const session = await auth()
  if (!session) redirect('/auth')
  if (session.user.role !== 'ADMIN') redirect('/')

  const reservations = await listReservationsAction()
  const used = reservations.length
  const claimed = reservations.filter((r) => r.claimedAt !== null).length
  const unclaimed = used - claimed
  const remaining = Math.max(0, EARLY_BIRD_TOTAL - used)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">事前登録 (創設メンバー枠)</h1>
      <p className="text-sm text-gray-500 mb-6">
        Google Form の回答を CSV で bulk import。投稿順に 1〜{EARLY_BIRD_TOTAL} のスロットを自動採番。
      </p>

      {/* サマリ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <SummaryCard label="予約済 / 定員" value={`${used} / ${EARLY_BIRD_TOTAL}`} />
        <SummaryCard label="残り枠" value={`${remaining}`} highlight />
        <SummaryCard label="サインアップ済" value={`${claimed}`} />
        <SummaryCard label="未サインアップ" value={`${unclaimed}`} />
      </div>

      {/* CSV import */}
      <section className="border border-gray-200 rounded-2xl p-6 mb-8 bg-white">
        <h2 className="text-lg font-bold text-gray-900 mb-2">CSV で一括登録</h2>
        <p className="text-xs text-gray-500 mb-4">
          ヘッダ必須。<code className="bg-gray-100 px-1 rounded">email,name,primaryInstrument</code> の順。
          既存 email は skip、100 名到達以降は reject されます。
        </p>
        <CsvImportForm />
      </section>

      {/* 一覧 */}
      <section className="border border-gray-200 rounded-2xl bg-white overflow-hidden">
        <h2 className="text-lg font-bold text-gray-900 px-6 py-4 border-b border-gray-200">
          登録一覧
        </h2>
        {reservations.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 text-center">まだ事前登録はありません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600">
                <tr>
                  <th className="text-left px-4 py-2">#</th>
                  <th className="text-left px-4 py-2">Email</th>
                  <th className="text-left px-4 py-2">お名前</th>
                  <th className="text-left px-4 py-2">楽器 / ジャンル</th>
                  <th className="text-left px-4 py-2">登録日</th>
                  <th className="text-left px-4 py-2">サインアップ</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                    <td className="px-4 py-2 font-mono text-xs text-gray-500">
                      #{String(r.reservedSlot).padStart(3, '0')}
                    </td>
                    <td className="px-4 py-2 truncate max-w-[220px]">{r.email}</td>
                    <td className="px-4 py-2 truncate max-w-[140px]">{r.name}</td>
                    <td className="px-4 py-2 text-xs text-gray-600 truncate max-w-[160px]">
                      {r.primaryInstrument ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(r.createdAt)}
                    </td>
                    <td className="px-4 py-2 text-xs whitespace-nowrap">
                      {r.claimedAt ? (
                        <span className="text-emerald-700 font-semibold">✓ {formatDate(r.claimedAt)}</span>
                      ) : (
                        <span className="text-gray-400">未</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-lg p-4 text-center ${
        highlight ? 'bg-purple-600 text-white' : 'bg-gray-50 border border-gray-200'
      }`}
    >
      <div className={`text-xs ${highlight ? 'text-purple-100' : 'text-gray-500'}`}>{label}</div>
      <div className={`text-2xl font-bold ${highlight ? 'text-white' : 'text-gray-900'}`}>{value}</div>
    </div>
  )
}
