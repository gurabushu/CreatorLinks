'use client'

import { useState } from 'react'
import Link from 'next/link'
import { requestPasswordResetAction } from '@/server/actions/auth'
import { SITE_NAME } from '@/lib/brand'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    await requestPasswordResetAction({ email })
    setLoading(false)
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <Link href="/" className="text-2xl font-bold text-purple-600">{SITE_NAME}</Link>
          <p className="text-gray-500 text-sm mt-1">パスワード再設定</p>
        </div>

        {submitted ? (
          <div className="text-center space-y-4">
            <p className="font-medium text-gray-800">
              入力されたメールアドレスにリセット用リンクを送信しました
            </p>
            <p className="text-xs text-gray-500">
              リンクは 24 時間有効です。届かない場合は迷惑メールフォルダもご確認ください。
            </p>
            <Link
              href="/auth"
              className="inline-block text-sm text-purple-600 hover:underline mt-4"
            >
              ログイン画面に戻る
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-600">
              ご登録のメールアドレスを入力してください。再設定用リンクをお送りします。
            </p>
            <div>
              <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <input
                id="forgot-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition disabled:opacity-50"
            >
              {loading ? '送信中...' : '再設定リンクを送る'}
            </button>
            <Link
              href="/auth"
              className="block text-center text-sm text-gray-500 hover:text-purple-600 mt-3"
            >
              ← ログイン画面に戻る
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
