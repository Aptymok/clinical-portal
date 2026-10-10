import { NextResponse } from 'next/server'
import { CalendarAvailabilitySchema } from '@/schemas/calendar.schema'
import { hasValidCalendarSyncSecret } from '@/lib/calendar/integration-auth'
import { checkCanonicalAvailability } from '@/lib/calendar/availability'
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
    const sources = await prisma.calendarSource.findMany({ where: { enabled: true } })
    const unverified = sources.filter((source) => !source.readAuthority || !source.lastSyncAt || (source.providerType === 'GOOGLE_CALENDAR' && !source.webhookEnabled))
    if (sources.length === 0 || unverified.length > 0) {
      return NextResponse.json({ available: false, reason: 'CALENDAR_COVERAGE_UNVERIFIED', unverifiedSources: unverified.map((source) => source.id) }, { status: 503 })
    }
    const result = await checkCanonicalAvailability(parsed.data)

    if (!result.available) {
      return NextResponse.json({
        available: false,
        reason: 'SLOT_ALREADY_OCCUPIED',
        occupiedBy: result.occupiedBy
      }, { status: 409 })
    }

    return new Response(null, { status: 204 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Availability check failed'
    return NextResponse.json({ error: 'AVAILABILITY_CHECK_FAILED', message }, { status: 400 })
  }
}
