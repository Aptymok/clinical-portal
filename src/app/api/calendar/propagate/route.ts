import { NextResponse } from 'next/server'
import { hasValidCalendarSyncSecret } from '@/lib/calendar/integration-auth'
import { processPropagationJobs } from '@/lib/calendar/propagation'

export async function POST(request: Request) {
  if (!hasValidCalendarSyncSecret(request)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  return NextResponse.json({ results: await processPropagationJobs({ limit: 50 }) })
}
