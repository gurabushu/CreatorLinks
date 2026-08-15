// 見積書 (quote / estimate) 印刷ページ。受注者が発注者に対して発行する体裁。
// Match APPLIED〜ACCEPTED の間で意味を持つ（承諾前の金額提示）。閲覧はいつでも可。

import { notFound, redirect } from 'next/navigation'
import { loadDocumentMatch } from '../documents/loader'
import { DocumentFrame } from '../documents/document-frame'
import { getDisplayName } from '@/lib/user'
import { SITE_NAME } from '@/lib/brand'

export const dynamic = 'force-dynamic'
export const metadata = { title: '見積書' }

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tokyo',
  }).format(d)
}

export default async function QuotePage({
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

  const issuedAt = match.createdAt
  // 有効期限 = 発行から 14 日
  const expiresAt = new Date(issuedAt.getTime() + 14 * 24 * 60 * 60 * 1000)

  return (
    <DocumentFrame title={`見積書 - ${project.title}`}>
      <div className="flex items-start justify-between mb-8 border-b pb-4 border-gray-300">
        <div>
          <h2 className="text-2xl font-bold tracking-wide">見 積 書</h2>
          <p className="text-xs text-gray-500 mt-1">Quotation</p>
        </div>
        <div className="text-right text-xs text-gray-600">
          <p>発行日: {fmtDate(issuedAt)}</p>
          <p>有効期限: {fmtDate(expiresAt)}</p>
          <p>見積書番号: QUO-{match.id.slice(-8).toUpperCase()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div>
          <p className="text-xs text-gray-500 mb-1">お見積先</p>
          <p className="font-bold text-base">{getDisplayName(client)} 様</p>
          {client.email && <p className="text-xs text-gray-600 mt-1">{client.email}</p>}
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">お見積元</p>
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

      {project.description && (
        <div className="mb-6">
          <p className="text-xs text-gray-500 mb-2">依頼内容</p>
          <div className="text-xs text-gray-700 whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded p-3 max-h-64 overflow-hidden">
            {project.description}
          </div>
        </div>
      )}

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
        </tbody>
        <tfoot>
          <tr className="border-y-2 border-gray-800">
            <td className="py-3 font-bold text-right pr-3">お見積合計（税込）</td>
            <td className="text-right py-3 font-bold text-lg tabular-nums">
              ¥{amounts.amountYen.toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="text-xs text-gray-600 space-y-1 mb-6">
        <p>お支払い方法: {SITE_NAME} 上での Stripe エスクロー決済（納品確認後に受注者へ送金）</p>
        <p>プラットフォーム手数料 7% は受注者受取額から差し引かれます</p>
        <p>本見積は上記有効期限内でのご発注に限り有効です</p>
      </div>

      <div className="pt-4 border-t border-gray-200 text-[11px] text-gray-500">
        <p>本書は {SITE_NAME} 上での取引に基づき、プラットフォーム側で自動生成されています。</p>
      </div>
    </DocumentFrame>
  )
}
