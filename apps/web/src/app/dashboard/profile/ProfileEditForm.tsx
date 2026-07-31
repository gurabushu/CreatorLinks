'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UpdateProfileSchema, type UpdateProfileInput } from '@creator-links/shared'
import { updateProfileAction } from '@/server/actions/profile'
import { requestEmailChangeAction } from '@/server/actions/auth'
import { AvatarUpload } from '@/components/upload/avatar-upload'
import { CoverImageUpload } from '@/components/upload/cover-image-upload'
import { useState, useTransition } from 'react'
import Link from 'next/link'

const GENRES = ['音楽', 'イラスト', '動画', 'デザイン', '写真', '文章', '声優', 'その他']

interface Props {
  user: {
    name: string
    email?: string
    bio: string | null
    genres: string[]
    avatarUrl: string | null
    coverUrl: string | null
  }
}

export default function ProfileEditForm({ user }: Props) {
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(user.avatarUrl)
  const [currentCoverUrl, setCurrentCoverUrl] = useState(user.coverUrl)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(UpdateProfileSchema),
    defaultValues: {
      name: user.name,
      bio: user.bio ?? '',
      genres: user.genres,
    },
  })

  const selectedGenres = watch('genres') ?? []

  const toggleGenre = (genre: string) => {
    setValue(
      'genres',
      selectedGenres.includes(genre)
        ? selectedGenres.filter((g) => g !== genre)
        : [...selectedGenres, genre],
      { shouldDirty: true }
    )
  }

  const onSubmit = (data: UpdateProfileInput) => {
    setSaveError(null)
    startTransition(async () => {
      const result = await updateProfileAction(data)
      if (result.success) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 2500)
      } else {
        setSaveError(result.error)
      }
    })
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-8">プロフィール編集</h1>

      {/* ジャケット画像（カバー） */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-600 mb-2">ジャケット画像</p>
        <CoverImageUpload
          currentUrl={currentCoverUrl}
          onUploadComplete={(url) => setCurrentCoverUrl(url)}
        />
      </div>

      {/* アバター */}
      <div className="bg-gray-50 border rounded-xl p-6 mb-8 flex flex-col items-center">
        <p className="text-sm font-medium text-gray-600 mb-4">プロフィール画像（トプ画）</p>
        <AvatarUpload
          currentUrl={currentAvatarUrl}
          name={user.name}
          onUploadComplete={(url) => setCurrentAvatarUrl(url)}
        />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block font-medium mb-1">名前 *</label>
          <input
            {...register('name')}
            className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block font-medium mb-1">自己紹介</label>
          <textarea
            {...register('bio')}
            rows={4}
            placeholder="あなたの活動や得意なことを教えてください"
            className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          {errors.bio && <p className="text-red-500 text-sm mt-1">{errors.bio.message}</p>}
        </div>

        <div>
          <label className="block font-medium mb-2">活動ジャンル</label>
          <div className="flex gap-2 flex-wrap">
            {GENRES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => toggleGenre(g)}
                className={`px-4 py-2 rounded-full border transition ${
                  selectedGenres.includes(g)
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-purple-300'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {saveError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            {saveError}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition disabled:opacity-50"
        >
          {isPending ? '保存中...' : '変更を保存する'}
        </button>

        {saveSuccess && (
          <p className="text-center text-green-600 font-medium">
            プロフィールを更新しました
          </p>
        )}
      </form>

      {/* ポートフォリオ管理へのリンク */}
      <div className="mt-10 border rounded-xl p-4 sm:p-6 bg-purple-50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="font-bold text-gray-900">作品を登録する</h2>
            <p className="text-sm text-gray-600 mt-1">
              ポートフォリオを追加するとアーティスト一覧でジャケット画像として表示されます
            </p>
          </div>
          <Link
            href="/dashboard/portfolio"
            className="shrink-0 bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition text-center"
          >
            ポートフォリオ管理 →
          </Link>
        </div>
      </div>

      {/* メールアドレス変更 */}
      <EmailChangeSection currentEmail={user.email} />
    </div>
  )
}

function EmailChangeSection({ currentEmail }: { currentEmail?: string }) {
  const [show, setShow] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage(null)
    setLoading(true)
    const result = await requestEmailChangeAction({ newEmail })
    setLoading(false)
    if (result.success) {
      setMessage({ kind: 'success', text: `${newEmail} に確認メールを送信しました。リンクをクリックして変更を完了してください。` })
      setNewEmail('')
    } else {
      setMessage({ kind: 'error', text: result.error })
    }
  }

  return (
    <div className="mt-6 border rounded-xl p-4 sm:p-6 bg-gray-50">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <h2 className="font-bold text-gray-900">メールアドレス</h2>
          {currentEmail && (
            <p className="text-sm text-gray-500 mt-0.5 break-all">{currentEmail}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="shrink-0 text-sm border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-white transition"
        >
          {show ? 'キャンセル' : '変更する'}
        </button>
      </div>

      {show && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label htmlFor="new-email" className="block text-xs font-medium text-gray-600 mb-1">
              新しいメールアドレス
            </label>
            <input
              id="new-email"
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="new@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !newEmail}
            className="w-full bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50"
          >
            {loading ? '送信中...' : '確認メールを送る'}
          </button>
          <p className="text-xs text-gray-400">
            ※ 新しいメールアドレスに確認リンクが届きます。リンクをクリックすると変更が完了します（24 時間有効）。
          </p>
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
