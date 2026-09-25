import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const DOCTORIAL_PREFIXES = ['/dashboard', '/patients', '/appointments', '/encounters', '/documents']
const CLINICAL_API_PREFIXES = [
  '/api/dashboard',
  '/api/patients',
  '/api/appointments',
  '/api/encounters',
  '/api/documents',
  '/api/calendar/alerts'
]

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const requiresAuth =
    DOCTORIAL_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + '/')) ||
    CLINICAL_API_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + '/'))

  if (!requiresAuth) return NextResponse.next()

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    const login = new URL('/login', req.url)
    login.searchParams.set('callbackUrl', path)
    return NextResponse.redirect(login)
  }

  const role = String((token as any).role ?? '')
  const staffRoles = new Set(['ADMIN', 'DOCTOR', 'NURSE', 'STAFF'])
  if (!staffRoles.has(role)) {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/patients/:path*',
    '/appointments/:path*',
    '/encounters/:path*',
    '/documents/:path*',
    '/api/dashboard/:path*',
    '/api/patients/:path*',
    '/api/appointments/:path*',
    '/api/encounters/:path*',
    '/api/documents/:path*',
    '/api/calendar/alerts/:path*'
  ]
}
