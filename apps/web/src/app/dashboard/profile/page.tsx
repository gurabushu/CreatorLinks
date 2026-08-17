import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ProfileEditForm from './ProfileEditForm'
import { ExternalLinksSection } from './ExternalLinksSection'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'プロフィール編集' }

export default async function ProfileEditPage() {
  const session = await auth()
  if (!session) redirect('/auth')

  const [user, externalLinks] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: {
        name: true,
        displayName: true,
        bio: true,
        genres: true,
        avatarUrl: true,
        coverUrl: true,
        gender: true,
        heightCm: true,
        activityYears: true,
        skillLevel: true,
        instruments: true,
      },
    }),
    prisma.userExternalLink.findMany({
      where: { userId: session.user.id },
      orderBy: { position: 'asc' },
      select: { id: true, platform: true, url: true, label: true },
    }),
  ])

  return (
    <>
      <ProfileEditForm user={user} />
      <ExternalLinksSection initialLinks={externalLinks} />
    </>
  )
}
