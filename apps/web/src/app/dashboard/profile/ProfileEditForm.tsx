'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  UpdateProfileSchema,
  type UpdateProfileInput,
  type Gender,
  type CommitmentLevel,
  GENDERS,
  GENDER_LABELS,
  COMMITMENT_LEVELS,
  COMMITMENT_LEVEL_LABELS,
  INSTRUMENT_PRESETS,
} from '@creator-links/shared'
import { updateProfileAction } from '@/server/actions/profile'
import { AvatarUpload } from '@/components/upload/avatar-upload'
import { CoverImageUpload } from '@/components/upload/cover-image-upload'
import { useState, useTransition } from 'react'
import Link from 'next/link'

const GENRES = [
  'ボーカル',
  '作曲',
  '作詞',
  '編曲',
  '演奏',
  'DTM・トラックメイキング',
  'レコーディング・エンジニア',
  'ミキシング・エンジニア',
  'マスタリング・エンジニア',
  'PA・音響エンジニア',
  'ライブサポート・照明・ステージ演出',
  'その他',
]

interface Props {
  user: {
    name: string
    displayName: string | null
    bio: string | null
    genres: string[]
    avatarUrl: string | null
    coverUrl: string | null
    gender: Gender | null
    heightCm: number | null
    activityYears: number | null
    skillLevel: CommitmentLevel | null
    instruments: string[]
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
      displayName: user.displayName,
      bio: user.bio ?? '',
      genres: user.genres,
      gender: user.gender ?? null,
      heightCm: user.heightCm ?? null,
      activityYears: user.activityYears ?? null,
      skillLevel: user.skillLevel ?? null,
      instruments: user.instruments ?? [],
    },
  })

  const selectedGenres = watch('genres') ?? []
  const selectedSkillLevel = watch('skillLevel') ?? null
  const selectedInstruments = watch('instruments') ?? []

  const toggleInstrument = (name: string) => {
    setValue(
      'instruments',
      selectedInstruments.includes(name)
        ? selectedInstruments.filter((i) => i !== name)
        : [...selectedInstruments, name],
      { shouldDirty: true }
    )
  }

  const [instrumentDraft, setInstrumentDraft] = useState('')
  const addCustomInstrument = () => {
    const v = instrumentDraft.trim()
    if (!v) return
    if (selectedInstruments.includes(v)) {
      setInstrumentDraft('')
      return
    }
    if (selectedInstruments.length >= 15) return
    setValue('instruments', [...selectedInstruments, v], { shouldDirty: true })
    setInstrumentDraft('')
  }

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
    <div className="max-w-2xl mx-auto py-6 sm:py-12 px-4">
      <h1 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8">プロフィール編集</h1>

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
          <label className="block font-medium mb-1">
            アーティスト表示名
            <span className="text-gray-400 text-xs font-normal ml-2">
              （未入力ならアカウント名がそのまま表示されます）
            </span>
          </label>
          <input
            {...register('displayName')}
            placeholder={user.name}
            className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          {errors.displayName && (
            <p className="text-red-500 text-sm mt-1">{errors.displayName.message}</p>
          )}
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

        {/* プロフィール属性（性別・身長・歴） */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block font-medium mb-1">性別</label>
            <select
              {...register('gender', {
                setValueAs: (v) => (v === '' || v == null ? null : v),
              })}
              className="w-full border rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              defaultValue={user.gender ?? ''}
            >
              <option value="">未回答</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {GENDER_LABELS[g]}
                </option>
              ))}
            </select>
            {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender.message}</p>}
          </div>

          <div>
            <label className="block font-medium mb-1">身長 (cm)</label>
            <input
              type="number"
              inputMode="numeric"
              min={100}
              max={250}
              placeholder="任意"
              defaultValue={user.heightCm ?? ''}
              {...register('heightCm', {
                setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
              })}
              className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {errors.heightCm && (
              <p className="text-red-500 text-sm mt-1">{errors.heightCm.message}</p>
            )}
          </div>

          <div>
            <label className="block font-medium mb-1">活動歴 (年)</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={80}
              placeholder="任意"
              defaultValue={user.activityYears ?? ''}
              {...register('activityYears', {
                setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
              })}
              className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {errors.activityYears && (
              <p className="text-red-500 text-sm mt-1">{errors.activityYears.message}</p>
            )}
          </div>
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

        {/* 熟練度 */}
        <div>
          <label className="block font-medium mb-2">
            熟練度
            <span className="text-gray-400 text-xs font-normal ml-2">
              （案件の本気度とマッチングされます）
            </span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() =>
                setValue('skillLevel', null, { shouldDirty: true })
              }
              className={`py-3 px-3 rounded-xl border-2 text-left transition ${
                selectedSkillLevel === null
                  ? 'border-gray-800 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="font-medium text-sm">未回答</p>
              <p className="text-[11px] text-gray-500 mt-1 leading-snug">絞り込みに含めない</p>
            </button>
            {COMMITMENT_LEVELS.map((lv) => {
              const meta = COMMITMENT_LEVEL_LABELS[lv]
              const active = selectedSkillLevel === lv
              return (
                <button
                  key={lv}
                  type="button"
                  onClick={() => setValue('skillLevel', lv, { shouldDirty: true })}
                  className={`py-3 px-3 rounded-xl border-2 text-left transition ${
                    active
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-sm">{meta.label}</p>
                  <p className="text-[11px] text-gray-500 mt-1 leading-snug">{meta.description}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* 楽器（音楽ジャンルの方向け） */}
        <div>
          <label className="block font-medium mb-2">
            楽器 / 担当
            <span className="text-gray-400 text-xs font-normal ml-2">
              （音楽系のみ。任意）
            </span>
          </label>
          <div className="flex gap-2 flex-wrap mb-3">
            {INSTRUMENT_PRESETS.map((inst) => {
              const active = selectedInstruments.includes(inst)
              return (
                <button
                  key={inst}
                  type="button"
                  onClick={() => toggleInstrument(inst)}
                  className={`px-3 py-1.5 rounded-full border text-sm transition ${
                    active
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-purple-300'
                  }`}
                >
                  {inst}
                </button>
              )
            })}
          </div>
          {/* カスタム楽器 */}
          <div className="flex gap-2">
            <input
              type="text"
              value={instrumentDraft}
              onChange={(e) => setInstrumentDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCustomInstrument()
                }
              }}
              placeholder="その他の楽器 / 担当を追加（例: 二胡）"
              maxLength={30}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="button"
              onClick={addCustomInstrument}
              disabled={!instrumentDraft.trim() || selectedInstruments.length >= 15}
              className="px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium disabled:opacity-40"
            >
              追加
            </button>
          </div>
          {/* 追加済み（プリセット外） */}
          {selectedInstruments.filter((i) => !INSTRUMENT_PRESETS.includes(i)).length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-2">
              {selectedInstruments
                .filter((i) => !INSTRUMENT_PRESETS.includes(i))
                .map((i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs"
                  >
                    {i}
                    <button
                      type="button"
                      onClick={() => toggleInstrument(i)}
                      aria-label={`${i} を外す`}
                      className="text-purple-500 hover:text-purple-800"
                    >
                      ✕
                    </button>
                  </span>
                ))}
            </div>
          )}
          {errors.instruments && (
            <p className="text-red-500 text-sm mt-1">{errors.instruments.message}</p>
          )}
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

      {/* アカウント設定への導線 */}
      <div className="mt-6 border rounded-xl p-4 sm:p-6 bg-gray-50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="font-bold text-gray-900">アカウント情報</h2>
            <p className="text-sm text-gray-600 mt-1">
              名前・メールアドレス・パスワードはアカウント設定から変更できます
            </p>
          </div>
          <Link
            href="/dashboard/account"
            className="shrink-0 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition text-center"
          >
            アカウント設定 →
          </Link>
        </div>
      </div>
    </div>
  )
}
