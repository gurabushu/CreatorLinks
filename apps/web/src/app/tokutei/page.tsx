// 特定商取引法に基づく表記
// 有料 PRO サブスクリプション + 案件代金決済（プラットフォーム決済）を扱うため、
// 日本の特定商取引法 第 11 条（通信販売の広告）に基づき表示義務がある項目を明記する。
//
// 【要記入】プレースホルダーは事業者確定時に埋めること。
// 電話番号は「消費者からの請求があれば遅滞なく開示」の運用にする場合、その旨を明記すれば
// 記載省略可（特商法施行規則）。

export const metadata = {
  title: '特定商取引法に基づく表記',
}

type Row = { label: string; value: React.ReactNode }

const rows: Row[] = [
  { label: '販売事業者', value: '【要記入：法人名または屋号／個人事業主氏名】' },
  { label: '運営統括責任者', value: '【要記入：代表者氏名】' },
  {
    label: '所在地',
    value: (
      <>
        【要記入：郵便番号・住所】
        <br />
        <span className="text-xs text-gray-500">
          ※ 個人事業主の場合、消費者からの請求により遅滞なく開示する運用にすれば、上記の記載は
          「請求があった場合、遅滞なく開示いたします」に置き換え可。
        </span>
      </>
    ),
  },
  {
    label: '電話番号',
    value: (
      <>
        【要記入：連絡可能な電話番号】
        <br />
        <span className="text-xs text-gray-500">
          ※ 記載省略の場合は「請求があった場合、遅滞なく開示いたします」と明記。
        </span>
      </>
    ),
  },
  { label: 'メールアドレス', value: '【要記入：support@example.com など】' },
  {
    label: '販売価格',
    value: (
      <>
        <p className="mb-1">
          <strong>PRO プラン：</strong>月額 ¥980（税込）
        </p>
        <p className="mb-1">
          <strong>案件マッチング利用料：</strong>プラットフォーム手数料 7%（依頼主が支払う案件代金より控除、
          残額をアーティストが受領）
        </p>
        <p className="text-xs text-gray-500">
          ※ 案件ごとの代金は依頼主・アーティスト間で個別に合意した金額に基づき、本サービスは手数料のみを徴収します。
        </p>
      </>
    ),
  },
  {
    label: '販売価格以外の必要料金',
    value: (
      <>
        インターネット接続料金・通信料はお客様負担となります。決済に伴う決済代行会社の手数料は本サービスが負担します（別途請求はありません）。
      </>
    ),
  },
  {
    label: '支払方法',
    value: (
      <>
        <p className="mb-1">
          <strong>PRO プラン：</strong>クレジットカード（RevenueCat Web Billing を通じた決済）
        </p>
        <p>
          <strong>案件代金：</strong>クレジットカード（Stripe Checkout を通じた決済）
        </p>
      </>
    ),
  },
  {
    label: '支払時期',
    value: (
      <>
        <p className="mb-1">
          <strong>PRO プラン：</strong>初回課金時、および以降毎月同日に自動課金
        </p>
        <p>
          <strong>案件代金：</strong>依頼主・アーティスト間のマッチング成立後、依頼主による支払い時
        </p>
      </>
    ),
  },
  {
    label: 'サービス提供時期',
    value: (
      <>
        <p className="mb-1">
          <strong>PRO プラン：</strong>決済完了後、直ちに利用可能
        </p>
        <p>
          <strong>案件代金の受領：</strong>依頼主が納品を検収し完了した後、7 日を経過した時点でアーティストへ自動送金（依頼主による手動確定でそれ以前の送金も可）
        </p>
      </>
    ),
  },
  {
    label: '返品・キャンセル',
    value: (
      <>
        <p className="mb-1">
          <strong>PRO プラン：</strong>いつでも解約可能。解約後は次回課金が発生せず、既に課金済みの当月分は返金されません。解約は
          ダッシュボード「サブスクリプション」画面より手続きできます。
        </p>
        <p>
          <strong>案件代金：</strong>納品完了前であればキャンセルによる全額返金が可能です。納品完了後は返金対象外となりますが、当事者間の合意がある場合は個別対応します。争いが生じた場合は本サービス運営が仲介します。
        </p>
      </>
    ),
  },
  {
    label: '動作環境',
    value: (
      <>
        <p className="mb-1">最新版の Google Chrome / Safari / Firefox / Microsoft Edge（PC / スマートフォン）</p>
        <p className="text-xs text-gray-500">※ JavaScript および Cookie を有効にしてご利用ください。</p>
      </>
    ),
  },
]

export default function TokuteiPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-2">特定商取引法に基づく表記</h1>
      <p className="text-sm text-gray-500 mb-8">最終更新日：2026-08-11</p>

      <dl className="border rounded-lg divide-y">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 px-4 sm:px-6 py-4">
            <dt className="text-sm font-medium text-gray-700 sm:col-span-1">{row.label}</dt>
            <dd className="text-sm text-gray-800 sm:col-span-3 leading-relaxed">{row.value}</dd>
          </div>
        ))}
      </dl>

      <p className="text-xs text-gray-500 mt-8">
        本表記は日本の特定商取引法に基づき掲示しています。内容は予告なく変更される場合があります。
      </p>
    </div>
  )
}
