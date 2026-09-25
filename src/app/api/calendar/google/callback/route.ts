import { NextResponse } from 'next/server'
import { verifyCalendarOAuthState } from '@/lib/calendar/oauth-state'
import { completeGoogleOAuth } from '@/lib/calendar/google'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')
  const site = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')

  if (error) return NextResponse.redirect(`${site}/dashboard?calendar=google-denied`)
  if (!code || !state) return NextResponse.json({ error: 'INVALID_GOOGLE_CALLBACK' }, { status: 400 })

  try {
    const verified = verifyCalendarOAuthState(state)
    await completeGoogleOAuth(verified.sourceId, code)
    return NextResponse.redirect(`${site}/dashboard?calendar=google-connected`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Google connection failed'
    return NextResponse.json({ error: 'GOOGLE_CONNECTION_FAILED', message }, { status: 409 })
  }
}
