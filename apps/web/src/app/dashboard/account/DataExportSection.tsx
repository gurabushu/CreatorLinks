'use client'

// 自分の全 PII を JSON でダウンロードするセクション。
// APPI 32 条（開示請求）への対応 UI。

export default function DataExportSection() {
  return (
    <section className="rounded-xl border border-blue-200 bg-blue-50/40 p-5">
      <h2 className="text-base font-bold text-blue-800 mb-1">私のデータをダウンロード</h2>
      <p className="text-xs text-blue-800/80 leading-relaxed mb-3">
        あなたのプロフィール・ポートフォリオ・案件・メッセージ・レビューなど、
        当事業者が保有するあなたご自身の個人データを JSON 形式でダウンロードできます。
        （相手ユーザーの氏名・メール等は含まれません。）
      </p>
      <a
        href="/api/account/export"
        download
        className="inline-flex items-center gap-2 text-sm text-blue-700 border border-blue-300 hover:bg-blue-100 px-4 py-2 rounded-lg transition"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        JSON をダウンロード
      </a>
      <p className="text-[11px] text-blue-800/70 mt-3 leading-relaxed">
        個人情報保護法 32 条に基づく開示請求への対応です。エクスポート内容にご不明点や
        追加請求（訂正・利用停止・第三者提供停止）がある場合は、
        <a href="/support" className="underline hover:text-blue-900">サポート窓口</a>
        までお問い合わせください。
      </p>
    </section>
  )
}
