import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { CalendarIntakeSchema } from '@/schemas/calendar.schema'
import { hasValidCalendarSyncSecret } from '@/lib/calendar/integration-auth'
import { ingestCalendarEvent } from '@/lib/calendar/orchestrator'
import { processPropagationJobs } from '@/lib/calendar/propagation'

export const runtime = 'nodejs'

function dedupeKeyFor(body: unknown) {
  return createHash('sha256').update(JSON.stringify(body)).digest('hex')
}

export async function POST(request: Request) {
  if (!hasValidCalendarSyncSecret(request)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const parsed = CalendarIntakeSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_EVENT', details: parsed.error.flatten() }, { status: 400 })
  }

  const requestedKey = request.headers.get('idempotency-key')?.trim()
  const dedupeKey = requestedKey || dedupeKeyFor(parsed.data)

  try {
    const result = await ingestCalendarEvent(parsed.data, dedupeKey)
    const propagation = result.propagationQueued
      ? await processPropagationJobs({ syncEventId: result.syncEvent.id })
      : []

    return NextResponse.json({
      accepted: true,
      duplicate: result.duplicate,
      canonicalEventId: result.canonicalEvent?.id,
      canonicalKey: result.canonicalEvent?.canonicalKey,
      conflict: result.conflicts,
      propagationQueued: result.propagationQueued,
      propagation,
      state: result.syncEvent.state
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Calendar intake failed'
    return NextResponse.json({ error: 'CALENDAR_INTAKE_FAILED', message }, { status: 409 })
  }
}
