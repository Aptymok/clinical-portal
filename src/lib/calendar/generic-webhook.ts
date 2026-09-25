import { createHmac } from 'node:crypto'
import type { CalendarSource, CanonicalCalendarEvent } from '@prisma/client'
import { sourceConfig, type GenericWebhookSourceConfig } from '@/lib/calendar/source-config'

function writeUrl(source: CalendarSource) {
  const config = sourceConfig<GenericWebhookSourceConfig>(source.config)
  const url = config.writeUrl || process.env.THIRD_CALENDAR_WRITE_URL
  if (!url) throw new Error('Third calendar write URL is not configured')
  return url
}

async function send(source: CalendarSource, event: CanonicalCalendarEvent, action: string) {
  const body = JSON.stringify({
    action,
    canonicalKey: event.canonicalKey,
    providerRef: event.providerRef,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    timezone: event.timezone,
    status: event.status
  })

  const secret = process.env.THIRD_CALENDAR_WEBHOOK_SECRET || ''
  const signature = secret ? createHmac('sha256', secret).update(body).digest('hex') : ''

  const response = await fetch(writeUrl(source), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(signature ? { 'x-clinical-calendar-signature': signature } : {})
    },
    body
  })

  if (!response.ok) throw new Error(`Third calendar webhook failed: ${response.status}`)
  const observedState = await response.json().catch(() => ({ status: response.status }))
  return { observedState }
}

export function upsertGenericBusy(source: CalendarSource, event: CanonicalCalendarEvent) {
  return send(source, event, 'UPSERT_BUSY')
}

export function cancelGenericBusy(source: CalendarSource, event: CanonicalCalendarEvent) {
  return send(source, event, 'CANCEL_OR_FREE')
}
