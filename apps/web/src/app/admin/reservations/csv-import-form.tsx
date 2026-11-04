'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { bulkImportReservationsAction } from '@/server/actions/admin-reservations'

type ImportSummary = {
  inserted: number
  skipped: number
  rejected: number
  reasons: { email: string; reason: string }[]
}

// 最低限の CSV パーサ: ダブルクォート escape に対応。
// Google Sheets の "ダウンロード → カンマ区切り" 形式を想定。
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.length > 0)
  for (const line of lines) {
    const cells: string[] = []
    let cur = ''
    let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQuote) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"'
          i++
        } else if (ch === '"') {
          inQuote = false
        } else {
          cur += ch
        }
      } else {
        if (ch === ',') {
          cells.push(cur)
          cur = ''
        } else if (ch === '"') {
          inQuote = true
        } else {
          cur += ch
        }
      }
    }
    cells.push(cur)
    rows.push(cells)
  }
  return rows
}

export function CsvImportForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [preview, setPreview] = useState<{ email: string; name: string; primaryInstrument?: string }[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)

  const handleFile = async (file: File) => {
    setError(null)
    setSummary(null)
    try {
      const text = await file.text()
      const rows = parseCsv(text)
      if (rows.length < 2) {
        setError('空の CSV です (header + 1 行以上必要)')
        setPreview(null)
        return
      }
      const header = rows[0].map((h) => h.trim().toLowerCase())
      const emailIdx = header.indexOf('email')
      const nameIdx = header.indexOf('name')
      const instrIdx = header.indexOf('primaryinstrument')
      if (emailIdx < 0 || nameIdx < 0) {
        setError('header に email, name 列が必要です (primaryInstrument は任意)')
        setPreview(null)
        return
      }
      const parsed = rows.slice(1).map((r) => ({
        email: r[emailIdx]?.trim() ?? '',
        name: r[nameIdx]?.trim() ?? '',
        primaryInstrument: instrIdx >= 0 ? r[instrIdx]?.trim() : undefined,
      }))
      setPreview(parsed)
    } catch (e) {
      setError(`読込エラー: ${(e as Error).message}`)
      setPreview(null)
    }
  }

  const handleSubmit = () => {
    if (!preview || preview.length === 0) return
    if (!confirm(`${preview.length} 件を bulk import します。続行？`)) return
    setError(null)
    setSummary(null)
    startTransition(async () => {
      const r = await bulkImportReservationsAction(preview)
      if (!r.ok) {
        setError(r.error)
      } else if (r.data) {
        setSummary(r.data)
        setPreview(null)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">CSV ファイル</label>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void handleFile(f)
          }}
          className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {preview && (
        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 text-sm">
          <p className="font-semibold text-gray-700 mb-2">
            プレビュー: {preview.length} 件
          </p>
          <ul className="space-y-0.5 text-xs text-gray-600 max-h-48 overflow-auto">
            {preview.slice(0, 10).map((p, i) => (
              <li key={i}>{p.email} / {p.name} / {p.primaryInstrument ?? '—'}</li>
            ))}
            {preview.length > 10 && (
              <li className="text-gray-400">... 他 {preview.length - 10} 件</li>
            )}
          </ul>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending}
            className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 disabled:opacity-50"
          >
            {pending ? 'インポート中...' : 'インポート実行'}
          </button>
        </div>
      )}

      {summary && (
        <div className="border border-emerald-200 rounded-lg p-3 bg-emerald-50 text-sm">
          <p className="font-semibold text-emerald-800 mb-2">インポート結果</p>
          <ul className="space-y-0.5 text-xs text-emerald-900">
            <li>✅ 登録: {summary.inserted} 件</li>
            <li>⏭ skip (既存 email): {summary.skipped} 件</li>
            <li>⚠ reject: {summary.rejected} 件</li>
          </ul>
          {summary.reasons.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-red-700">reject 詳細</summary>
              <ul className="mt-1 space-y-0.5 text-xs text-red-800">
                {summary.reasons.map((r, i) => (
                  <li key={i}>・{r.email}: {r.reason}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
