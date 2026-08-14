'use client'

// 退会（アカウント削除）セクション。
// - 2 段階確認（詳細を開く → パスワード再入力 → 削除確定）
// - ゲストアカウントは password 不要（passwordSet=false で渡される）
// - 削除成功時は Auth.js cookie が消えるので / に飛ばす

import { useState, useTransition } from 'react'
import { deleteAccountAction } from '@/server/actions/account'

type Props = {
  passwordSet: boolean
  isGuest: boolean
}

export default function DeleteAccountSection({ passwordSet, isGuest }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const CONFIRM_KEYWORD = '削除する'
  const requirePassword = !isGuest && passwordSet

  const submit = () => {
    setError(null)
    if (confirmText !== CONFIRM_KEYWORD) {
      setError(`確認のため「${CONFIRM_KEYWORD}」と入力してください`)
      return
    }
    if (requirePassword && !password) {
      setError('現在のパスワードを入力してください')
      return
    }
    startTransition(async () => {
      const result = await deleteAccountAction({
        currentPassword: requirePassword ? password : undefined,
      })
      if (!result.success) {
        setError(result.error)
        return
      }
      // signOut 済み。トップに飛ばして完了メッセージを表示（? をつけて簡易通知）
      window.location.href = '/?deleted=1'
    })
  }

  return (
    <section className="rounded-xl border border-red-200 bg-red-50/40 p-5">
      <h2 className="text-base font-bold text-red-800 mb-1">アカウント削除</h2>
      <p className="text-xs text-red-800/80 leading-relaxed mb-3">
        アカウントを削除すると、プロフィール・ポートフォリオ・お気に入り等の
        個人情報は速やかに匿名化され、以後ログインできなくなります。
        他ユーザーとのメッセージ・案件履歴・レビューは、他ユーザーの権利保護のため
        匿名化のうえ保存されます（詳細は
        <a href="/privacy" target="_blank" rel="noopener" className="underline">プライバシーポリシー</a>
        参照）。
      </p>

      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-sm text-red-700 border border-red-300 hover:bg-red-100 px-4 py-2 rounded-lg transition"
        >
          アカウントを削除する
        </button>
      ) : (
        <div className="space-y-3 mt-3 bg-white border border-red-200 rounded-lg p-4">
          {requirePassword && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                現在のパスワード <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              確認: 「{CONFIRM_KEYWORD}」と入力 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder={CONFIRM_KEYWORD}
            />
          </div>

          {error && (
            <p className="text-xs text-red-700 bg-red-100 border border-red-300 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="text-sm bg-red-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {pending ? '削除中…' : '完全に削除する'}
            </button>
            <button
              type="button"
              onClick={() => {
                setExpanded(false)
                setPassword('')
                setConfirmText('')
                setError(null)
              }}
              disabled={pending}
              className="text-sm text-gray-600 border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg transition"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
