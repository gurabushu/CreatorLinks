import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { SidebarShell } from './sidebar-shell'

export async function DashboardShell({
  children,
  requireAuth = true,
}: {
  children: React.ReactNode
  requireAuth?: boolean
}) {
  const session = await auth()
  if (!session) {
    if (requireAuth) redirect('/auth')
    return <>{children}</>
  }

  let unreadCount = 0
  let announcementUnread = 0
  try {
    const [msgs, annBase] = await Promise.all([
      prisma.message.count({
        where: {
          match: { artistId: session.user.id },
          readAt: null,
          NOT: { senderId: session.user.id },
        },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { announcementsReadAt: true },
      }),
    ])
    unreadCount = msgs
    const now = new Date()
    announcementUnread = await prisma.announcement.count({
      where: {
        publishedAt: {
          lte: now,
          ...(annBase?.announcementsReadAt ? { gt: annBase.announcementsReadAt } : {}),
        },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    })
  } catch {
    // DB unreachable — バッジなしで表示
  }

  return (
    <SidebarShell
      user={{ name: session.user.name, role: session.user.role }}
      unreadCount={unreadCount}
      announcementUnread={announcementUnread}
    >
      {children}
    </SidebarShell>
  )
}
