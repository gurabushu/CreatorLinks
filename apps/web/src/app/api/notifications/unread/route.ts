// 未読通知数を返す軽量 API。bell polling 用。
// 認証済ユーザー自身の count を返すだけなので leak リスクなし。

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ count: 0 }, { status: 401 })
  try {
    const count = await prisma.notification.count({
      where: { userId: session.user.id, readAt: null },
    })
    return NextResponse.json({ count })
  } catch {
    return NextResponse.json({ count: 0 }, { status: 503 })
  }
}
