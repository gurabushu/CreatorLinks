// app/dashboard/profile/page.tsx — プロフィール編集 (CSR)
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UpdateProfileSchema, type UpdateProfileInput } from '@creator-links/shared'
import { trpc } from '@/lib/trpc'
import { AvatarUpload } from '@/components/upload/avatar-upload'
import { useState } from 'react'

const GENRES = ['音楽', 'イラスト', '動画', 'デザイン', '写真', '文章', '声優', 'その他']

export default function ProfileEditPage() {
  const { data: me, refetch } = trpc.user.me.useQuery()
  const updateProfile = trpc.user.updateProfile.useMutation()
  const [saveSuccess, setSaveSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(UpdateProfileSchema),
    values: me ? { name: me.name, bio: me.bio ?? '', genres: me.genres } : undefined,
  })

  const selectedGenres = watch('genres') ?? []

  const toggleGenre = (genre: string) => {
    setValue(
      'genres',
      selectedGenres.includes(genre)
        ? selectedGenres.filter((g) => g !== genre)
        : [...selectedGenres, genre]
    )
  }

  const onSubmit = async (data: UpdateProfileInput) => {
    await updateProfile.mutateAsync(data)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2500)
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-8">プロフィール編集</h1>

      {/* アバター */}
      <div className="bg-gray-50 border rounded-xl p-6 mb-8 flex flex-col items-center">
        <p className="text-sm font-medium text-gray-600 mb-4">プロフィール画像</p>
        <AvatarUpload
          currentUrl={me?.avatarUrl}
          name={me?.name ?? '?'}
          onUploadComplete={() => refetch()}
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

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition disabled:opacity-50"
        >
          {isSubmitting ? '保存中...' : '変更を保存する'}
        </button>

        {saveSuccess && (
          <p className="text-center text-green-600 font-medium animate-pulse">
            ✓ プロフィールを更新しました
          </p>
        )}
      </form>
    </div>
  )
}
