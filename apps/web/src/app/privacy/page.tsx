// プライバシーポリシー
// 個人情報保護法（改正個人情報保護法・2022 施行）に基づく通知事項をカバー。
// 決済 (Stripe / RevenueCat) 、認証 (Google) 、その他 SaaS への第三者提供を明記。

export const metadata = {
  title: 'プライバシーポリシー',
}

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-2">プライバシーポリシー</h1>
      <p className="text-sm text-gray-500 mb-8">最終更新日：2026-08-11</p>

      <p className="text-sm text-gray-700 mb-8 leading-relaxed">
        【要記入：事業者名】（以下「当社」といいます。）は、本サービスにおける個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます。）を定めます。
      </p>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">1. 取得する個人情報</h2>
        <p className="text-sm text-gray-800 leading-relaxed mb-2">当社は、本サービスの提供にあたり以下の情報を取得します。</p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800 leading-relaxed">
          <li>登録時にご入力いただく情報：メールアドレス、氏名または表示名、パスワード（ハッシュ化して保管）</li>
          <li>プロフィール情報：自己紹介、ジャンル・楽器タグ、活動年数、身長・性別（任意）、アバター画像、カバー画像</li>
          <li>ポートフォリオ情報：画像・音声・動画ファイル、タイトル、説明</li>
          <li>マッチング・チャット・レビュー情報：やり取りの内容、評価</li>
          <li>決済関連情報：Stripe / RevenueCat 経由の課金履歴、Stripe Connect アカウント ID（アーティストのみ）。<strong>クレジットカード情報は当社サーバーには保存されず、決済代行会社側で保管されます。</strong></li>
          <li>認証情報：Google OAuth 経由でログインした場合、Google が公開する氏名・メールアドレス・アバター URL</li>
          <li>アクセスログ：IP アドレス、User-Agent、リファラ、Cookie、閲覧履歴</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">2. 利用目的</h2>
        <p className="text-sm text-gray-800 leading-relaxed mb-2">取得した個人情報は以下の目的で利用します。</p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800 leading-relaxed">
          <li>本サービスの提供・運営（アカウント認証、マッチング、決済、チャット、レビュー等）</li>
          <li>ユーザーからのお問い合わせ対応</li>
          <li>本サービスに関する重要なお知らせ・機能追加のご案内</li>
          <li>利用状況の分析、機能改善、不正利用の検出</li>
          <li>統計データの作成（個人を識別できない形式に加工したもの）</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">3. 第三者提供</h2>
        <p className="text-sm text-gray-800 leading-relaxed mb-2">
          当社は、次の場合を除き、あらかじめユーザー本人の同意を得ることなく個人情報を第三者に提供しません。
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800 leading-relaxed">
          <li>法令に基づく場合</li>
          <li>人の生命・身体・財産の保護のために必要で、本人同意を得ることが困難な場合</li>
          <li>マッチング・案件成立に必要な範囲で、当事者間で表示名・プロフィール・メッセージ・案件内容が共有される場合</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">4. 業務委託先（外部サービス）</h2>
        <p className="text-sm text-gray-800 leading-relaxed mb-2">
          当社は、本サービスを提供するために以下の外部サービスを利用しており、必要な範囲で個人情報を取り扱わせています。各サービス提供者のプライバシーポリシーもあわせてご確認ください。
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2 border-b">サービス</th>
                <th className="text-left p-2 border-b">用途</th>
                <th className="text-left p-2 border-b">所在地</th>
              </tr>
            </thead>
            <tbody className="text-gray-800">
              <tr><td className="p-2 border-b">Vercel Inc.</td><td className="p-2 border-b">ホスティング</td><td className="p-2 border-b">米国</td></tr>
              <tr><td className="p-2 border-b">Railway Corp.</td><td className="p-2 border-b">データベース</td><td className="p-2 border-b">米国</td></tr>
              <tr><td className="p-2 border-b">Vercel Blob</td><td className="p-2 border-b">画像・音声・動画の保管</td><td className="p-2 border-b">米国</td></tr>
              <tr><td className="p-2 border-b">Stripe, Inc.</td><td className="p-2 border-b">案件代金決済・本人確認</td><td className="p-2 border-b">米国／日本</td></tr>
              <tr><td className="p-2 border-b">RevenueCat, Inc.</td><td className="p-2 border-b">PRO サブスク決済</td><td className="p-2 border-b">米国</td></tr>
              <tr><td className="p-2 border-b">Google LLC</td><td className="p-2 border-b">OAuth 認証</td><td className="p-2 border-b">米国</td></tr>
              <tr><td className="p-2 border-b">Resend Inc.</td><td className="p-2 border-b">メール配信</td><td className="p-2 border-b">米国</td></tr>
              <tr><td className="p-2 border-b">Pusher Ltd.</td><td className="p-2 border-b">リアルタイム通信</td><td className="p-2 border-b">英国</td></tr>
              <tr><td className="p-2 border-b">Upstash Inc.</td><td className="p-2 border-b">レートリミット</td><td className="p-2 border-b">米国</td></tr>
              <tr><td className="p-2 border-b">Inngest Inc.</td><td className="p-2 border-b">バックグラウンドジョブ</td><td className="p-2 border-b">米国</td></tr>
              <tr><td className="p-2 border-b">Functional Software, Inc. (Sentry)</td><td className="p-2 border-b">エラー監視</td><td className="p-2">米国</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          ※ 外部送信される情報の範囲、越境移転の同意については、それぞれのサービスの公式ドキュメントを参照ください。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">5. Cookie 等の利用</h2>
        <p className="text-sm text-gray-800 leading-relaxed">
          本サービスは、ログイン状態の維持および利用状況の分析のために Cookie を利用します。Cookie の受け入れはブラウザ設定で拒否できますが、その場合本サービスの一部機能をご利用いただけない場合があります。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">6. 保存期間</h2>
        <p className="text-sm text-gray-800 leading-relaxed">
          個人情報は利用目的の達成に必要な期間保存し、目的達成後は速やかに削除または匿名化します。ただし、法令上の保存義務がある情報（会計記録等）については当該法令の定める期間保存します。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">7. 開示・訂正・削除の請求</h2>
        <p className="text-sm text-gray-800 leading-relaxed">
          ユーザーは、当社に対して自身の個人情報の開示、訂正、追加、削除、利用停止、消去、第三者提供の停止を請求できます。請求は下記お問い合わせ窓口までご連絡ください。当社は本人確認のうえ、法令に従い遅滞なく対応します。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">8. アカウント削除</h2>
        <p className="text-sm text-gray-800 leading-relaxed">
          ユーザーは、いつでもアカウント削除を請求できます。アカウント削除後、個人を識別する情報は速やかに削除されますが、他ユーザーとの取引履歴・メッセージ・レビューについては、他ユーザーの権利保護の観点から匿名化のうえ一定期間保存する場合があります。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">9. 改定</h2>
        <p className="text-sm text-gray-800 leading-relaxed">
          当社は、必要に応じて本ポリシーを改定することがあります。改定後の内容は本サービス上に掲示した時点から適用されます。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">10. お問い合わせ窓口</h2>
        <p className="text-sm text-gray-800 leading-relaxed">
          個人情報の取扱いに関するお問い合わせは以下までお願いします。
        </p>
        <p className="text-sm text-gray-800 leading-relaxed mt-2">
          【要記入：事業者名】<br />
          個人情報保護管理者：【要記入：担当者氏名】<br />
          メール：【要記入：privacy@example.com など】
        </p>
      </section>

      <p className="text-xs text-gray-500 mt-12">以上</p>
    </div>
  )
}
