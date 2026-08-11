// 利用規約
// 音楽業界特化マッチング + ミニ DX（Stripe Connect 案件代金 + RevenueCat PRO サブスク）を前提とした構成。
// 事業者名は【要記入】プレースホルダー。細部（施行日、管轄裁判所）も同様。

export const metadata = {
  title: '利用規約',
}

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-2">利用規約</h1>
      <p className="text-sm text-gray-500 mb-8">最終更新日：2026-08-11</p>

      <p className="text-sm text-gray-700 mb-8 leading-relaxed">
        この利用規約（以下「本規約」といいます。）は、【要記入：事業者名】（以下「当社」といいます。）が提供するマッチング＋決済プラットフォーム（以下「本サービス」といいます。）の利用条件を定めるものです。
        本サービスを利用するすべての方（以下「ユーザー」といいます。）は、本規約に同意のうえ利用するものとします。
      </p>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">第 1 条（適用）</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-800 leading-relaxed">
          <li>本規約は、本サービスの提供条件および利用に関する当社とユーザーとの間の一切の関係に適用されます。</li>
          <li>当社が本サービス上に掲載する個別規定・ガイドライン等（プライバシーポリシーを含む。）は本規約の一部を構成します。</li>
          <li>本規約と個別規定に矛盾がある場合、特段の定めがない限り個別規定が優先します。</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">第 2 条（定義）</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-800 leading-relaxed">
          <li>「アーティスト」とは、本サービスに登録し、案件を受注する意思のあるユーザーをいいます。</li>
          <li>「依頼主」とは、本サービスに案件を掲載し、アーティストに発注するユーザーをいいます。</li>
          <li>「案件」とは、依頼主がアーティストに委託する演奏・制作・出演等の業務単位をいいます。</li>
          <li>「マッチ」とは、アーティストと依頼主の間で案件について合意が成立した状態をいいます。</li>
          <li>「PRO プラン」とは、月額課金により追加機能・優先表示を利用できる有料プランをいいます。</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">第 3 条（利用登録）</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-800 leading-relaxed">
          <li>本サービスの利用を希望する方は、本規約に同意のうえ、当社の定める方法により利用登録を申請するものとします。</li>
          <li>当社は、以下のいずれかに該当する場合、利用登録の申請を承認しないことができ、その理由については開示義務を負いません。
            <ul className="list-disc pl-5 mt-1 space-y-1 text-gray-700">
              <li>虚偽の情報を届け出た場合</li>
              <li>過去に本規約違反等により利用停止措置を受けたことがある場合</li>
              <li>その他、当社が利用登録を相当でないと判断した場合</li>
            </ul>
          </li>
          <li>登録者は 13 歳以上とし、未成年者は法定代理人の同意を得るものとします。</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">第 4 条（アカウント管理）</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-800 leading-relaxed">
          <li>ユーザーは、自己の責任においてログイン ID およびパスワードを適切に管理するものとします。</li>
          <li>ユーザーは、ID・パスワードを第三者に譲渡・貸与・共用してはなりません。</li>
          <li>ID・パスワードの管理不十分により生じた損害の責任はユーザーが負い、当社は責任を負いません。</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">第 5 条（禁止事項）</h2>
        <p className="text-sm text-gray-800 leading-relaxed mb-2">
          ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800 leading-relaxed">
          <li>法令または公序良俗に違反する行為</li>
          <li>犯罪行為に関連する行為</li>
          <li>他のユーザー、第三者または当社の権利・名誉・プライバシー・信用等を侵害する行為</li>
          <li>虚偽の情報を掲載する行為（他人へのなりすまし、経歴詐称を含む）</li>
          <li>本サービスの決済経路を回避して当事者間で直接取引を行い、当社のプラットフォーム手数料を免れる行為</li>
          <li>スパム行為、勧誘行為、宣伝行為（本サービスの利用目的と関係のないもの）</li>
          <li>本サービスの運営を妨害する行為（過度な負荷、リバースエンジニアリング、脆弱性の悪用を含む）</li>
          <li>反社会的勢力に対して直接・間接に利益を供与する行為</li>
          <li>その他、当社が不適切と判断する行為</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">第 6 条（案件代金の決済）</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-800 leading-relaxed">
          <li>依頼主は、案件マッチ成立後、本サービスの決済経路（Stripe Checkout）を通じて案件代金を支払うものとします。</li>
          <li>支払われた案件代金は、当社が指定する決済事業者を通じて一時的に保管され、アーティストによる納品および依頼主による検収完了後にアーティストへ送金されます（以下「検収後支払い」といいます。）。</li>
          <li>検収完了後 7 日を経過しても紛争がない場合、当社は当該案件代金をアーティストへ自動送金します。依頼主が上記期間内に手動で送金確定を行うこともできます。</li>
          <li>プラットフォーム手数料は案件代金の 7% とし、案件代金から控除した残額をアーティストに送金します。</li>
          <li>アーティストは、本サービスにおいて代金を受領するために、Stripe Connect アカウントの本人確認（KYC）および銀行口座登録を完了するものとします。</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">第 7 条（キャンセル・紛争）</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-800 leading-relaxed">
          <li>依頼主は、納品完了前であれば案件をキャンセルすることができ、支払済み代金は全額返金されます。</li>
          <li>納品完了後のキャンセルは原則として受け付けませんが、当事者間の合意がある場合はこの限りではありません。</li>
          <li>納品物の内容や品質について当事者間で争いが生じた場合、当社は必要に応じて仲介を行いますが、最終的な解決は当事者間の協議によるものとします。</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">第 8 条（PRO プラン）</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-800 leading-relaxed">
          <li>PRO プランは月額 ¥980（税込）のサブスクリプションで、決済成功をもって当月分の利用権が付与されます。</li>
          <li>PRO プランは、解約手続きを行わない限り毎月自動更新されます。</li>
          <li>解約はダッシュボードから随時可能で、解約後は次回課金が停止します。既に課金済みの当月分は原則として返金されません。</li>
          <li>創設メンバー枠等の無料期間・特別プランについては、本サービス上に掲示する条件に従います。</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">第 9 条（知的財産権）</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-800 leading-relaxed">
          <li>本サービスに関する著作権・商標権その他の知的財産権は、当社または正当な権利者に帰属します。</li>
          <li>ユーザーが本サービスに投稿したコンテンツ（プロフィール文、ポートフォリオ、メッセージ等）の著作権は投稿者に帰属します。ユーザーは当社に対して、本サービスの提供・運営・宣伝に必要な範囲で当該コンテンツを無償・非独占的に利用する権利を許諾するものとします。</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">第 10 条（免責事項）</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-800 leading-relaxed">
          <li>当社は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティ等に関する欠陥、エラーやバグ、権利侵害等）がないことを明示的にも黙示的にも保証しません。</li>
          <li>当社は、本サービスに起因してユーザーに生じたあらゆる損害について、当社の故意または重過失による場合を除き、責任を負いません。</li>
          <li>当社は、本サービスを通じて成立した案件の内容・履行・成果物の品質については責任を負わず、当事者間の責任において解決するものとします。</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">第 11 条（サービスの中断・変更・終了）</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-800 leading-relaxed">
          <li>当社は、以下のいずれかに該当する場合、ユーザーに事前通知することなく本サービスの提供を中断できます。
            <ul className="list-disc pl-5 mt-1 space-y-1 text-gray-700">
              <li>本サービスに係るシステムの保守・点検・更新を行う場合</li>
              <li>地震、落雷、火災、停電、天災、通信回線の事故等により提供が困難となった場合</li>
              <li>その他、当社が中断を必要と判断した場合</li>
            </ul>
          </li>
          <li>当社は、事前告知のうえ本サービスの内容を変更または提供を終了することがあります。</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">第 12 条（規約の変更）</h2>
        <p className="text-sm text-gray-800 leading-relaxed">
          当社は、必要と判断した場合、ユーザーに通知のうえ本規約を変更できます。変更後の規約は、当社が本サービス上に掲示した時点から効力を生じます。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">第 13 条（準拠法・管轄）</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-800 leading-relaxed">
          <li>本規約の解釈にあたっては、日本法を準拠法とします。</li>
          <li>本サービスに関して紛争が生じた場合、【要記入：東京地方裁判所 等】を第一審の専属的合意管轄裁判所とします。</li>
        </ol>
      </section>

      <p className="text-xs text-gray-500 mt-12">以上</p>
    </div>
  )
}
