'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { sendSupportInquiryAction, type SupportCategory } from '@/server/actions/support'

const CATEGORIES: { value: SupportCategory; label: string; hint: string }[] = [
  { value: 'BUG', label: 'バグ報告', hint: '動作不具合・エラー表示' },
  { value: 'FEATURE', label: '機能要望', hint: '追加してほしい機能・改善案' },
  { value: 'PAYMENT', label: '支払い・返金', hint: 'Stripe / 手数料 / 返金相談' },
  { value: 'ACCOUNT', label: 'アカウント', hint: 'ログイン / 削除 / 設定' },
  { value: 'USAGE', label: '利用方法', hint: '使い方が分からない' },
  { value: 'OTHER', label: 'その他', hint: '上記以外' },
]

export function ContactForm() {
  const router = useRouter()
  const [category, setCategory] = useState<SupportCategory>('BUG')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSending(true)
    const fd = new FormData()
    fd.append('category', category)
    fd.append('subject', subject)
    fd.append('body', body)
    const result = await sendSupportInquiryAction(fd)
    setSending(false)
    if (result.success) {
      router.push(`/dashboard/chat/${result.matchId}?sent=1`)
    } else {
      setError(result.error)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* カテゴリ */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          カテゴリ <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`text-left p-3 rounded-xl border-2 transition ${
                category === c.value
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 bg-white hover:border-purple-300'
              }`}
            >
              <div className="text-sm font-medium text-gray-800">{c.label}</div>
              <div className="text-[11px] text-gray-500 mt-0.5 leading-snug">{c.hint}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 件名 */}
      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1.5">
          件名 <span className="text-red-500">*</span>
        </label>
        <input
          id="subject"
          type="text"
          required
          maxLength={120}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="例: プロフィール画像がアップロードできません"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <p className="text-[11px] text-gray-400 mt-1">{subject.length} / 120</p>
      </div>

      {/* 本文 */}
      <div>
        <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-1.5">
          お問い合わせ内容 <span className="text-red-500">*</span>
        </label>
        <textarea
          id="body"
          required
          maxLength={4000}
          rows={8}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            'できるだけ詳しくお書きください。\n\n例:\n・発生した状況: プロフィール編集ページから画像を選択して保存を押しました\n・期待した動作: 画像がアップロードされる\n・実際の動作: 「エラーが発生しました」と表示される\n・使用環境: iPhone 15 Pro / Safari'
          }
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <p className="text-[11px] text-gray-400 mt-1">{body.length} / 4000</p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="submit"
          disabled={sending || !subject.trim() || !body.trim()}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold px-6 py-3 rounded-xl shadow-md hover:shadow-lg hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {sending ? '送信中…' : '公式アカウントに送信'}
        </button>
        <p className="text-xs text-gray-500">
          送信内容はマイページのチャットからも確認・追記できます。
        </p>
      </div>
    </form>
  )
}
