// app/projects/new/page.tsx — 案件作成（マルチステップ / CSR）

'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  createProjectAction,
  getArtistNameAction,
  getProjectPrefillFromMatchAction,
} from '@/server/actions/project'
import {
  createProjectTemplateAction,
  deleteProjectTemplateAction,
  listMyProjectTemplatesAction,
  type MyTemplate,
} from '@/server/actions/project-template'
import { COMMITMENT_LEVEL_LABELS, type CommitmentLevel } from '@creator-links/shared'
import Link from 'next/link'

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
  // F6: マイテンプレ (PRO 特典)
  const [myTemplates, setMyTemplates] = useState<MyTemplate[]>([])
  const [isPro, setIsPro] = useState(false)
  const [templatesLoaded, setTemplatesLoaded] = useState(false)
  const [budget, setBudget] = useState<string>('')
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [templateLabel, setTemplateLabel] = useState('')
  const [templateSaveError, setTemplateSaveError] = useState<string | null>(null)
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

  // F6: マイテンプレを取得
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const result = await listMyProjectTemplatesAction()
      if (cancelled) return
      setMyTemplates(result.templates)
      setIsPro(result.isPro)
      setTemplatesLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

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

  // F6: 保存済みマイテンプレ (PRO) を反映。built-in と違い budget と contractType もある。
  const applyMyTemplate = (t: MyTemplate) => {
    setTitle(t.title)
    setDescription(t.description ?? '')
    setSelectedGenres(t.genres)
    setContractType(t.contractType === 'SUBSCRIPTION' ? 'SUBSCRIPTION' : 'SPOT')
    setCommitmentLevel(t.commitmentLevel as CommitmentLevel)
    if (t.budget != null) setBudget(String(t.budget))
    setAppliedTemplate(`my:${t.id}`)
  }

  const handleDeleteMyTemplate = async (id: string) => {
    if (!confirm('このテンプレを削除します。よろしいですか？')) return
    const result = await deleteProjectTemplateAction(id)
    if (result.success) {
      setMyTemplates((prev) => prev.filter((t) => t.id !== id))
    } else {
      alert(result.error)
    }
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
      // budget は step3 で controlled 化しているので FormData 側にも反映
      if (budget) formData.set('budget', budget)

      const result = await createProjectAction(null, formData)

      // F6: 「テンプレとして保存」 (PRO)。案件作成に成功した後に別途保存。
      // 保存失敗は案件公開の成功を妨げないため銀のエラー扱い。
      if (result.success && saveAsTemplate && isPro && templateLabel.trim()) {
        const parsedBudget = budget ? Number(budget) : null
        const saveResult = await createProjectTemplateAction({
          label: templateLabel.trim(),
          title,
          description,
          genres: selectedGenres,
          budget: parsedBudget != null && !Number.isNaN(parsedBudget) ? parsedBudget : null,
          contractType,
          commitmentLevel,
        })
        if (!saveResult.success) {
          // 案件公開後なのでリダイレクトは実行、テンプレエラーだけ画面に残す
          setTemplateSaveError(saveResult.error)
        }
      }

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

            {/* F6: マイテンプレ (PRO 特典) — 過去に作った案件をワンタップで再利用 */}
            {templatesLoaded && (
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <label className="block font-medium">
                    マイテンプレ
                    <span className="text-[10px] font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-1.5 py-0.5 rounded ml-2 align-middle">
                      PRO
                    </span>
                  </label>
                  {isPro && myTemplates.length > 0 && (
                    <span className="text-xs text-gray-400">{myTemplates.length} 件</span>
                  )}
                </div>
                {!isPro ? (
                  <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50/60 p-4 text-xs text-purple-800 leading-relaxed">
                    自分の案件をテンプレ化し、次回以降ワンタップで呼び出せます（
                    <Link href="/pro/subscribe" className="font-bold underline hover:text-purple-900">
                      PRO 詳細
                    </Link>
                    ）。
                  </div>
                ) : myTemplates.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-xs text-gray-500 leading-relaxed">
                    まだ保存済みテンプレはありません。この画面下部の「テンプレとして保存」で登録できます。
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {myTemplates.map((t) => {
                      const active = appliedTemplate === `my:${t.id}`
                      return (
                        <div
                          key={t.id}
                          className={`relative rounded-xl border-2 transition ${
                            active
                              ? 'border-purple-600 bg-purple-50'
                              : 'border-gray-200 bg-white hover:border-purple-300'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => applyMyTemplate(t)}
                            className="w-full text-left p-3 pr-9"
                          >
                            <div className="text-sm font-medium text-gray-800 leading-tight truncate">
                              {t.label}
                            </div>
                            <div className="text-[11px] text-gray-500 mt-1 leading-snug line-clamp-1">
                              {t.title}
                            </div>
                            <div className="text-[10px] text-gray-400 mt-1 flex flex-wrap gap-1">
                              {t.genres.slice(0, 3).map((g) => (
                                <span
                                  key={g}
                                  className="bg-gray-100 rounded px-1.5 py-0.5"
                                >
                                  {g}
                                </span>
                              ))}
                              {t.budget != null && (
                                <span className="bg-purple-100 text-purple-700 rounded px-1.5 py-0.5">
                                  ¥{t.budget.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMyTemplate(t.id)}
                            aria-label="テンプレを削除"
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center text-xs"
                          >
                            ×
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

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
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
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

            {/* F6: テンプレとして保存 (PRO 特典) */}
            {templatesLoaded && (
              isPro ? (
                <div className="rounded-xl border border-purple-200 bg-white p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveAsTemplate}
                      onChange={(e) => setSaveAsTemplate(e.target.checked)}
                      className="mt-1 accent-purple-600"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">
                        テンプレとして保存
                        <span className="text-[10px] font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-1.5 py-0.5 rounded ml-2 align-middle">
                          PRO
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        次回以降、この案件の内容をワンタップで呼び出せます。
                      </p>
                    </div>
                  </label>
                  {saveAsTemplate && (
                    <div className="mt-3 pl-7">
                      <input
                        type="text"
                        value={templateLabel}
                        onChange={(e) => setTemplateLabel(e.target.value)}
                        maxLength={50}
                        placeholder="テンプレ名（例: 定期 YouTube BGM 依頼）"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <p className="text-[11px] text-gray-400 mt-1">
                        50 文字以内。マイテンプレ一覧に表示されます。
                      </p>
                    </div>
                  )}
                  {templateSaveError && (
                    <p className="text-xs text-red-600 mt-2 pl-7">
                      テンプレ保存に失敗しました: {templateSaveError}
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50/60 p-4 text-xs text-purple-800 leading-relaxed">
                  💡 PRO なら、この案件を「テンプレとして保存」して次回ワンタップで呼び出せます（
                  <Link href="/pro/subscribe" className="font-bold underline hover:text-purple-900">
                    PRO 詳細
                  </Link>
                  ）。
                </div>
              )
            )}

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
