import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import FanSupportClient from './FanSupportClient'

interface Props {
  params: Promise<{ artistId: string }>
  searchParams: Promise<{ success?: string }>
}

export default async function FanSupportPage({ params, searchParams }: Props) {
  const { artistId } = await params
  const { success } = await searchParams

  const artist = await prisma.user.findUnique({
    where: { id: artistId },
    select: { name: true, role: true },
  })

  if (!artist) notFound()

  return <FanSupportClient artistId={artistId} artistName={artist.name} success={success} />
}
