// app/projects/new/page.tsx — 案件作成（マルチステップ / CSR）

'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createProjectAction } from '@/server/actions/project'

const GENRES = ['音楽', 'イラスト', '動画', 'デザイン', '写真', '文章', '声優', 'その他']

export default function NewProjectPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [contractType, setContractType] = useState<'SPOT' | 'SUBSCRIPTION'>('SPOT')

  const [state, action, isPending] = useActionState(
    async (_prev: { success: boolean; error?: string; field?: string; projectId?: string } | null, formData: FormData) => {
      // 選択済みジャンルを FormData に追加
      selectedGenres.forEach((g) => formData.append('genres', g))
      formData.set('contractType', contractType)

      const result = await createProjectAction(null, formData)
      if (result.success) {
        router.push(`/projects/${result.projectId}`)
      }
      return result
    },
    null
  )

  const errorState = state && !state.success ? state : null

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">案件を作成する</h1>
        <p className="text-gray-400 text-sm">ステップ {step} / 3</p>
      </div>

      {/* ステップインジケーター */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`flex-1 h-1.5 rounded-full transition-colors ${s <= step ? 'bg-purple-600' : 'bg-gray-200'}`}
          />
        ))}
      </div>

      <form action={action} className="space-y-6">
        {/* ステップ 1: 基本情報 */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="block font-medium mb-1.5">
                案件タイトル <span className="text-red-500">*</span>
              </label>
              <input
                name="title"
                required
                maxLength={100}
                placeholder="例: YouTube 用 BGM 楽曲制作をお願いしたいです"
                className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errorState?.field === 'title' ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              {errorState?.field === 'title' && (
                <p className="text-xs text-red-600 mt-1">{errorState.error}</p>
              )}
            </div>

            <div>
              <label className="block font-medium mb-1.5">案件詳細</label>
              <textarea
                name="description"
                rows={6}
                placeholder={`案件の詳細・要件・希望する納品物などを記入してください\n\n例:\n・楽曲の用途: YouTube チャンネル紹介動画のBGM\n・雰囲気: 明るく前向きな曲調\n・尺: 1〜2分程度\n・納期: 2週間以内`}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y"
              />
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition"
            >
              次へ →
            </button>
          </div>
        )}

        {/* ステップ 2: ジャンル・契約形態 */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block font-medium mb-2">
                ジャンル <span className="text-red-500">*</span>
                <span className="text-gray-400 text-xs font-normal ml-2">（複数選択可）</span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {GENRES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGenre(g)}
                    className={`px-4 py-2 rounded-full border text-sm transition ${
                      selectedGenres.includes(g)
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              {errorState?.field === 'genres' && (
                <p className="text-xs text-red-600 mt-2">{errorState.error}</p>
              )}
              {selectedGenres.length === 0 && (
                <p className="text-xs text-gray-400 mt-2">少なくとも1つ選択してください</p>
              )}
            </div>

            <div>
              <label className="block font-medium mb-2">
                契約形態 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['SPOT', 'SUBSCRIPTION'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setContractType(type)}
                    className={`py-4 px-4 rounded-xl border-2 text-left transition ${
                      contractType === type
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-sm">
                      {type === 'SPOT' ? '🎯 スポット' : '🔄 サブスク'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {type === 'SPOT' ? '単発の案件依頼' : '継続的な長期契約'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 border border-gray-300 py-3 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                ← 戻る
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedGenres.length === 0) return
                  setStep(3)
                }}
                disabled={selectedGenres.length === 0}
                className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition disabled:opacity-50"
              >
                次へ →
              </button>
            </div>
          </div>
        )}

        {/* ステップ 3: 予算・公開 */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <label className="block font-medium mb-1.5">予算（円）</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">¥</span>
                <input
                  name="budget"
                  type="number"
                  min={0}
                  step={1000}
                  placeholder="例: 30000"
                  className="w-full border border-gray-300 rounded-lg pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                ※ 成立時に手数料10%が差し引かれます（業界最安水準）。未設定でも公開できます。
              </p>
            </div>

            {/* 確認サマリー */}
            <div className="bg-gray-50 rounded-xl p-5 text-sm space-y-2">
              <p className="font-medium text-gray-700 mb-3">公開内容の確認</p>
              <div className="flex gap-2 flex-wrap">
                {selectedGenres.map((g) => (
                  <span key={g} className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">
                    {g}
                  </span>
                ))}
              </div>
              <p className="text-gray-500">
                契約形態: {contractType === 'SPOT' ? 'スポット（単発）' : 'サブスク（継続）'}
              </p>
            </div>

            {errorState?.error && !errorState.field && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {errorState.error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 border border-gray-300 py-3 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                ← 戻る
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition disabled:opacity-50"
              >
                {isPending ? '公開中...' : '🚀 案件を公開する'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
