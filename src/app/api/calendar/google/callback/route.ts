import { NextResponse, type NextRequest } from 'next/server'
import { verifyCalendarOAuthState } from '@/lib/calendar/oauth-state'
import { completeGoogleOAuth } from '@/lib/calendar/google'
import { processPropagationJobs } from '@/lib/calendar/propagation'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')
  const site = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, '')

  if (error) return NextResponse.redirect(`${site}/dashboard?calendar=google-denied`)
  if (!code || !state) return NextResponse.json({ error: 'INVALID_GOOGLE_CALLBACK' }, { status: 400 })

  try {
    if(request.cookies.get('clinical-calendar-state')?.value!==state)throw new Error('OAuth state does not match this browser session')
    const verified = verifyCalendarOAuthState(state)
    await completeGoogleOAuth(verified.sourceId, code)
    await processPropagationJobs({ limit: 50 })
    const response=NextResponse.redirect(`${site}/dashboard?calendar=google-connected`)
    response.cookies.set('clinical-calendar-state','',{httpOnly:true,secure:new URL(request.url).protocol==='https:',sameSite:'lax',path:'/api/calendar/google/callback',maxAge:0})
    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Google connection failed'
    return NextResponse.json({ error: 'GOOGLE_CONNECTION_FAILED', message }, { status: 409 })
  }
}
