import { createHmac } from 'node:crypto'
import type { CalendarSource, CanonicalCalendarEvent } from '@prisma/client'
import { sourceConfig, type GenericWebhookSourceConfig } from '@/lib/calendar/source-config'

function writeUrl(source: CalendarSource) {
  const config = sourceConfig<GenericWebhookSourceConfig>(source.config)
  const url = config.writeUrl || process.env.THIRD_CALENDAR_WRITE_URL
  if (!url) throw new Error('Third calendar write URL is not configured')
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || ['localhost','127.0.0.1','::1'].includes(parsed.hostname)) throw new Error('Third calendar destination must be an authenticated HTTPS endpoint')
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
  if (!secret) throw new Error('Third calendar signing secret is required')
  const signature = secret ? createHmac('sha256', secret).update(body).digest('hex') : ''

  const response = await fetch(writeUrl(source), {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
    headers: {
      'content-type': 'application/json',
      ...(signature ? { 'x-clinical-calendar-signature': signature } : {})
    },
    body
  })

  if (!response.ok) throw new Error(`Third calendar webhook failed: ${response.status}`)
  const observedState = await response.json().catch(() => ({ status: response.status }))
  if (observedState.observed !== true || observedState.canonicalKey !== event.canonicalKey || observedState.action !== action || observedState.status !== event.status || (action !== 'CANCEL_OR_FREE' && (Date.parse(observedState.startsAt) !== +event.startsAt || Date.parse(observedState.endsAt) !== +event.endsAt))) throw new Error('Third calendar receipt does not verify the requested event state')
  return { observedState }
}

export function upsertGenericBusy(source: CalendarSource, event: CanonicalCalendarEvent) {
  return send(source, event, 'UPSERT_BUSY')
}

export function cancelGenericBusy(source: CalendarSource, event: CanonicalCalendarEvent) {
  return send(source, event, 'CANCEL_OR_FREE')
}
