// 請求書 (invoice) 印刷ページ。受注者が発注者に対して発行する体裁。
// Payment が HELD/RELEASED 以降で意味を持つが、閲覧はいつでも可（金額プレビュー用途）。

import { notFound, redirect } from 'next/navigation'
import { loadDocumentMatch } from '../documents/loader'
import { DocumentFrame } from '../documents/document-frame'
import { getDisplayName } from '@/lib/user'
import { SITE_NAME } from '@/lib/brand'

export const dynamic = 'force-dynamic'
export const metadata = { title: '請求書' }

function fmtDate(d: Date | null): string {
  if (!d) return '—'
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tokyo',
  }).format(d)
}

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await loadDocumentMatch(id)
  if (result.ok === false) {
    if (result.reason === 'unauthorized') redirect('/auth')
    if (result.reason === 'forbidden') redirect('/dashboard/matches')
    notFound()
  }

  const { match, amounts } = result
  const project = match.project!
  const client = project.client
  const artist = match.artist
  const issuedAt = match.payment?.paidAt ?? match.completedAt ?? new Date()

  return (
    <DocumentFrame title={`請求書 - ${project.title}`}>
      <div className="flex items-start justify-between mb-8 border-b pb-4 border-gray-300">
        <div>
          <h2 className="text-2xl font-bold tracking-wide">請 求 書</h2>
          <p className="text-xs text-gray-500 mt-1">Invoice</p>
        </div>
        <div className="text-right text-xs text-gray-600">
          <p>発行日: {fmtDate(issuedAt)}</p>
          <p>請求書番号: INV-{match.id.slice(-8).toUpperCase()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div>
          <p className="text-xs text-gray-500 mb-1">請求先（発注者）</p>
          <p className="font-bold text-base">{getDisplayName(client)} 様</p>
          {client.email && <p className="text-xs text-gray-600 mt-1">{client.email}</p>}
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">請求元（受注者）</p>
          <p className="font-bold text-base">{getDisplayName(artist)}</p>
          {artist.email && <p className="text-xs text-gray-600 mt-1">{artist.email}</p>}
        </div>
      </div>

      <div className="mb-6">
        <p className="text-xs text-gray-500 mb-2">件名</p>
        <p className="font-bold text-base bg-gray-50 border border-gray-200 rounded px-3 py-2">
          {project.title}
        </p>
      </div>

      <table className="w-full mb-6 text-sm">
        <thead>
          <tr className="border-y border-gray-300">
            <th className="text-left py-2 font-medium text-xs text-gray-600">項目</th>
            <th className="text-right py-2 font-medium text-xs text-gray-600 w-32">金額</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-200">
            <td className="py-3">{project.title}</td>
            <td className="text-right py-3 tabular-nums">
              ¥{amounts.amountYen.toLocaleString()}
            </td>
          </tr>
          <tr className="border-b border-gray-200 text-xs text-gray-600">
            <td className="py-2 pl-4">プラットフォーム手数料 (7%)</td>
            <td className="text-right py-2 tabular-nums">
              -¥{amounts.platformFeeYen.toLocaleString()}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="border-y-2 border-gray-800">
            <td className="py-3 font-bold text-right pr-3">受注者お受取り額</td>
            <td className="text-right py-3 font-bold text-lg tabular-nums">
              ¥{amounts.artistPayoutYen.toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="text-xs text-gray-600 space-y-1 mb-6">
        <p>
          お支払い方法:{' '}
          {match.payment
            ? 'Stripe (プラットフォーム経由エスクロー決済)'
            : 'プラットフォーム経由決済（Stripe）'}
        </p>
        {match.payment?.paidAt && <p>入金確認日: {fmtDate(match.payment.paidAt)}</p>}
        {match.payment?.releasedAt && <p>受注者送金日: {fmtDate(match.payment.releasedAt)}</p>}
        <p>ステータス: {match.payment?.status ?? '未決済（見込請求）'}</p>
      </div>

      <div className="pt-4 border-t border-gray-200 text-[11px] text-gray-500">
        <p>本書は {SITE_NAME} 上での取引に基づき、プラットフォーム側で自動生成されています。</p>
        <p>金額の詳細・領収書は Stripe より自動送付される領収書メールをご確認ください。</p>
      </div>
    </DocumentFrame>
  )
}
