import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizeDocplannerNotification } from '@/lib/calendar/docplanner'
import { checkCanonicalAvailability } from '@/lib/calendar/availability'
import { ingestCalendarEvent } from '@/lib/calendar/orchestrator'
import { processPropagationJobs } from '@/lib/calendar/propagation'

function validWebhookSecret(request: Request) {
  const expected = process.env.DOCPLANNER_WEBHOOK_SECRET || ''
  const supplied = new URL(request.url).searchParams.get('token') || ''
  if (!expected || !supplied) return false
  const a = Buffer.from(expected)
  const b = Buffer.from(supplied)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  if (!validWebhookSecret(request)) return new Response(null, { status: 401 })

  const payload = await request.json().catch(() => null)
  const sourceId = new URL(request.url).searchParams.get('sourceId') || 'doctoralia'
  const normalized = normalizeDocplannerNotification(sourceId, payload)

  if (normalized.kind === 'availability') {
    const result = await checkCanonicalAvailability(normalized)
    return result.available
      ? new Response(null, { status: 204 })
      : NextResponse.json({ available: false, reason: 'SLOT_ALREADY_OCCUPIED' }, { status: 409 })
  }

  if (normalized.kind === 'ignored') {
    return NextResponse.json({ accepted: true, ignored: normalized.reason })
  }

  try {
    const result = await ingestCalendarEvent(normalized.event, normalized.dedupeKey)
    if (result.propagationQueued) {
      await processPropagationJobs({ syncEventId: result.syncEvent.id })
    }
    return NextResponse.json({
      accepted: true,
      canonicalEventId: result.canonicalEvent?.id,
      conflict: result.conflicts,
      state: result.syncEvent.state
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Docplanner callback processing failed'
    await prisma.calendarAlert.create({
      data: {
        type: 'DOCPLANNER_CALLBACK_FAILED',
        severity: 'CRITICAL',
        message,
        meta: { notificationName: String(payload?.name || 'unknown') }
      }
    }).catch(() => null)

    // Docplanner push notifications are documented as single-delivery.
    // Acknowledge after persisting the operational alert; pull maintenance is the recovery path.
    return NextResponse.json({ accepted: true, recoveryRequired: true })
  }
}
