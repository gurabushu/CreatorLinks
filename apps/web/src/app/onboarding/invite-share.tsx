'use client'

import { useState } from 'react'
import { sendInviteEmailAction } from '@/server/actions/invite'
import { SITE_NAME } from '@/lib/brand'

export function InviteShare({
  inviteUrl,
  qrDataUrl,
}: {
  inviteUrl: string
  qrDataUrl: string
}) {
  const [copied, setCopied] = useState(false)
  const [emails, setEmails] = useState('')
  const [sending, setSending] = useState(false)
  const [emailStatus, setEmailStatus] = useState<string | null>(null)
  const [emailOK, setEmailOK] = useState(false)

  const shareText =
    `${SITE_NAME} で音楽の仕事を一緒に進めませんか？\n` +
    `LINE や DM の依頼を、記録と支払いまでひとつに。\n${inviteUrl}`
  const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(shareText)}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const send = async () => {
    setSending(true)
    setEmailStatus(null)
    const fd = new FormData()
    fd.append('emails', emails)
    const result = await sendInviteEmailAction(fd)
    setSending(false)
    if (result.success) {
      setEmailStatus(`${result.sent} 件のメール招待を送信しました`)
      setEmailOK(true)
      setEmails('')
    } else {
      setEmailStatus(result.error)
      setEmailOK(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* 招待リンク */}
      <div className="rounded-2xl border border-purple-100 bg-white p-5">
        <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <span className="text-purple-600">🔗</span> 招待リンク
        </h2>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <input
            readOnly
            value={inviteUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50"
          />
          <button
            type="button"
            onClick={copy}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium whitespace-nowrap transition"
          >
            {copied ? 'コピーしました' : 'コピー'}
          </button>
        </div>
      </div>

      {/* LINE */}
      <div className="rounded-2xl border border-purple-100 bg-white p-5">
        <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <span className="text-[#06C755]">💬</span> LINE で送る
        </h2>
        <a
          href={lineUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#06C755] hover:bg-[#05a848] text-white rounded-lg font-medium transition"
        >
          LINE アプリで共有
        </a>
        <p className="text-xs text-gray-500 mt-2">
          モバイルなら LINE アプリが開き、PC ならトーク画面が開きます。
        </p>
      </div>

      {/* メール */}
      <div className="rounded-2xl border border-purple-100 bg-white p-5">
        <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <span className="text-purple-600">✉️</span> メールで招待
        </h2>
        <textarea
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          placeholder="user1@example.com, user2@example.com"
          rows={3}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <div className="mt-2 flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={send}
            disabled={sending || !emails.trim()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition"
          >
            {sending ? '送信中…' : '招待を送信'}
          </button>
          {emailStatus && (
            <span className={`text-sm ${emailOK ? 'text-emerald-600' : 'text-red-600'}`}>
              {emailStatus}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          複数のアドレスはカンマ・スペース・改行で区切って入力（最大 10 件）
        </p>
      </div>

      {/* QR */}
      <div className="rounded-2xl border border-purple-100 bg-white p-5">
        <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <span className="text-purple-600">📱</span> QR コード
        </h2>
        <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="招待 QR コード"
            className="w-40 h-40 rounded-lg border border-gray-100 shrink-0"
          />
          <p className="text-sm text-gray-600 leading-relaxed">
            対面で相手のカメラに読み取ってもらうと、そのまま招待ページが開きます。
            スタジオやライブ現場でその場で登録してもらう用に便利。
          </p>
        </div>
      </div>
    </div>
  )
}
