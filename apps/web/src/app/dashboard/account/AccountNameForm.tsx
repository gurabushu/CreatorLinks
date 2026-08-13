'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UpdateAccountSchema, type UpdateAccountInput } from '@creator-links/shared'
import { updateAccountAction } from '@/server/actions/profile'

export default function AccountNameForm({ initialName }: { initialName: string }) {
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateAccountInput>({
    resolver: zodResolver(UpdateAccountSchema),
    defaultValues: { name: initialName },
  })

  const onSubmit = (data: UpdateAccountInput) => {
    setSaveError(null)
    startTransition(async () => {
      const result = await updateAccountAction(data)
      if (result.success) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 2500)
      } else {
        setSaveError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="border rounded-xl p-4 sm:p-6 bg-gray-50 space-y-3">
      <div>
        <h2 className="font-bold text-gray-900">名前</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          アカウントの名前です。アーティストとしての公開表示名は
          <a href="/dashboard/profile" className="text-purple-600 underline mx-1">
            プロフィール
          </a>
          で別に設定できます（未設定の場合はこの名前が公開表示されます）。
        </p>
      </div>
      <div>
        <input
          {...register('name')}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="例: 山田 太郎"
        />
        {errors.name && (
          <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
        )}
      </div>

      {saveError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {saveError}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50"
      >
        {isPending ? '保存中...' : '変更を保存する'}
      </button>

      {saveSuccess && (
        <p className="text-center text-green-600 text-sm font-medium">保存しました</p>
      )}
    </form>
  )
}
