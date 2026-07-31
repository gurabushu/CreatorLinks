import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { SidebarShell } from './sidebar-shell'

export async function DashboardShell({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/auth')

  let unreadCount = 0
  try {
    unreadCount = await prisma.message.count({
      where: {
        match: { artistId: session.user.id },
        readAt: null,
        NOT: { senderId: session.user.id },
      },
    })
  } catch {
    // DB unreachable — バッジなしで表示
  }

  return (
    <SidebarShell
      user={{ name: session.user.name, role: session.user.role }}
      unreadCount={unreadCount}
    >
      {children}
    </SidebarShell>
  )
}
