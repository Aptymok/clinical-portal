import { NextResponse } from 'next/server'
import { signCalendarOAuthState } from '@/lib/calendar/oauth-state'
import { googleRedirectUri } from '@/lib/calendar/google'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const sourceId = url.searchParams.get('sourceId') || 'google-primary'
  const source = await prisma.calendarSource.findUnique({ where: { id: sourceId } })
  if (!source || source.providerType !== 'GOOGLE_CALENDAR') return NextResponse.json({ error: 'INVALID_GOOGLE_CALENDAR_SOURCE' }, { status: 404 })
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) return NextResponse.json({ error: 'GOOGLE_CLIENT_ID_NOT_CONFIGURED' }, { status: 503 })

  const state = signCalendarOAuthState({ sourceId, issuedAt: Date.now() })
  const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  auth.searchParams.set('client_id', clientId)
  auth.searchParams.set('redirect_uri', googleRedirectUri())
  auth.searchParams.set('response_type', 'code')
  auth.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar')
  auth.searchParams.set('access_type', 'offline')
  auth.searchParams.set('prompt', 'consent')
  auth.searchParams.set('state', state)

  return NextResponse.redirect(auth)
}
