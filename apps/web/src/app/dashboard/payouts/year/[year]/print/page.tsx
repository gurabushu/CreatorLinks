// 年間帳票の印刷特化ページ。全 Match の請求書を 1 ページに縦積みし、
// ブラウザ印刷ダイアログ (Cmd/Ctrl+P) 一発で年間分の請求書 PDF を保存できるようにする。
//
// puppeteer 等の依存を追加せず、既存の print CSS + `page-break-after` だけで実現。
// (見積・契約書まで含めると印刷枚数が 4x になるので、確定申告で最も使う「請求書」に絞る)

import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getDisplayName } from '@/lib/user'
import { SITE_NAME } from '@/lib/brand'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ year: string }> }

function fmtDate(d: Date | null | undefined): string {
  if (!d) return '-'
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tokyo',
  }).format(new Date(d))
}

export default async function YearlyPrintPage({ params }: Params) {
  const { year: yearStr } = await params
  const year = Number(yearStr)
  const nowYear = new Date().getFullYear()
  if (!Number.isInteger(year) || year < 2020 || year > nowYear + 1) notFound()

  const session = await auth()
  if (!session) redirect('/auth')

  const rangeStart = new Date(year, 0, 1)
  const rangeEnd = new Date(year + 1, 0, 1)

  const payments = await prisma.payment.findMany({
    where: {
      match: { artistId: session.user.id },
      status: { in: ['HELD', 'RELEASED', 'REFUNDED'] },
      paidAt: { gte: rangeStart, lt: rangeEnd },
    },
    orderBy: { paidAt: 'asc' },
    select: {
      id: true,
      matchId: true,
      status: true,
      amountYen: true,
      platformFeeYen: true,
      artistPayoutYen: true,
      paidAt: true,
      releasedAt: true,
      match: {
        select: {
          id: true,
          completedAt: true,
          artist: {
            select: { name: true, displayName: true, email: true },
          },
          project: {
            select: {
              title: true,
              client: { select: { name: true, displayName: true, email: true } },
            },
          },
        },
      },
    },
  })

  const totalIncome = payments
    .filter((p) => p.status === 'RELEASED')
    .reduce((sum, p) => sum + p.artistPayoutYen, 0)

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* 操作バー (印刷では非表示) */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <Link
              href={`/dashboard/payouts/year/${year}`}
              className="text-xs text-gray-500 hover:text-purple-700 hover:underline"
            >
              ← 年間帳票一覧に戻る
            </Link>
            <h1 className="text-base font-bold mt-0.5">
              {year} 年 請求書 一括印刷 ({payments.length}件)
            </h1>
          </div>
          <button
            type="button"
            // Server Component 内では onClick 不可のため、form-less native な a[href="javascript:print()"] を使う
            // → sanitizer が嫌うので、代わりに <a> で form-target ではなく別 client island を作るのが本筋。
            //   ここでは <a onclick> ではなく <button> の submit と <script> で対応:
            //   → 最も簡単なのは client component を挟むことなので、シンプルに instructions を出す
            className="hidden"
          />
          <div className="text-xs text-gray-600">
            <p className="hidden sm:block">
              Cmd/Ctrl + P で全ページを 1 つの PDF として保存できます
            </p>
          </div>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="max-w-3xl mx-auto px-4 py-12 text-center text-gray-400">
          {year} 年に支払いが発生した案件はありません。
        </div>
      ) : (
        <>
          {/* 表紙: サマリ (印刷 1 ページ目) */}
          <div className="max-w-3xl mx-auto p-6 sm:p-10 bg-white shadow print:shadow-none my-4 print:my-0 rounded-lg print:rounded-none print:break-after-page">
            <h2 className="text-2xl font-bold mb-2">{year} 年 請求書 一括</h2>
            <p className="text-xs text-gray-500 mb-6">
              {SITE_NAME} 上で受注した案件の請求書を年単位でまとめたもの。確定申告時のバックアップに。
            </p>
            <dl className="grid grid-cols-2 gap-y-3 text-sm">
              <dt className="text-gray-500">発行対象</dt>
              <dd className="font-medium">{getDisplayName({ name: session.user.name, displayName: null })} 様</dd>
              <dt className="text-gray-500">対象期間</dt>
              <dd>{year}/01/01 〜 {year}/12/31</dd>
              <dt className="text-gray-500">請求書件数</dt>
              <dd>{payments.length} 件</dd>
              <dt className="text-gray-500">送金確定件数</dt>
              <dd>{payments.filter((p) => p.status === 'RELEASED').length} 件</dd>
              <dt className="text-gray-500">年間受取合計 (RELEASED)</dt>
              <dd className="font-bold text-purple-700">¥{totalIncome.toLocaleString()}</dd>
            </dl>
          </div>

          {/* 各請求書 (1 件 = 1 ページ) */}
          {payments.map((p) => {
            const artist = p.match.artist
            const client = p.match.project?.client
            const issuedAt = p.paidAt ?? p.match.completedAt ?? new Date()
            return (
              <div
                key={p.id}
                className="max-w-3xl mx-auto p-6 sm:p-10 bg-white shadow print:shadow-none my-4 print:my-0 rounded-lg print:rounded-none print:break-after-page"
              >
                <div className="flex items-start justify-between mb-8 border-b pb-4 border-gray-300">
                  <div>
                    <h2 className="text-2xl font-bold tracking-wide">請 求 書</h2>
                    <p className="text-xs text-gray-500 mt-1">Invoice</p>
                  </div>
                  <div className="text-right text-xs text-gray-600">
                    <p>発行日: {fmtDate(issuedAt)}</p>
                    <p>請求書番号: INV-{p.match.id.slice(-8).toUpperCase()}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">請求先（発注者）</p>
                    <p className="font-bold text-sm">
                      {client ? getDisplayName(client) : '—'} 様
                    </p>
                    {client?.email && (
                      <p className="text-xs text-gray-600 mt-1">{client.email}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">請求元（受注者）</p>
                    <p className="font-bold text-sm">{getDisplayName(artist)}</p>
                    {artist.email && (
                      <p className="text-xs text-gray-600 mt-1">{artist.email}</p>
                    )}
                  </div>
                </div>
                <div className="mb-6">
                  <p className="text-xs text-gray-500 mb-2">件名</p>
                  <p className="font-bold text-sm bg-gray-50 border border-gray-200 rounded px-3 py-2">
                    {p.match.project?.title ?? '（案件情報なし）'}
                  </p>
                </div>
                <table className="w-full mb-6 text-sm">
                  <thead>
                    <tr className="border-y border-gray-300">
                      <th className="text-left py-2 font-medium text-xs text-gray-600">項目</th>
                      <th className="text-right py-2 font-medium text-xs text-gray-600 w-32">
                        金額
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="py-3">{p.match.project?.title ?? '案件'}</td>
                      <td className="text-right py-3 tabular-nums">
                        ¥{p.amountYen.toLocaleString()}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200 text-xs text-gray-600">
                      <td className="py-2 pl-4">プラットフォーム手数料</td>
                      <td className="text-right py-2 tabular-nums">
                        -¥{p.platformFeeYen.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="border-y-2 border-gray-800">
                      <td className="py-3 font-bold text-right pr-3">受注者お受取り額</td>
                      <td className="text-right py-3 font-bold text-lg tabular-nums">
                        ¥{p.artistPayoutYen.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>お支払い方法: Stripe (プラットフォーム経由エスクロー決済)</p>
                  {p.paidAt && <p>入金確認日: {fmtDate(p.paidAt)}</p>}
                  {p.releasedAt && <p>受注者送金日: {fmtDate(p.releasedAt)}</p>}
                  <p>ステータス: {p.status}</p>
                </div>
                <div className="pt-4 mt-6 border-t border-gray-200 text-[11px] text-gray-500">
                  本書は {SITE_NAME} 上での取引に基づき、プラットフォーム側で自動生成されています。
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
