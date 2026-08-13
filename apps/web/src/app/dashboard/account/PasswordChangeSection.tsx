'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChangePasswordSchema, type ChangePasswordInput } from '@creator-links/shared'
import { changePasswordAction } from '@/server/actions/auth'
import PasswordInput from '@/components/ui/password-input'

interface Props {
  passwordSet: boolean
}

export default function PasswordChangeSection({ passwordSet }: Props) {
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const onSubmit = async (data: ChangePasswordInput) => {
    setMessage(null)
    setLoading(true)
    const result = await changePasswordAction(data)
    setLoading(false)
    if (result.success) {
      setMessage({ kind: 'success', text: 'パスワードを変更しました' })
      reset()
      setShow(false)
    } else if (result.field && result.field !== 'general') {
      setError(result.field, { message: result.error })
    } else {
      setMessage({ kind: 'error', text: result.error })
    }
  }

  const title = passwordSet ? 'パスワード' : 'パスワード（未設定）'
  const buttonLabel = show ? 'キャンセル' : passwordSet ? '変更する' : '設定する'
  const submitLabel = passwordSet ? '変更する' : '設定する'

  return (
    <div className="mt-6 border rounded-xl p-4 sm:p-6 bg-gray-50">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <h2 className="font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {passwordSet
              ? '定期的な変更をおすすめします'
              : 'メール以外のログイン方法のみのため、パスワードは未設定です'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShow((v) => !v)
            setMessage(null)
            reset()
          }}
          className="shrink-0 text-sm border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-white transition"
        >
          {buttonLabel}
        </button>
      </div>

      {show && (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
          {passwordSet && (
            <div>
              <label htmlFor="current-password" className="block text-xs font-medium text-gray-600 mb-1">
                現在のパスワード
              </label>
              <PasswordInput
                id="current-password"
                autoComplete="current-password"
                {...register('currentPassword')}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {errors.currentPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.currentPassword.message}</p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="new-password" className="block text-xs font-medium text-gray-600 mb-1">
              新しいパスワード（8〜72 文字）
            </label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              {...register('newPassword')}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {errors.newPassword && (
              <p className="text-red-500 text-xs mt-1">{errors.newPassword.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-xs font-medium text-gray-600 mb-1">
              新しいパスワード（確認）
            </label>
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              {...register('confirmPassword')}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50"
          >
            {loading ? '処理中...' : submitLabel}
          </button>
        </form>
      )}

      {message && (
        <p
          className={`mt-3 text-sm px-3 py-2 rounded-lg ${
            message.kind === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  )
}
