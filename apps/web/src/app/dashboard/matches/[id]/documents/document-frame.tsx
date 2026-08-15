'use client'

import { ReactNode } from 'react'

// 帳票フレーム: ヘッダーに「印刷」ボタン、A4 想定のホワイトボード
export function DocumentFrame({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-3xl mx-auto px-4 print:px-0 print:max-w-none">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <h1 className="text-lg font-bold text-gray-700">{title}</h1>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 transition"
            >
              印刷 / PDF 保存
            </button>
          </div>
        </div>
        <div className="bg-white shadow print:shadow-none border border-gray-200 print:border-0 rounded-lg print:rounded-none p-6 sm:p-10 text-sm text-gray-800">
          {children}
        </div>
        <p className="text-[11px] text-gray-500 mt-3 print:hidden">
          印刷ダイアログで「PDF として保存」を選ぶと PDF 化できます。
        </p>
      </div>
    </div>
  )
}
