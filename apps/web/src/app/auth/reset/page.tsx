'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { resetPasswordAction } from '@/server/actions/auth'
import PasswordInput from '@/components/ui/password-input'
import { SITE_NAME } from '@/lib/brand'

function ResetPasswordInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError('トークンが見つかりません。メール内のリンクから開き直してください。')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }
    if (newPassword.length < 8) {
      setError('パスワードは8文字以上で入力してください')
      return
    }

    setLoading(true)
    const result = await resetPasswordAction({ token, newPassword })
    setLoading(false)

    if (!result.success) {
      setError(result.error)
      return
    }
    setDone(true)
    setTimeout(() => router.push('/auth'), 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <Link href="/" className="text-2xl font-bold text-purple-600">{SITE_NAME}</Link>
          <p className="text-gray-500 text-sm mt-1">新しいパスワードを設定</p>
        </div>

        {done ? (
          <div className="text-center space-y-3">
            <p className="font-medium text-gray-800">パスワードを更新しました</p>
            <p className="text-xs text-gray-500">まもなくログイン画面に移動します</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                新しいパスワード
              </label>
              <PasswordInput
                id="new-password"
                required
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="8文字以上"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                確認のためもう一度
              </label>
              <PasswordInput
                id="confirm-password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="同じパスワードをもう一度"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition disabled:opacity-50"
            >
              {loading ? '更新中...' : 'パスワードを更新'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-gray-400">読み込み中...</div></div>}>
      <ResetPasswordInner />
    </Suspense>
  )
}
