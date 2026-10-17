// 特定商取引法に基づく表記
// 認証バッジ買切 + 案件代金決済（プラットフォーム決済）を扱うため、
// 日本の特定商取引法 第 11 条（通信販売の広告）に基づき表示義務がある項目を明記する。
// 2026-10-17 fee-only pivot: PRO 月額サブスクは全廃、認証バッジ買切に差替。
// 事業者・所在地・電話番号は個人事業主 TobojoLabs のもの。変更時はここを更新する。

export const metadata = {
  title: '特定商取引法に基づく表記',
  alternates: { canonical: '/tokutei' },
}

type Row = { label: string; value: React.ReactNode }

const rows: Row[] = [
  { label: '販売事業者', value: 'TobojoLabs（個人事業主）' },
  { label: '運営統括責任者', value: '沖山敦樹' },
  { label: '所在地', value: '〒181-0002 東京都三鷹市牟礼3-1-7' },
  {
    label: '電話番号',
    value: (
      <>
        090-5822-8434
        <br />
        <span className="text-xs text-gray-500">
          ※ 平日 10:00-18:00 の対応を原則とし、時間外はメールでのご連絡をお願いします。
        </span>
      </>
    ),
  },
  { label: 'メールアドレス', value: 'tonokyama@gmail.com' },
  {
    label: '販売価格',
    value: (
      <>
        <p className="mb-1">
          <strong>認証バッジ：</strong>¥3,000（税込・買切）
        </p>
        <p className="mb-1">
          <strong>案件マッチング利用料：</strong>プラットフォーム手数料 7%（依頼主が支払う案件代金より控除、残額をアーティストが受領）。
        </p>
        <p className="text-xs text-gray-500">
          ※ 認証バッジは一度の購入で永年有効であり、月額課金・自動更新は発生しません。<br />
          ※ 案件ごとの代金は依頼主・アーティスト間で個別に合意した金額に基づき、本サービスは手数料のみを徴収します。
          当事業者の定める Founding Supporter に該当する当事者間取引は、プラットフォーム手数料を免除する場合があります。
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
          <strong>認証バッジ：</strong>クレジットカード（Stripe Checkout を通じた決済）
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
          <strong>認証バッジ：</strong>購入手続き時に一括決済（買切・以降の自動課金は一切ありません）
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
          <strong>認証バッジ：</strong>決済完了後、直ちにプロフィール等に反映（反映に数分かかる場合があります）
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
          <strong>認証バッジ：</strong>決済完了後の購入代金は、当事業者の責めに帰すべき事由がある場合を除き、原則として返金されません。
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
      <p className="text-sm text-gray-500 mb-8">最終更新日：2026-10-17</p>

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
