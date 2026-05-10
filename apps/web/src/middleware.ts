import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const { pathname } = req.nextUrl

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
  ],
}
