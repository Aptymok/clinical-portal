import { createHash } from 'node:crypto';
import type { CalendarSource, CanonicalCalendarEvent } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sourceConfig, type DocplannerSourceConfig } from '@/lib/calendar/source-config';
import type { NormalizedCalendarEvent } from '@/lib/calendar/contracts';
let cachedToken: {
    token: string;
    expiresAt: number;
    domain: string;
} | null = null;
function credentials() {
    const clientId = process.env.DOCPLANNER_CLIENT_ID;
    const clientSecret = process.env.DOCPLANNER_CLIENT_SECRET;
    if (!clientId || !clientSecret)
        throw new Error('Docplanner credentials are not configured');
    return { clientId, clientSecret };
}
function configured(source: CalendarSource) {
    const config = sourceConfig<DocplannerSourceConfig>(source.config);
    const domain = config.domain || process.env.DOCPLANNER_DOMAIN || 'doctoralia.mx';
    const facilityId = config.facilityId || process.env.DOCPLANNER_FACILITY_ID || '';
    const doctorId = config.doctorId || process.env.DOCPLANNER_DOCTOR_ID || '';
    const addressId = config.addressId || process.env.DOCPLANNER_ADDRESS_ID || '';
    if (!facilityId || !doctorId || !addressId)
        throw new Error('Docplanner facility/doctor/address IDs are not configured');
    return { domain, facilityId, doctorId, addressId };
}
export async function docplannerAccessToken(source: CalendarSource) {
    const { domain } = configured(source);
    if (cachedToken && cachedToken.domain === domain && cachedToken.expiresAt > Date.now() + 60000) {
        return cachedToken.token;
    }
    const { clientId, clientSecret } = credentials();
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await fetch(`https://www.${domain}/oauth/v2/token`, {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        redirect: 'error',
        headers: {
            authorization: `Basic ${basic}`,
            'content-type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'integration' })
    });
    if (!response.ok)
        throw new Error(`Docplanner token request failed: ${response.status}`);
    const body = await response.json() as {
        access_token: string;
        expires_in?: number;
    };
    cachedToken = {
        token: body.access_token,
        expiresAt: Date.now() + (body.expires_in || 3600) * 1000,
        domain
    };
    return body.access_token;
}
async function docplannerFetch(source: CalendarSource, path: string, init?: RequestInit) {
    const token = await docplannerAccessToken(source);
    const { domain } = configured(source);
    return fetch(`https://www.${domain}/api/v3/integration${path}`, {
        ...init,
        signal: AbortSignal.timeout(15000),
        redirect: 'error',
        headers: {
            authorization: `Bearer ${token}`,
            'content-type': 'application/json',
            ...(init?.headers || {})
        }
    });
}
function breakPath(source: CalendarSource, breakId?: string) {
    const { facilityId, doctorId, addressId } = configured(source);
    const base = `/facilities/${encodeURIComponent(facilityId)}/doctors/${encodeURIComponent(doctorId)}/addresses/${encodeURIComponent(addressId)}/breaks`;
    return breakId ? `${base}/${encodeURIComponent(breakId)}` : base;
}
async function managedBreak(source: CalendarSource, event: CanonicalCalendarEvent) {
    const mapped = await prisma.calendarExternalEvent.findFirst({ where: { sourceId: source.id, canonicalEventId: event.id, externalEventId: { startsWith: 'break:' } } });
    if (mapped)
        return { id: mapped.externalEventId.slice(6), mapping: mapped };
    // Recover a write that reached Docplanner before local mapping persistence.
    const range=new URLSearchParams({since:new Date(Math.min(+event.startsAt,+event.createdAt)-30*86400000).toISOString(),till:new Date(Math.max(+event.endsAt,Date.now()+366*86400000)).toISOString()});
    const response = await docplannerFetch(source, breakPath(source)+'?'+range.toString());
    if (!response.ok)
        throw new Error('Docplanner managed-break lookup failed');
    const body = await response.json() as {
        _items?: Array<{
            id: string;
            description?: string;
        }>;
        _links?: {
            next?: unknown;
        };
    };
    if (!Array.isArray(body._items) || body._links?.next)
        throw new Error('Docplanner break listing is incomplete; cannot safely retry creation');
    const found = body._items.find(row => row.description === `Clinical Portal|${event.canonicalKey}`);
    return { id: found?.id ? String(found.id) : null, mapping: null };
}
async function verifyBreak(source: CalendarSource, event: CanonicalCalendarEvent, id: string, cancelled = false) {
    const response = await docplannerFetch(source, breakPath(source, id));
    if (cancelled && response.status === 404)
        return { status: 'CANCELLED', verifiedBy: 'PROVIDER_READBACK' };
    if (!response.ok)
        throw new Error('Docplanner break readback failed');
    const body = await response.json() as {
        since?: string;
        till?: string;
        description?: string;
    };
    if (cancelled || Date.parse(body.since || '') !== +event.startsAt || Date.parse(body.till || '') !== +event.endsAt || body.description !== `Clinical Portal|${event.canonicalKey}`)
        throw new Error('Docplanner break readback disagrees with requested state');
    return { status: 'BUSY', verifiedBy: 'PROVIDER_READBACK', since: body.since, till: body.till };
}
export async function upsertDocplannerBusy(source: CalendarSource, event: CanonicalCalendarEvent) {
    const found = await managedBreak(source, event);
    if (found.id) {
        const before = await docplannerFetch(source, breakPath(source, found.id));
        if (!before.ok)
            throw new Error('Docplanner mapped break cannot be verified');
        const original = await before.json() as {
            description?: string;
        };
        if (original.description !== `Clinical Portal|${event.canonicalKey}`)
            throw new Error('Refusing to modify an unmanaged Docplanner break');
    }
    const response = await docplannerFetch(source, breakPath(source, found.id || undefined), { method: found.id ? 'PATCH' : 'POST', body: JSON.stringify({ since: event.startsAt.toISOString(), till: event.endsAt.toISOString(), description: `Clinical Portal|${event.canonicalKey}`, apply_on_coupled_addresses: false }) });
    if (!response.ok)
        throw new Error(`Docplanner break write failed: ${response.status}`);
    const body = await response.json().catch(() => ({})) as {
        id?: string;
    };
    const id = found.id || (body.id ? String(body.id) : null);
    if (!id)
        throw new Error('Docplanner write did not return a break ID');
    const observedState = await verifyBreak(source, event, id);
    const data = { correlationKey: event.canonicalKey, canonicalEventId: event.id, providerRef: event.providerRef, startsAt: event.startsAt, endsAt: event.endsAt, timezone: event.timezone, status: 'SCHEDULED', lastObservedAt: new Date(), rawMeta: { managedBy: 'clinical-portal', kind: 'break' } };
    await prisma.calendarExternalEvent.upsert({ where: { sourceId_externalEventId: { sourceId: source.id, externalEventId: `break:${id}` } }, create: { ...data, sourceId: source.id, externalEventId: `break:${id}` }, update: data });
    return { externalEventId: `break:${id}`, observedState };
}
export async function cancelDocplannerBusy(source: CalendarSource, event: CanonicalCalendarEvent) {
    const found = await managedBreak(source, event);
    if (!found.id)
        return { observedState: { status: 'CANCELLED', verifiedBy: 'PROVIDER_LIST_READBACK' } };
    const before = await docplannerFetch(source, breakPath(source, found.id));
    if (before.ok) {
        const body = await before.json() as {
            description?: string;
        };
        if (body.description !== `Clinical Portal|${event.canonicalKey}`)
            throw new Error('Refusing to delete an unmanaged Docplanner break');
        const removed = await docplannerFetch(source, breakPath(source, found.id), { method: 'DELETE' });
        if (!removed.ok && removed.status !== 404)
            throw new Error('Docplanner break deletion failed');
    }
    else if (before.status !== 404)
        throw new Error('Docplanner break lookup before deletion failed');
    const observedState = await verifyBreak(source, event, found.id, true);
    if (found.mapping)
        await prisma.calendarExternalEvent.update({ where: { id: found.mapping.id }, data: { status: 'CANCELLED', lastObservedAt: new Date() } });
    return { externalEventId: `break:${found.id}`, observedState };
}
function idFrom(value: any) {
    return value?.id ? String(value.id) : null;
}
export function normalizeDocplannerNotification(sourceId: string, payload: any): {
    kind: 'availability';
    startsAt: string;
    endsAt: string;
    providerRef: string;
} | {
    kind: 'event';
    event: NormalizedCalendarEvent;
    dedupeKey: string;
} | {
    kind: 'ignored';
    reason: string;
} {
    const name = String(payload?.name || '');
    const data = payload?.data || {};
    const providerRef = process.env.CALENDAR_PROVIDER_REF || 'dr-guillermo';
    if (name === 'slot-booking') {
        const request = data.visit_booking_request;
        if (!request?.start_at || !request?.end_at)
            return { kind: 'ignored', reason: 'slot-booking-without-range' };
        return { kind: 'availability', startsAt: request.start_at, endsAt: request.end_at, providerRef };
    }
    const booking = data.visit_booking || data.booking;
    const calendarBreak = data.break;
    const entity = booking || calendarBreak;
    if (!entity)
        return { kind: 'ignored', reason: `unsupported:${name}` };
    const startsAt = booking?.start_at || calendarBreak?.since;
    const endsAt = booking?.end_at || calendarBreak?.till;
    if (!startsAt || !endsAt)
        return { kind: 'ignored', reason: `missing-range:${name}` };
    const entityId = idFrom(entity) || createHash('sha256')
        .update(JSON.stringify({ name, startsAt, endsAt, createdAt: payload?.created_at }))
        .digest('hex')
        .slice(0, 24);
    const isBreak = Boolean(calendarBreak);
    const externalEventId = `${isBreak ? 'break' : 'booking'}:${entityId}`;
    const description = String(calendarBreak?.description || '');
    const echoKey = description.startsWith('Clinical Portal|')
        ? description.slice('Clinical Portal|'.length)
        : null;
    const cancelled = name.includes('canceled') || name.includes('cancelled') || name.includes('removed');
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
    };
    const dedupeKey = `docplanner:${sourceId}:${name}:${externalEventId}:${payload?.created_at || startsAt}`;
    return { kind: 'event', event, dedupeKey };
}
export async function pullDocplannerNotifications(sourceId = 'doctoralia') {
    const source = await prisma.calendarSource.findUnique({ where: { id: sourceId } });
    if (!source || source.providerType !== 'DOCPLANNER')
        throw new Error('Invalid Docplanner source');
    const response = await docplannerFetch(source, '/notifications/multiple?limit=100');
    if (response.status === 404)
        return [];
    if (!response.ok)
        throw new Error(`Docplanner notification pull failed: ${response.status}`);
    const body = await response.json() as {
        notifications?: any[];
    };
    return body.notifications || [];
}
