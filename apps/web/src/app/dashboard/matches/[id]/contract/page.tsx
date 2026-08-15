// 契約書 (contract) 印刷ページ。Match ACCEPTED 時点で両者合意した内容を明文化した体裁。
// 電子契約サービスではないため法的効力は限定的だが、業務委託の合意書として使える。

import { notFound, redirect } from 'next/navigation'
import { loadDocumentMatch } from '../documents/loader'
import { DocumentFrame } from '../documents/document-frame'
import { getDisplayName } from '@/lib/user'
import { SITE_NAME } from '@/lib/brand'

export const dynamic = 'force-dynamic'
export const metadata = { title: '業務委託契約書' }

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tokyo',
  }).format(d)
}

export default async function ContractPage({
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

  return (
    <DocumentFrame title={`業務委託契約書 - ${project.title}`}>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold tracking-widest">業務委託契約書</h2>
        <p className="text-xs text-gray-500 mt-2">
          契約書番号: CTR-{match.id.slice(-8).toUpperCase()} / 発行日: {fmtDate(match.createdAt)}
        </p>
      </div>

      <div className="mb-6 text-sm leading-relaxed">
        <p>
          発注者 <span className="font-bold">{getDisplayName(client)}</span>（以下「甲」）と、受注者{' '}
          <span className="font-bold">{getDisplayName(artist)}</span>（以下「乙」）は、
          以下の内容で業務委託契約を締結する。
        </p>
      </div>

      <section className="mb-5">
        <h3 className="font-bold text-sm border-b border-gray-300 pb-1 mb-2">第 1 条（業務内容）</h3>
        <p className="text-sm">乙は甲に対し、以下の業務を提供する。</p>
        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded text-sm">
          <p className="font-bold">{project.title}</p>
          {project.description && (
            <p className="text-xs text-gray-700 whitespace-pre-wrap mt-2">{project.description}</p>
          )}
        </div>
      </section>

      <section className="mb-5">
        <h3 className="font-bold text-sm border-b border-gray-300 pb-1 mb-2">第 2 条（委託料）</h3>
        <ul className="text-sm space-y-1">
          <li>
            1. 甲は乙に対し、本業務の対価として金{' '}
            <span className="font-bold">¥{amounts.amountYen.toLocaleString()}</span>（税込）を支払う。
          </li>
          <li>
            2. 支払は {SITE_NAME} プラットフォーム経由の Stripe エスクロー決済により、
            納品確認後に乙の登録口座へ送金される。
          </li>
          <li>
            3. プラットフォーム利用料 7%（¥{amounts.platformFeeYen.toLocaleString()}）は
            乙の受取額から差し引かれるものとし、乙の実受取額は{' '}
            <span className="font-bold">¥{amounts.artistPayoutYen.toLocaleString()}</span> となる。
          </li>
        </ul>
      </section>

      <section className="mb-5">
        <h3 className="font-bold text-sm border-b border-gray-300 pb-1 mb-2">第 3 条（納品・検収）</h3>
        <ul className="text-sm space-y-1">
          <li>1. 乙は本業務の成果物を、両者合意の期日までに甲に納品する。</li>
          <li>2. 甲は納品を受けたのち、7 日以内に検収を行う。</li>
          <li>
            3. 検収期間内に甲から異議がない場合、または甲が明示的に検収完了の意思表示をした場合、
            自動的に送金確定 (RELEASED) となる。
          </li>
        </ul>
      </section>

      <section className="mb-5">
        <h3 className="font-bold text-sm border-b border-gray-300 pb-1 mb-2">第 4 条（キャンセル）</h3>
        <ul className="text-sm space-y-1">
          <li>
            1. 本契約成立後、甲の都合による解約は原則不可とし、
            甲の重大事由による場合を除き委託料の返金は行わない。
          </li>
          <li>2. 乙の都合による解約は、業務着手前であれば返金の上で解約可能とする。</li>
        </ul>
      </section>

      <section className="mb-5">
        <h3 className="font-bold text-sm border-b border-gray-300 pb-1 mb-2">
          第 5 条（成果物の権利）
        </h3>
        <ul className="text-sm space-y-1">
          <li>
            1. 成果物に関する著作権その他の知的財産権の帰属は、
            {' '}{SITE_NAME} 上の甲乙間チャット等で別途合意した内容による。
          </li>
          <li>
            2. 明示的な合意がない場合、著作権は原始的に乙に帰属し、
            甲は本業務の目的の範囲でこれを利用できる。
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h3 className="font-bold text-sm border-b border-gray-300 pb-1 mb-2">第 6 条（協議事項）</h3>
        <p className="text-sm">
          本契約に定めのない事項、または本契約の解釈に疑義が生じた場合は、甲乙誠意をもって協議し解決する。
        </p>
      </section>

      <div className="pt-4 border-t border-gray-300 flex items-end justify-between text-sm">
        <div>
          <p className="text-xs text-gray-500">合意成立日: {fmtDate(match.createdAt)}</p>
          <p className="text-[11px] text-gray-500 mt-1">
            本書は {SITE_NAME} 上で甲乙が案件応募 (乙) と応募承諾 (甲) を行った事実に基づき、
            プラットフォーム側で自動生成された取引記録である。
          </p>
        </div>
        <div className="text-right space-y-3">
          <div>
            <p className="text-xs text-gray-500">甲</p>
            <p className="font-bold">{getDisplayName(client)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">乙</p>
            <p className="font-bold">{getDisplayName(artist)}</p>
          </div>
        </div>
      </div>
    </DocumentFrame>
  )
}
