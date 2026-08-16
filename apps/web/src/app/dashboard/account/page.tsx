import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import AccountNameForm from './AccountNameForm'
import EmailChangeSection from './EmailChangeSection'
import PasswordChangeSection from './PasswordChangeSection'
import DeleteAccountSection from './DeleteAccountSection'
import DataExportSection from './DataExportSection'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'アカウント設定' }

export default async function AccountSettingsPage() {
  const session = await auth()
  if (!session) redirect('/auth')

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      passwordHash: true,
      isGuest: true,
    },
  })

  return (
    <div className="max-w-2xl mx-auto py-6 sm:py-12 px-4">
      <h1 className="text-xl sm:text-2xl font-bold mb-2">アカウント設定</h1>
      <p className="text-sm text-gray-500 mb-6 sm:mb-8">
        ログインに使うアカウント情報を設定します。
      </p>

      <div className="space-y-6">
        <AccountNameForm initialName={user.name} />
        <EmailChangeSection currentEmail={user.email} />
        <PasswordChangeSection passwordSet={Boolean(user.passwordHash)} />
        <DataExportSection />
        <DeleteAccountSection
          passwordSet={Boolean(user.passwordHash)}
          isGuest={user.isGuest}
        />
      </div>
    </div>
  )
}
