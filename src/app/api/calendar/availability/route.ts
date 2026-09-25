import { CalendarAvailabilitySchema } from '@/schemas/calendar.schema'
import { hasValidCalendarSyncSecret } from '@/lib/calendar/integration-auth'
import { checkCanonicalAvailability } from '@/lib/calendar/availability'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  if (!hasValidCalendarSyncSecret(request)) {
    return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const parsed = CalendarAvailabilitySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: 'INVALID_SLOT', details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const result = await checkCanonicalAvailability(parsed.data)

    if (!result.available) {
      return Response.json({
        available: false,
        reason: 'SLOT_ALREADY_OCCUPIED',
        occupiedBy: result.occupiedBy
      }, { status: 409 })
    }

    return new Response(null, { status: 204 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Availability check failed'
    return Response.json({ error: 'AVAILABILITY_CHECK_FAILED', message }, { status: 400 })
  }
}
