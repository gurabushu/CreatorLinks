'use client'

import { useState } from 'react'

export function GoogleCalendarSync({ icsUrl }: { icsUrl: string }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const googleAddUrl = `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(icsUrl)}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(icsUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs sm:text-sm border border-slate-300 text-slate-700 bg-white px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
      >
        Google カレンダー連携
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-lg p-4 z-50 text-left">
          <p className="text-sm font-semibold text-gray-900 mb-2">Google カレンダーに追加</p>
          <p className="text-xs text-gray-600 leading-relaxed mb-3">
            Google カレンダー側で「他のカレンダー → URL で追加」に下のアドレスを貼り付けてください。
            EncoreCue 側のイベント・案件が自動で反映されます。
          </p>

          <div className="flex items-center gap-2 mb-3">
            <input
              readOnly
              value={icsUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-gray-50 text-gray-700"
            />
            <button
              type="button"
              onClick={copy}
              className="shrink-0 text-xs bg-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg transition"
            >
              {copied ? 'コピー済' : 'コピー'}
            </button>
          </div>

          <a
            href={googleAddUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg transition"
          >
            Google カレンダーを開いて追加
          </a>

          <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
            反映には最大 12 時間かかる場合があります (Google 側の仕様)。<br />
            一方向購読のため、Google カレンダー側の変更は EncoreCue に戻りません。
          </p>
        </div>
      )}
    </>
  )
}
