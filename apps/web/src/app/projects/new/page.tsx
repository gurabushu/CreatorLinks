// app/projects/new/page.tsx — 案件作成（マルチステップ / CSR）

'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  createProjectAction,
  getArtistNameAction,
  getProjectPrefillFromMatchAction,
} from '@/server/actions/project'
import { COMMITMENT_LEVEL_LABELS, type CommitmentLevel } from '@creator-links/shared'

const GENRES = ['音楽', 'イラスト', '動画', 'デザイン', '写真', '文章', '声優', 'その他']

const COMMITMENT_LEVEL_OPTIONS: readonly CommitmentLevel[] = ['HOBBY', 'SEMI_PRO', 'PRO'] as const

// Phase A.6+: 音楽業界向け依頼テンプレ（LINE/DM の依頼をアプリに移す動線）
type Template = {
  id: string
  emoji: string
  label: string
  hint: string
  title: string
  description: string
  genres: string[]
  commitmentLevel: CommitmentLevel
}

const TEMPLATES: readonly Template[] = [
  {
    id: 'recording',
    emoji: '🎙️',
    label: 'レコーディング参加',
    hint: 'ギター / ベース / ドラム / コーラス 等',
    title: 'レコーディング参加のご依頼',
    description:
      '【曲情報】\n・楽曲名 / アーティスト名:\n・ジャンル / テンポ:\n・参考音源リンク:\n\n【依頼内容】\n・担当楽器 / パート:\n・想定テイク数・時間:\n・スタジオ / 自宅録音:\n\n【日程・予算】\n・希望録音日 / 締切:\n・予算感（参考）:',
    genres: ['音楽'],
    commitmentLevel: 'PRO',
  },
  {
    id: 'mix',
    emoji: '🎛️',
    label: 'MIX / マスタリング',
    hint: '2Mix / TD / MA / マスタリング',
    title: 'MIX / マスタリング依頼',
    description:
      '【曲情報】\n・楽曲名 / アーティスト名:\n・ジャンル / 参考音源:\n・尺 / トラック数:\n\n【依頼範囲】\n□ MIX（TD）\n□ マスタリング\n□ ステム納品\n\n【納期・予算】\n・希望納期:\n・予算感（参考）:\n・素材受け渡し方法（Dropbox 等）:',
    genres: ['音楽'],
    commitmentLevel: 'PRO',
  },
  {
    id: 'live-support',
    emoji: '🎸',
    label: 'ライブサポート / セッション',
    hint: '対バン・ワンマン・イベント出演',
    title: 'ライブサポート出演のご依頼',
    description:
      '【公演情報】\n・公演名:\n・日時:\n・会場:\n\n【出演内容】\n・担当楽器 / パート:\n・演奏曲数 / 時間:\n・リハ日程（別途調整）:\n\n【条件】\n・ギャランティ:\n・交通費 / 機材:\n・音源 / スコア提供方法:',
    genres: ['音楽'],
    commitmentLevel: 'SEMI_PRO',
  },
]

export default function NewProjectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromMatch = searchParams.get('fromMatch')
  const assignArtist = searchParams.get('assignArtist')
  const assignDate = searchParams.get('date')
  const [step, setStep] = useState(1)
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [contractType, setContractType] = useState<'SPOT' | 'SUBSCRIPTION'>('SPOT')
  const [commitmentLevel, setCommitmentLevel] = useState<CommitmentLevel>('HOBBY')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(null)
  const [prefillLoaded, setPrefillLoaded] = useState(false)
  const [assignArtistName, setAssignArtistName] = useState<string | null>(null)
  // 空き日オファーで自動プリフィルする日付 (datetime-local 形式)。デフォルト 10:00〜14:00
  const prefillStart =
    assignDate && /^\d{4}-\d{2}-\d{2}$/.test(assignDate) ? `${assignDate}T10:00` : ''
  const prefillEnd =
    assignDate && /^\d{4}-\d{2}-\d{2}$/.test(assignDate) ? `${assignDate}T14:00` : ''

  // ?fromMatch=<matchId> で過去の Match から案件内容を引き継ぐ（1 タップ再依頼）
  useEffect(() => {
    if (!fromMatch || prefillLoaded) return
    let cancelled = false
    ;(async () => {
      const result = await getProjectPrefillFromMatchAction(fromMatch)
      if (cancelled) return
      if (result.ok) {
        setTitle(result.prefill.title)
        setDescription(result.prefill.description ?? '')
        setSelectedGenres(result.prefill.genres)
        setContractType(result.prefill.contractType === 'SUBSCRIPTION' ? 'SUBSCRIPTION' : 'SPOT')
        setCommitmentLevel(result.prefill.commitmentLevel as CommitmentLevel)
      }
      setPrefillLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [fromMatch, prefillLoaded])

  // ?assignArtist=<id> でアーティスト名 fetch（banner 表示用）
  useEffect(() => {
    if (!assignArtist) return
    let cancelled = false
    ;(async () => {
      const result = await getArtistNameAction(assignArtist)
      if (cancelled) return
      if (result.ok) setAssignArtistName(result.name)
    })()
    return () => {
      cancelled = true
    }
  }, [assignArtist])

  const applyTemplate = (t: Template) => {
    setTitle(t.title)
    setDescription(t.description)
    setSelectedGenres(t.genres)
    setCommitmentLevel(t.commitmentLevel)
    setAppliedTemplate(t.id)
  }

  const [state, action, isPending] = useActionState(
    async (_prev: { success: boolean; error?: string; field?: string; projectId?: string } | null, formData: FormData) => {
      // ステップをまたいでアンマウントされる入力値を FormData に注入
      formData.set('title', title)
      formData.set('description', description)
      selectedGenres.forEach((g) => formData.append('genres', g))
      formData.set('contractType', contractType)
      formData.set('commitmentLevel', commitmentLevel)
      formData.set('isPrivate', isPrivate ? 'true' : 'false')

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
    <div className="max-w-2xl mx-auto py-6 sm:py-12 px-4">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold mb-1">案件を作成する</h1>
        <p className="text-gray-400 text-xs sm:text-sm">ステップ {step} / 3</p>
      </div>

      {fromMatch && prefillLoaded && title && (
        <div className="mb-6 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-xs sm:text-sm text-purple-800">
          <span className="font-bold">前回の案件から引き継ぎました</span>
          <span className="block text-[11px] text-purple-600 mt-0.5">
            金額・日程は変更できます。そのまま作成すれば同じ内容で再依頼できます。
          </span>
        </div>
      )}

      {assignArtist && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs sm:text-sm text-emerald-800">
          <span className="font-bold">
            {assignArtistName ? `${assignArtistName} の空き日から作成中` : 'アーティストの空き日から作成中'}
          </span>
          <span className="block text-[11px] text-emerald-700 mt-0.5">
            {assignDate && `日程: ${assignDate} `}
            作成後、案件ページから「応募・スカウトを送る」でアーティストに直接お渡しできます。
          </span>
        </div>
      )}

      {/* ステップインジケーター */}
      <div className="flex gap-2 mb-6 sm:mb-8">
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
            {/* テンプレピッカー: LINE/DM の依頼をアプリに移す動線 */}
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <label className="block font-medium">依頼テンプレから始める</label>
                <span className="text-xs text-gray-400">タップで入力欄に反映</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {TEMPLATES.map((t) => {
                  const active = appliedTemplate === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => applyTemplate(t)}
                      className={`text-left p-3 rounded-xl border-2 transition ${
                        active
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 bg-white hover:border-purple-300'
                      }`}
                    >
                      <div className="text-lg mb-1">{t.emoji}</div>
                      <div className="text-sm font-medium text-gray-800 leading-tight">
                        {t.label}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1 leading-snug">
                        {t.hint}
                      </div>
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                ゼロから書きたい場合は下のフォームに直接入力してください。
              </p>
            </div>

            <div>
              <label className="block font-medium mb-1.5">
                案件タイトル <span className="text-red-500">*</span>
              </label>
              <input
                name="title"
                required
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
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
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
                      {type === 'SPOT' ? 'スポット' : 'サブスク'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {type === 'SPOT' ? '単発の案件依頼' : '継続的な長期契約'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-medium mb-2">
                案件の本気度 <span className="text-red-500">*</span>
                <span className="text-gray-400 text-xs font-normal ml-2">
                  （応募側のモチベ・期待値を揃えるためのラベル）
                </span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {COMMITMENT_LEVEL_OPTIONS.map((level) => {
                  const meta = COMMITMENT_LEVEL_LABELS[level]
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setCommitmentLevel(level)}
                      className={`py-3 px-3 rounded-xl border-2 text-left transition ${
                        commitmentLevel === level
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
              {errorState?.field === 'commitmentLevel' && (
                <p className="text-xs text-red-600 mt-2">{errorState.error}</p>
              )}
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
                ※ 成立時に手数料7%が差し引かれます（業界最安水準）。未設定でも公開できます。
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1.5">開始日時（任意）</label>
                <input
                  name="scheduledStartAt"
                  type="datetime-local"
                  defaultValue={prefillStart}
                  className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block font-medium mb-1.5">終了日時（任意）</label>
                <input
                  name="scheduledEndAt"
                  type="datetime-local"
                  defaultValue={prefillEnd}
                  className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <p className="sm:col-span-2 text-xs text-gray-400 -mt-1">
                入力すると受注確定後、両者のカレンダーに自動で反映されます。「いつ空いてる？」の返信が要りません。
              </p>
            </div>

            {/* 公開範囲 */}
            <label className="flex items-start gap-3 bg-pink-50 border border-pink-200 rounded-xl p-4 cursor-pointer">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="mt-1 accent-pink-600"
              />
              <div>
                <p className="text-sm font-medium text-pink-800">
                  非公開案件として作成（相互紹介ボード用）
                </p>
                <p className="text-xs text-pink-700 mt-1">
                  チェックすると一覧には載らず、マッチング済みの相手にチャットから紹介できます。
                </p>
              </div>
            </label>

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
              <p className="text-gray-500">
                本気度: {COMMITMENT_LEVEL_LABELS[commitmentLevel].label}
                <span className="text-gray-400 ml-1">（{COMMITMENT_LEVEL_LABELS[commitmentLevel].description}）</span>
              </p>
              <p className="text-gray-500">公開範囲: {isPrivate ? '非公開（相互紹介）' : '公開（誰でも応募可）'}</p>
            </div>

            {errorState?.error && (
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
                {isPending ? '公開中...' : '案件を公開する'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
