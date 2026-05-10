import { auth } from '@/lib/auth'

// 認証保護ルート定義
export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isLoggedIn = !!session

  const protectedPaths = ['/dashboard', '/projects/new', '/projects/manage']
  const adminPaths = ['/admin']

  const isProtected = protectedPaths.some((p) => nextUrl.pathname.startsWith(p))
  const isAdmin = adminPaths.some((p) => nextUrl.pathname.startsWith(p))

  if (!isLoggedIn && isProtected) {
    return Response.redirect(new URL('/auth', nextUrl))
  }

  if (isAdmin && session?.user.role !== 'ADMIN') {
    return Response.redirect(new URL('/', nextUrl))
  }
})

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/projects/new',
    '/projects/manage/:path*',
    '/admin/:path*',
  ],
}
