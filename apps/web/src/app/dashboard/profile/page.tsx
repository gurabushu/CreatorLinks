import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ProfileEditForm from './ProfileEditForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'プロフィール編集' }

export default async function ProfileEditPage() {
  const session = await auth()
  if (!session) redirect('/auth')

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { name: true, email: true, bio: true, genres: true, avatarUrl: true, coverUrl: true },
  })

  return <ProfileEditForm user={user} />
}
