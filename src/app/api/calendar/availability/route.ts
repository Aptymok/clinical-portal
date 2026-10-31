import { NextResponse } from 'next/server'
import { CalendarAvailabilitySchema } from '@/schemas/calendar.schema'
import { hasValidCalendarSyncSecret } from '@/lib/calendar/integration-auth'
import { checkCanonicalAvailability } from '@/lib/calendar/availability'
import { calendarCoverage } from '@/lib/calendar/coverage'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  if (!hasValidCalendarSyncSecret(request)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const parsed = CalendarAvailabilitySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_SLOT', details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const sources = await prisma.calendarSource.findMany()
    const coverage = calendarCoverage(sources)
    if (!coverage.verified) return NextResponse.json({ available: false, reason: 'CALENDAR_COVERAGE_UNVERIFIED', unverifiedSources: coverage.unverifiedSources }, {status:503})
    const result = await checkCanonicalAvailability(parsed.data)

    if (!result.available) {
      return NextResponse.json({
        available: false,
        reason: result.occupiedBy && 'kind' in result.occupiedBy && result.occupiedBy.kind==='UNCONFIRMED_PROPAGATION' ? 'PROPAGATION_UNVERIFIED' : 'SLOT_ALREADY_OCCUPIED',
        occupiedBy: result.occupiedBy
      }, { status: result.occupiedBy && 'kind' in result.occupiedBy && result.occupiedBy.kind==='UNCONFIRMED_PROPAGATION' ? 503 : 409 })
    }

    return new Response(null, { status: 204 })
  } catch (error) {
    if(error instanceof Error && error.message==='CALENDAR_PROVIDER_MAPPING_UNVERIFIED')return NextResponse.json({available:false,reason:error.message},{status:503})
    const message = error instanceof Error ? error.message : 'Availability check failed'
    return NextResponse.json({ error: 'AVAILABILITY_CHECK_FAILED', message }, { status: 400 })
  }
}
