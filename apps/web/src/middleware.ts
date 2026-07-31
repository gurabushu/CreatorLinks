import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Credentials sign-in の総当たり対策（Auth.js v5 は /api/auth/callback/credentials に POST）
  if (pathname === '/api/auth/callback/credentials' && req.method === 'POST') {
    const ip = getClientIp(req.headers)
    const rl = await checkRateLimit('auth', `signin:${ip}`)
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'rate limited' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
      )
    }
    return NextResponse.next()
  }

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NODE_ENV === 'production',
  })

  const protectedPaths = ['/dashboard', '/projects/new', '/projects/manage']
  const adminPaths = ['/admin']

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p))
  const isAdmin = adminPaths.some((p) => pathname.startsWith(p))

  if (!token && isProtected) {
    return NextResponse.redirect(new URL('/auth', req.url))
  }

  if (isAdmin && (token?.role as string) !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', req.url))
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/projects/new',
    '/projects/manage/:path*',
    '/admin/:path*',
    '/api/auth/callback/credentials',
  ],
}
