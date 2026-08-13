// JSON-LD 構造化データ用の小さなヘルパー。
// Next.js App Router では layout.tsx / page.tsx から <JsonLd data={...} /> と呼び、
// <script type="application/ld+json"> をそのまま HTML に埋め込む。
//
// dangerouslySetInnerHTML は JSON.stringify 済みオブジェクトのみを渡す前提。
// スキーマ内にユーザー入力（イベントタイトル等）が入る場合は必ずオブジェクトのプロパティ
// として渡すこと（HTML エスケープではなく JSON エスケープが自動でかかる）。

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
