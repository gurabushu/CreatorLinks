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
            3. プラットフォーム利用料（¥{amounts.platformFeeYen.toLocaleString()}）は
            乙の受取額から差し引かれるものとし、乙の実受取額は{' '}
            <span className="font-bold">¥{amounts.artistPayoutYen.toLocaleString()}</span> となる。
            なお利用料は通常 委託料の 7% であり、乙が {SITE_NAME} PRO 会員である場合は 5% に減額される。
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
          <li>
            4. 甲による修正指示（リテイク）の回数、範囲および期限は、事前に甲乙間チャット等で合意した内容による。
            合意がない場合、業務内容として通常想定される範囲を上限とする。
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
          第 5 条（成果物の権利・著作権および実演家人権）
        </h3>
        <ul className="text-sm space-y-1">
          <li>
            1. 成果物に関する著作権、著作隣接権、実演家人権その他の知的財産権の帰属および利用範囲は、
            {' '}{SITE_NAME} 上の甲乙間チャット等で別途合意した内容による。
          </li>
          <li>
            2. 明示的な合意がない場合、著作権は原始的に乙に帰属し、甲は本業務の目的の範囲に限り
            成果物を利用できるものとする。二次利用（配信・広告・物販・二次配布・音源のリマスタリング再頒布等）は
            事前に乙の書面による同意（{SITE_NAME} 上のメッセージを含む）を必要とする。
          </li>
          <li>
            3. 実演家（演奏者・歌唱者等）としての権利（実演家人権、実演の録音・録画・複製・送信可能化等の許諾権）は、
            乙が原始的に有する。甲は本業務の目的の範囲で当該権利の利用許諾を得るものとする。
          </li>
        </ul>
      </section>

      <section className="mb-5">
        <h3 className="font-bold text-sm border-b border-gray-300 pb-1 mb-2">第 6 条（秘密保持）</h3>
        <ul className="text-sm space-y-1">
          <li>
            1. 甲乙は、本業務の遂行に際し相手方から開示された技術情報・営業情報・楽曲データ・未発表音源
            その他一切の情報を秘密として扱い、相手方の事前の書面による同意なく第三者に開示または漏洩してはならない。
          </li>
          <li>
            2. 本条の義務は本契約終了後 3 年間存続する。
          </li>
        </ul>
      </section>

      <section className="mb-5">
        <h3 className="font-bold text-sm border-b border-gray-300 pb-1 mb-2">第 7 条（損害賠償・免責）</h3>
        <ul className="text-sm space-y-1">
          <li>
            1. 甲または乙が本契約に違反し相手方に損害を与えた場合、当該当事者は現実に発生した通常損害の範囲で
            賠償する責任を負う。ただし賠償額の上限は本契約の委託料と同額とする。
          </li>
          <li>
            2. {SITE_NAME}（プラットフォーム提供者）は、甲乙間の紛争について仲介の努力を行うが、
            成果物の内容・品質・納期に関する最終的な責任は負わない。
          </li>
        </ul>
      </section>

      <section className="mb-5">
        <h3 className="font-bold text-sm border-b border-gray-300 pb-1 mb-2">第 8 条（反社会的勢力の排除）</h3>
        <p className="text-sm">
          甲および乙は、自らが暴力団、暴力団員、その他反社会的勢力に該当せず、
          かつ将来にわたっても該当しないことを表明し保証する。相手方が本条に違反した場合、
          相手方は何らの催告を要せず本契約を解除できる。
        </p>
      </section>

      <section className="mb-5">
        <h3 className="font-bold text-sm border-b border-gray-300 pb-1 mb-2">第 9 条（準拠法・裁判管轄）</h3>
        <ul className="text-sm space-y-1">
          <li>1. 本契約の準拠法は日本法とする。</li>
          <li>
            2. 本契約に関して紛争が生じた場合、東京簡易裁判所または東京地方裁判所を第一審の
            専属的合意管轄裁判所とする。
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h3 className="font-bold text-sm border-b border-gray-300 pb-1 mb-2">第 10 条（協議事項）</h3>
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
