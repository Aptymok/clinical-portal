import { createHash } from 'node:crypto'
import type { CalendarSource, CanonicalCalendarEvent } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { sourceConfig, type DocplannerSourceConfig } from '@/lib/calendar/source-config'
import type { NormalizedCalendarEvent } from '@/lib/calendar/contracts'

let cachedToken: { token: string; expiresAt: number; domain: string } | null = null

function credentials() {
  const clientId = process.env.DOCPLANNER_CLIENT_ID
  const clientSecret = process.env.DOCPLANNER_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('Docplanner credentials are not configured')
  return { clientId, clientSecret }
}

function configured(source: CalendarSource) {
  const config = sourceConfig<DocplannerSourceConfig>(source.config)
  const domain = config.domain || process.env.DOCPLANNER_DOMAIN || 'doctoralia.mx'
  const facilityId = config.facilityId || process.env.DOCPLANNER_FACILITY_ID || ''
  const doctorId = config.doctorId || process.env.DOCPLANNER_DOCTOR_ID || ''
  const addressId = config.addressId || process.env.DOCPLANNER_ADDRESS_ID || ''
  if (!facilityId || !doctorId || !addressId) throw new Error('Docplanner facility/doctor/address IDs are not configured')
  return { domain, facilityId, doctorId, addressId }
}

export async function docplannerAccessToken(source: CalendarSource) {
  const { domain } = configured(source)
  if (cachedToken && cachedToken.domain === domain && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token
  }

  const { clientId, clientSecret } = credentials()
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const response = await fetch(`https://www.${domain}/oauth/v2/token`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${basic}`,
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'integration' })
  })

  if (!response.ok) throw new Error(`Docplanner token request failed: ${response.status}`)
  const body = await response.json() as { access_token: string; expires_in?: number }
  cachedToken = {
    token: body.access_token,
    expiresAt: Date.now() + (body.expires_in || 3600) * 1000,
    domain
  }
  return body.access_token
}

async function docplannerFetch(source: CalendarSource, path: string, init?: RequestInit) {
  const token = await docplannerAccessToken(source)
  const { domain } = configured(source)
  return fetch(`https://www.${domain}/api/v3/integration${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...(init?.headers || {})
    }
  })
}

function breakPath(source: CalendarSource, breakId?: string) {
  const { facilityId, doctorId, addressId } = configured(source)
  const base = `/facilities/${encodeURIComponent(facilityId)}/doctors/${encodeURIComponent(doctorId)}/addresses/${encodeURIComponent(addressId)}/breaks`
  return breakId ? `${base}/${encodeURIComponent(breakId)}` : base
}

export async function upsertDocplannerBusy(source: CalendarSource, event: CanonicalCalendarEvent) {
  const existing = await prisma.calendarExternalEvent.findFirst({
    where: { sourceId: source.id, canonicalEventId: event.id, externalEventId: { startsWith: 'break:' } }
  })

  if (existing) {
    const breakId = existing.externalEventId.slice('break:'.length)
    const response = await docplannerFetch(source, breakPath(source, breakId), {
      method: 'PATCH',
      body: JSON.stringify({ since: event.startsAt.toISOString(), till: event.endsAt.toISOString() })
    })
    if (!response.ok) throw new Error(`Docplanner break update failed: ${response.status}`)
    await prisma.calendarExternalEvent.update({
      where: { id: existing.id },
      data: {
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        status: 'SCHEDULED',
        lastObservedAt: new Date()
      }
    })
    return { externalEventId: existing.externalEventId, observedState: { status: response.status } }
  }

  const response = await docplannerFetch(source, breakPath(source), {
    method: 'POST',
    body: JSON.stringify({
      since: event.startsAt.toISOString(),
      till: event.endsAt.toISOString(),
      description: `Clinical Portal|${event.canonicalKey}`,
      apply_on_coupled_addresses: false
    })
  })

  if (!response.ok) throw new Error(`Docplanner break creation failed: ${response.status}`)
  const body = await response.json() as { id: string; since?: string; till?: string }

  await prisma.calendarExternalEvent.create({
    data: {
      sourceId: source.id,
      externalEventId: `break:${body.id}`,
      canonicalEventId: event.id,
      correlationKey: event.canonicalKey,
      providerRef: event.providerRef,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      timezone: event.timezone,
      status: 'SCHEDULED',
      rawMeta: { managedBy: 'clinical-portal', kind: 'break' }
    }
  })

  return { externalEventId: `break:${body.id}`, observedState: body }
}

export async function cancelDocplannerBusy(source: CalendarSource, event: CanonicalCalendarEvent) {
  const existing = await prisma.calendarExternalEvent.findFirst({
    where: { sourceId: source.id, canonicalEventId: event.id, externalEventId: { startsWith: 'break:' } }
  })

  if (!existing) return { observedState: { skipped: 'no-managed-break' } }

  const breakId = existing.externalEventId.slice('break:'.length)
  const response = await docplannerFetch(source, breakPath(source, breakId), { method: 'DELETE' })
  if (!response.ok && response.status !== 404) {
    throw new Error(`Docplanner break deletion failed: ${response.status}`)
  }

  await prisma.calendarExternalEvent.update({
    where: { id: existing.id },
    data: { status: 'CANCELLED', lastObservedAt: new Date() }
  })

  return { externalEventId: existing.externalEventId, observedState: { status: response.status } }
}

function idFrom(value: any) {
  return value?.id ? String(value.id) : null
}

export function normalizeDocplannerNotification(sourceId: string, payload: any):
  | { kind: 'availability'; startsAt: string; endsAt: string; providerRef: string }
  | { kind: 'event'; event: NormalizedCalendarEvent; dedupeKey: string }
  | { kind: 'ignored'; reason: string } {
  const name = String(payload?.name || '')
  const data = payload?.data || {}
  const providerRef = process.env.CALENDAR_PROVIDER_REF || 'dr-guillermo'

  if (name === 'slot-booking') {
    const request = data.visit_booking_request
    if (!request?.start_at || !request?.end_at) return { kind: 'ignored', reason: 'slot-booking-without-range' }
    return { kind: 'availability', startsAt: request.start_at, endsAt: request.end_at, providerRef }
  }

  const booking = data.visit_booking || data.booking
  const calendarBreak = data.break
  const entity = booking || calendarBreak
  if (!entity) return { kind: 'ignored', reason: `unsupported:${name}` }

  const startsAt = booking?.start_at || calendarBreak?.since
  const endsAt = booking?.end_at || calendarBreak?.till
  if (!startsAt || !endsAt) return { kind: 'ignored', reason: `missing-range:${name}` }

  const entityId = idFrom(entity) || createHash('sha256')
    .update(JSON.stringify({ name, startsAt, endsAt, createdAt: payload?.created_at }))
    .digest('hex')
    .slice(0, 24)

  const isBreak = Boolean(calendarBreak)
  const externalEventId = `${isBreak ? 'break' : 'booking'}:${entityId}`
  const description = String(calendarBreak?.description || '')
  const echoKey = description.startsWith('Clinical Portal|')
    ? description.slice('Clinical Portal|'.length)
    : null

  const cancelled = name.includes('canceled') || name.includes('cancelled') || name.includes('removed')
  const event: NormalizedCalendarEvent = {
    sourceId,
    externalEventId,
    correlationKey: echoKey || `docplanner:${externalEventId}`,
    canonicalEcho: Boolean(echoKey),
    providerRef,
    startsAt,
    endsAt,
    timezone: 'America/Mexico_City',
    status: cancelled ? 'CANCELLED' : 'SCHEDULED',
    summary: isBreak ? 'Doctoralia calendar break' : 'Doctoralia booking',
    sourceUpdatedAt: payload?.created_at || null
  }

  const dedupeKey = `docplanner:${sourceId}:${name}:${externalEventId}:${payload?.created_at || startsAt}`
  return { kind: 'event', event, dedupeKey }
}

export async function pullDocplannerNotifications(sourceId = 'doctoralia') {
  const source = await prisma.calendarSource.findUnique({ where: { id: sourceId } })
  if (!source || source.providerType !== 'DOCPLANNER') throw new Error('Invalid Docplanner source')

  const response = await docplannerFetch(source, '/notifications/multiple?limit=100')
  if (response.status === 404) return []
  if (!response.ok) throw new Error(`Docplanner notification pull failed: ${response.status}`)

  const body = await response.json() as { notifications?: any[] }
  return body.notifications || []
}
