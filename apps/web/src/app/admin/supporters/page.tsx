// Admin: Founding Supporter / 認証バッジ 手動管理 (2026-10-17 fee-only pivot §5)
// - Founding Supporter: ヒアリング協力者を永年無償枠 (fee 0% + 認証バッジ無償付与)
// - 認証バッジ: 通常 ¥3,000 買切、ここから手動で付与も可能
// - バッジのみ公開、"誰が Founding か" のリストは外部公開しない (設計決定)

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { SupporterActions } from './supporter-actions'
import { EmailSearchForm } from './email-search-form'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Supporter 管理' }
export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ email?: string }>
}

export default async function AdminSupportersPage({ searchParams }: Props) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') redirect('/')

  const { email: emailQuery } = await searchParams
  const email = emailQuery?.trim() ?? ''

  // 現在の Founding Supporter (isFounderExempt=true) 一覧
  const founders = await prisma.user.findMany({
    where: { isFounderExempt: true },
    select: {
      id: true,
      email: true,
      name: true,
      displayName: true,
      isVerified: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  // メール検索 (付与候補の探索用)
  const searchResult = email
    ? await prisma.user.findMany({
        where: {
          email: { contains: email, mode: 'insensitive' },
          deletedAt: null,
          isGuest: false,
        },
        select: {
          id: true,
          email: true,
          name: true,
          displayName: true,
          isFounderExempt: true,
          isVerified: true,
        },
        take: 20,
      })
    : []

  return (
    <div className="max-w-5xl mx-auto py-8 sm:py-10 px-4">
      <h1 className="text-2xl font-bold mb-2">Supporter 管理</h1>
      <p className="text-sm text-zinc-500 mb-8 leading-relaxed">
        Founding Supporter (ヒアリング協力者優遇枠) と認証バッジ (Verified) を手動で付与・取消。
        Founding Supporter は fee 0% + 認証バッジ無償。
        「誰が Founding か」のリストは外部公開しない方針。
      </p>

      {/* 現在の Founding Supporter 一覧 */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3">
          Founding Supporter 一覧 ({founders.length} 名)
        </h2>
        {founders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-600">
            まだ Founding Supporter は登録されていません。下のメール検索から付与してください。
          </div>
        ) : (
          <ul className="space-y-2">
            {founders.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-zinc-900 truncate">
                    {u.displayName || u.name}
                    {u.isVerified && (
                      <span className="ml-2 inline-block bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        VERIFIED
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">
                    {u.email} · 登録 {u.createdAt.toISOString().slice(0, 10)}
                  </p>
                </div>
                <SupporterActions
                  userId={u.id}
                  isFounder={true}
                  isVerified={u.isVerified}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* メール検索から付与 */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3">
          メール検索 → 付与
        </h2>
        <EmailSearchForm initialEmail={email} />
        {email && (
          <>
            {searchResult.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">
                「{email}」に一致するユーザーが見つかりません。
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {searchResult.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-900 truncate">
                        {u.displayName || u.name}
                        {u.isFounderExempt && (
                          <span className="ml-2 inline-block bg-zinc-900 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                            FOUNDING
                          </span>
                        )}
                        {u.isVerified && (
                          <span className="ml-1.5 inline-block bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                            VERIFIED
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">{u.email}</p>
                    </div>
                    <SupporterActions
                      userId={u.id}
                      isFounder={u.isFounderExempt}
                      isVerified={u.isVerified}
                    />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  )
}
