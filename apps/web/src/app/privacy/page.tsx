// プライバシーポリシー
// 個人情報保護法（改正個人情報保護法・2022 施行）に基づく通知事項をカバー。
// 決済 (Stripe / RevenueCat) 、認証 (Google) 、その他 SaaS への第三者提供を明記。

export const metadata = {
  title: 'プライバシーポリシー',
  alternates: { canonical: '/privacy' },
}

const OPERATOR_NAME = 'TobojoLabs（個人事業主）'
const REPRESENTATIVE = '沖山敦樹'
const OFFICE_ADDRESS = '〒181-0002 東京都三鷹市牟礼3-1-7'
const CONTACT_EMAIL = 'tonokyama@gmail.com'

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-2">プライバシーポリシー</h1>
      <p className="text-sm text-gray-500 mb-8">最終更新日：2026-08-14</p>

      <p className="text-sm text-gray-700 mb-8 leading-relaxed">
        {OPERATOR_NAME}（以下「当事業者」といいます。）は、本サービスにおける個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます。）を定めます。
      </p>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">1. 取得する個人情報</h2>
        <p className="text-sm text-gray-800 leading-relaxed mb-2">当事業者は、本サービスの提供にあたり以下の情報を取得します。</p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800 leading-relaxed">
          <li>登録時にご入力いただく情報：メールアドレス、氏名または表示名、パスワード（bcrypt でハッシュ化して保管）</li>
          <li>プロフィール情報：自己紹介、ジャンル・楽器タグ、活動年数、身長・性別（任意）、アバター画像、カバー画像</li>
          <li>ポートフォリオ情報：画像・音声・動画ファイル、タイトル、説明</li>
          <li>マッチング・チャット・レビュー情報：やり取りの内容、評価（メッセージ本文は暗号化されず平文で保管され、必要に応じて運営が違反調査等のために閲覧する場合があります）</li>
          <li>決済関連情報：Stripe / RevenueCat 経由の課金履歴、Stripe Connect アカウント ID（アーティストのみ）。<strong>クレジットカード情報は当事業者サーバーには保存されず、決済代行会社側で保管されます。</strong></li>
          <li>認証情報：Google OAuth 経由でログインした場合、Google が公開する氏名・メールアドレス・アバター URL、および OAuth の <code>refresh_token</code> / <code>access_token</code>（当事業者データベースに暗号化した上で保管）</li>
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
          当事業者は、次の場合を除き、あらかじめユーザー本人の同意を得ることなく個人情報を第三者に提供しません。
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
          当事業者は、本サービスを提供するために以下の外部サービスを利用しており、必要な範囲で個人情報を取り扱わせています。各サービス提供者のプライバシーポリシーもあわせてご確認ください。
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
              <tr><td className="p-2 border-b">Pusher Ltd. (Tokyo リージョン)</td><td className="p-2 border-b">リアルタイム通信</td><td className="p-2 border-b">日本</td></tr>
              <tr><td className="p-2 border-b">Upstash Inc.</td><td className="p-2 border-b">レートリミット</td><td className="p-2 border-b">米国</td></tr>
              <tr><td className="p-2 border-b">Inngest Inc.</td><td className="p-2 border-b">バックグラウンドジョブ・通知メール配信</td><td className="p-2 border-b">米国</td></tr>
              <tr><td className="p-2 border-b">Functional Software, Inc. (Sentry)</td><td className="p-2 border-b">エラー監視</td><td className="p-2">米国</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">5. 外国にある第三者への個人情報の提供（越境移転）</h2>
        <p className="text-sm text-gray-800 leading-relaxed mb-2">
          上記 4 節に記載の業務委託先のうち、米国その他外国に所在する事業者へは、個人情報保護法 28 条に基づき、以下の相当措置を講じたうえで個人情報を提供します。ユーザーは、本サービスへの登録時にこの提供へ同意していただきます。
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800 leading-relaxed">
          <li>各事業者との間で、GDPR 等の個人情報保護基準に準拠したデータ処理契約 (DPA) または標準契約条項 (SCC) を締結し、または EU-U.S. Data Privacy Framework 加盟事業者のみを選定しています。</li>
          <li>各事業者は、日本国内の個人情報保護に関する法令に相当する保護水準を提供する体制（暗号化・アクセス制御・監査ログ等）を継続的に整えています。</li>
          <li>ユーザーからの求めに応じ、各国の個人情報保護制度・当該事業者が講じている措置の詳細を、当事業者が知り得る範囲で情報提供します。</li>
        </ul>
        <p className="text-xs text-gray-500 mt-2">
          ※ 各事業者の詳細な所在地・準拠する保護制度は、それぞれのプライバシーポリシー・DPA でご確認いただけます。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">6. Cookie 等の利用</h2>
        <p className="text-sm text-gray-800 leading-relaxed">
          本サービスは、ログイン状態の維持のために必須 Cookie を利用します。セッション Cookie は最終アクセスから 30 日で失効します。広告・アクセス解析用の Cookie やトラッキングピクセルは一切設置していません。Cookie の受け入れはブラウザ設定で拒否できますが、その場合本サービスの一部機能をご利用いただけない場合があります。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">7. 保存期間</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800 leading-relaxed">
          <li>アカウント基本情報（メールアドレス・氏名・パスワードハッシュ等）：アカウント有効期間中。削除請求後は 30 日以内に削除または匿名化。</li>
          <li>ゲストアカウント（<code>@demo.local</code>）：作成から 24 時間で自動削除。</li>
          <li>マッチング・案件履歴・メッセージ・レビュー：他ユーザーの権利保護および取引記録として、匿名化のうえ最大 5 年間保存する場合があります。</li>
          <li>Stripe 決済に関する会計記録：法人税法・所得税法に基づき最大 7 年間保存。</li>
          <li>アクセスログ・エラーログ：不正利用検出および障害対応のため最大 90 日間保存。</li>
          <li>パスワードリセット・メールアドレス変更トークン：発行から 24 時間で失効・削除。</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">8. 開示・訂正・削除の請求</h2>
        <p className="text-sm text-gray-800 leading-relaxed">
          ユーザーは、当事業者に対して自身の個人情報の開示、訂正、追加、削除、利用停止、消去、第三者提供の停止を請求できます。請求は下記お問い合わせ窓口までご連絡ください。当事業者は本人確認のうえ、法令に従い遅滞なく対応します。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">9. アカウント削除</h2>
        <p className="text-sm text-gray-800 leading-relaxed">
          ユーザーは、ダッシュボードのアカウント設定からいつでもアカウント削除を実行できます。アカウント削除後、個人を識別する情報は速やかに削除されますが、他ユーザーとの取引履歴・メッセージ・レビューについては、他ユーザーの権利保護の観点から匿名化のうえ 7 節の期間に従って保存します。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">10. 改定</h2>
        <p className="text-sm text-gray-800 leading-relaxed">
          当事業者は、必要に応じて本ポリシーを改定することがあります。改定後の内容は本サービス上に掲示した時点から適用されます。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">11. お問い合わせ窓口</h2>
        <p className="text-sm text-gray-800 leading-relaxed">
          個人情報の取扱いに関するお問い合わせは以下までお願いします。
        </p>
        <p className="text-sm text-gray-800 leading-relaxed mt-2">
          {OPERATOR_NAME}<br />
          代表者：{REPRESENTATIVE}<br />
          所在地：{OFFICE_ADDRESS}<br />
          個人情報保護管理者：{REPRESENTATIVE}<br />
          メール：{CONTACT_EMAIL}
        </p>
      </section>

      <p className="text-xs text-gray-500 mt-12">以上</p>
    </div>
  )
}
