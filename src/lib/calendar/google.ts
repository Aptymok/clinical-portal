import { googleDateValue } from './google-date';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { CalendarSource, CanonicalCalendarEvent } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { readCalendarSecret, writeCalendarSecret } from '@/lib/calendar/secrets';
import { patchCalendarSourceConfig, sourceConfig, type GoogleSourceConfig } from '@/lib/calendar/source-config';
import { ingestCalendarEvent } from '@/lib/calendar/orchestrator';
type GoogleTokenSet = {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    scope?: string;
};
type GoogleEvent = {
    id: string;
    status?: string;
    transparency?: string;
    summary?: string;
    location?: string;
    updated?: string;
    start?: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    end?: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    extendedProperties?: {
        private?: Record<string, string>;
    };
};
const GOOGLE_API = 'https://www.googleapis.com/calendar/v3';
function clientConfig() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret)
        throw new Error('Google OAuth credentials are not configured');
    return { clientId, clientSecret };
}
export function googleRedirectUri() {
    const site = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
    if (!site)
        throw new Error('NEXT_PUBLIC_SITE_URL is required for Google OAuth');
    return `${site}/api/calendar/google/callback`;
}
async function refreshGoogleAccess(sourceId: string, tokens: GoogleTokenSet) {
    if (tokens.expiresAt > Date.now() + 60000)
        return tokens.accessToken;
    const { clientId, clientSecret } = clientConfig();
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        redirect: 'error',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: tokens.refreshToken,
            grant_type: 'refresh_token'
        })
    });
    if (!response.ok)
        throw new Error(`Google token refresh failed: ${response.status}`);
    const body = await response.json() as {
        access_token: string;
        expires_in: number;
        scope?: string;
    };
    const updated: GoogleTokenSet = {
        ...tokens,
        accessToken: body.access_token,
        expiresAt: Date.now() + body.expires_in * 1000,
        scope: body.scope ?? tokens.scope
    };
    await writeCalendarSecret(sourceId, updated);
    return updated.accessToken;
}
export async function googleAccessToken(sourceId: string) {
    const tokens = await readCalendarSecret<GoogleTokenSet>(sourceId);
    if (!tokens?.refreshToken)
        throw new Error('Google calendar source is not connected');
    return refreshGoogleAccess(sourceId, tokens);
}
async function googleFetch(sourceId: string, path: string, init?: RequestInit) {
    const token = await googleAccessToken(sourceId);
    const response = await fetch(`${GOOGLE_API}${path}`, {
        ...init,
        signal: AbortSignal.timeout(15000),
        redirect: 'error',
        headers: {
            authorization: `Bearer ${token}`,
            'content-type': 'application/json',
            ...(init?.headers || {})
        }
    });
    return response;
}
export async function syncGoogleSource(sourceId: string, reset = false) {
    const source = await prisma.calendarSource.findUnique({ where: { id: sourceId } });
    if (!source || source.providerType !== 'GOOGLE_CALENDAR')
        throw new Error('Invalid Google calendar source');
    let config = sourceConfig<GoogleSourceConfig>(source.config);
    const calendarId = source.externalRef || config.calendarId || 'primary';
    let syncToken = reset ? null : config.syncToken || null;
    let pageToken: string | null = null;
    let completedSyncToken: string | null = null;
    let ingested = 0;
    const scanStartedAt = new Date();
    const seen = new Set<string>();
    const fullScan = !syncToken;
    const timeMin = new Date(Date.now() - 30 * 86400000);
    do {
        const params = new URLSearchParams({
            singleEvents: 'true',
            showDeleted: 'true',
            maxResults: '2500'
        });
        if (syncToken) {
            params.set('syncToken', syncToken);
        }
        else {
            params.set('timeMin', timeMin.toISOString());
        }
        if (pageToken)
            params.set('pageToken', pageToken);
        const response = await googleFetch(sourceId, `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`);
        if (response.status === 410 && syncToken) {
            await patchCalendarSourceConfig(sourceId, { syncToken: null });
            return syncGoogleSource(sourceId, true);
        }
        if (!response.ok)
            throw new Error(`Google events sync failed: ${response.status}`);
        const body = await response.json() as {
            items?: GoogleEvent[];
            nextPageToken?: string;
            nextSyncToken?: string;
        };
        for (const event of body.items || []) {
            if (!event.id)
                continue;
            seen.add(event.id);
            const previous = await prisma.calendarExternalEvent.findUnique({ where: { sourceId_externalEventId: { sourceId, externalEventId: event.id } } });
            const timezone = event.start?.timeZone || event.end?.timeZone || 'America/Mexico_City';
            const startsAt = googleDateValue(event.start, timezone) || (event.status === 'cancelled' ? previous?.startsAt.toISOString() : null);
            const endsAt = googleDateValue(event.end, timezone) || (event.status === 'cancelled' ? previous?.endsAt.toISOString() : null);
            if (!startsAt || !endsAt) {
                if (event.status === 'cancelled' && !previous)
                    continue;
                throw new Error('Google event interval is missing; scan cannot certify coverage');
            }
            const echoedCanonicalKey = event.extendedProperties?.private?.clinicalPortalCanonicalKey;
            const result = await ingestCalendarEvent({
                sourceId,
                externalEventId: event.id,
                correlationKey: echoedCanonicalKey || `google:${event.id}`,
                canonicalEcho: Boolean(echoedCanonicalKey),
                providerRef: process.env.CALENDAR_PROVIDER_REF || 'dr-guillermo',
                startsAt,
                endsAt,
                timezone: event.start?.timeZone || event.end?.timeZone || 'America/Mexico_City',
                status: event.status === 'cancelled' || event.transparency === 'transparent' ? 'CANCELLED' : 'SCHEDULED',
                summary: event.summary || null,
                location: event.location || null,
                sourceUpdatedAt: event.updated || scanStartedAt.toISOString()
            }, `google:${sourceId}:${event.id}:${event.updated || event.status || 'unknown'}`);
            void result;
            ingested += 1;
        }
        pageToken = body.nextPageToken || null;
        if (!pageToken && body.nextSyncToken) {
            completedSyncToken = body.nextSyncToken;
        }
    } while (pageToken);
    if (!completedSyncToken)
        throw new Error('Google scan did not return a completion token');
    if (fullScan) {
        const absent = await prisma.calendarExternalEvent.findMany({ where: { sourceId, status: { not: 'CANCELLED' }, endsAt: { gt: timeMin } } });
        for (const row of absent.filter(row => !seen.has(row.externalEventId)))
            await ingestCalendarEvent({ sourceId, externalEventId: row.externalEventId, correlationKey: row.correlationKey, canonicalEcho: (row.rawMeta as {
                    managedBy?: string;
                })?.managedBy === 'clinical-portal', providerRef: row.providerRef, startsAt: row.startsAt.toISOString(), endsAt: row.endsAt.toISOString(), timezone: row.timezone, status: 'CANCELLED', sourceUpdatedAt: scanStartedAt.toISOString() }, `google-absent:${sourceId}:${row.id}:${scanStartedAt.toISOString()}`);
    }
    await patchCalendarSourceConfig(sourceId, { syncToken: completedSyncToken });
    config = { ...config, syncToken: completedSyncToken };
    await prisma.calendarSource.update({ where: { id: sourceId }, data: { lastSyncAt: new Date() } });
    return { ingested, syncToken: config.syncToken || null };
}
export async function startGoogleWatch(sourceId: string) {
    const source = await prisma.calendarSource.findUnique({ where: { id: sourceId } });
    if (!source || source.providerType !== 'GOOGLE_CALENDAR')
        throw new Error('Invalid Google calendar source');
    const config = sourceConfig<GoogleSourceConfig>(source.config);
    const calendarId = source.externalRef || config.calendarId || 'primary';
    if (config.watchChannelId && config.watchResourceId) {
        const stop = await googleFetch(sourceId, '/channels/stop', {
            method: 'POST',
            body: JSON.stringify({ id: config.watchChannelId, resourceId: config.watchResourceId })
        });
        if (!stop.ok && stop.status !== 404) {
            console.warn('Unable to stop previous Google watch channel', stop.status);
        }
    }
    const channelId = randomUUID();
    const channelToken = randomBytes(24).toString('base64url');
    const site = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
    const expiration = Date.now() + 6 * 24 * 60 * 60 * 1000;
    const response = await googleFetch(sourceId, `/calendars/${encodeURIComponent(calendarId)}/events/watch`, {
        method: 'POST',
        body: JSON.stringify({
            id: channelId,
            type: 'web_hook',
            address: `${site}/api/calendar/google/webhook?sourceId=${encodeURIComponent(sourceId)}`,
            token: channelToken,
            expiration
        })
    });
    if (!response.ok)
        throw new Error(`Google watch creation failed: ${response.status}`);
    const body = await response.json() as {
        resourceId: string;
        expiration?: string;
    };
    await patchCalendarSourceConfig(sourceId, {
        calendarId,
        watchChannelId: channelId,
        watchResourceId: body.resourceId,
        watchToken: channelToken,
        watchExpiration: body.expiration || String(expiration)
    });
    return { channelId, resourceId: body.resourceId, expiration: body.expiration || String(expiration) };
}
export async function completeGoogleOAuth(sourceId: string, code: string) {
    const { clientId, clientSecret } = clientConfig();
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        redirect: 'error',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: googleRedirectUri(),
            grant_type: 'authorization_code'
        })
    });
    if (!response.ok)
        throw new Error(`Google OAuth token exchange failed: ${response.status}`);
    const body = await response.json() as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
        scope?: string;
    };
    const previous = await readCalendarSecret<GoogleTokenSet>(sourceId);
    const refreshToken = body.refresh_token || previous?.refreshToken;
    if (!refreshToken)
        throw new Error('Google did not return a refresh token');
    await writeCalendarSecret(sourceId, {
        accessToken: body.access_token,
        refreshToken,
        expiresAt: Date.now() + body.expires_in * 1000,
        scope: body.scope
    } satisfies GoogleTokenSet);
    await prisma.calendarSource.update({
        where: { id: sourceId },
        data: { readAuthority: true, writeAuthority: false, enabled: true, webhookEnabled: false }
    });
    await syncGoogleSource(sourceId);
    const watch = await startGoogleWatch(sourceId);
    await prisma.calendarSource.update({ where: { id: sourceId }, data: { writeAuthority: true, webhookEnabled: true } });
    return watch;
}
function googleCalendarId(source: CalendarSource) {
    const config = sourceConfig<GoogleSourceConfig>(source.config);
    return source.externalRef || config.calendarId || 'primary';
}
function googleManagedEventBody(event: CanonicalCalendarEvent) {
    return {
        summary: 'Horario no disponible',
        description: 'Bloque sincronizado por Clinical Portal. No contiene información clínica del paciente.',
        start: { dateTime: event.startsAt.toISOString(), timeZone: event.timezone },
        end: { dateTime: event.endsAt.toISOString(), timeZone: event.timezone },
        transparency: 'opaque',
        extendedProperties: {
            private: {
                clinicalPortalCanonicalKey: event.canonicalKey,
                clinicalPortalManaged: 'true'
            }
        }
    };
}
async function persistGoogleMapping(source: CalendarSource, event: CanonicalCalendarEvent, externalEventId: string, status: string) {
    const existing = await prisma.calendarExternalEvent.findFirst({
        where: { sourceId: source.id, canonicalEventId: event.id }
    });
    if (existing) {
        return prisma.calendarExternalEvent.update({
            where: { id: existing.id },
            data: {
                externalEventId,
                correlationKey: event.canonicalKey,
                providerRef: event.providerRef,
                startsAt: event.startsAt,
                endsAt: event.endsAt,
                timezone: event.timezone,
                status,
                lastObservedAt: new Date(),
                rawMeta: { managedBy: 'clinical-portal', kind: 'google-event' }
            }
        });
    }
    return prisma.calendarExternalEvent.create({
        data: {
            sourceId: source.id,
            externalEventId,
            canonicalEventId: event.id,
            correlationKey: event.canonicalKey,
            providerRef: event.providerRef,
            startsAt: event.startsAt,
            endsAt: event.endsAt,
            timezone: event.timezone,
            status,
            rawMeta: { managedBy: 'clinical-portal', kind: 'google-event' }
        }
    });
}
export async function upsertGoogleBusy(source: CalendarSource, event: CanonicalCalendarEvent) {
    const calendarId = googleCalendarId(source);
    const existing = await prisma.calendarExternalEvent.findFirst({
        where: { sourceId: source.id, canonicalEventId: event.id }
    });
    let response: Response;
    if (existing) {
        response = await googleFetch(source.id, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(existing.externalEventId)}`, { method: 'PATCH', body: JSON.stringify(googleManagedEventBody(event)) });
        if (response.status === 404) {
            response = await googleFetch(source.id, `/calendars/${encodeURIComponent(calendarId)}/events`, { method: 'POST', body: JSON.stringify({ ...googleManagedEventBody(event), id: createHash('sha256').update(event.canonicalKey).digest('hex') }) });
        }
    }
    else {
        response = await googleFetch(source.id, `/calendars/${encodeURIComponent(calendarId)}/events`, { method: 'POST', body: JSON.stringify({ ...googleManagedEventBody(event), id: createHash('sha256').update(event.canonicalKey).digest('hex') }) });
    }
    if (response.status === 409)
        response = await googleFetch(source.id, `/calendars/${encodeURIComponent(calendarId)}/events/${createHash('sha256').update(event.canonicalKey).digest('hex')}`, { method: 'PATCH', body: JSON.stringify(googleManagedEventBody(event)) });
    if (!response.ok)
        throw new Error(`Google event writeback failed: ${response.status}`);
    const body = await response.json() as GoogleEvent;
    if (!body.id)
        throw new Error('Google event writeback did not return an event ID');
    const verification = await googleFetch(source.id, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(body.id)}`);
    if (!verification.ok)
        throw new Error('Google event readback failed');
    const observed = await verification.json() as GoogleEvent;
    if (observed.status === 'cancelled' || observed.extendedProperties?.private?.clinicalPortalCanonicalKey !== event.canonicalKey || Date.parse(observed.start?.dateTime || '') !== +event.startsAt || Date.parse(observed.end?.dateTime || '') !== +event.endsAt)
        throw new Error('Google event readback disagrees with requested state');
    await persistGoogleMapping(source, event, body.id, 'SCHEDULED');
    return { externalEventId: body.id, observedState: { id: body.id, status: body.status || 'confirmed' } };
}
export async function cancelGoogleBusy(source: CalendarSource, event: CanonicalCalendarEvent) {
    const existing = await prisma.calendarExternalEvent.findFirst({ where: { sourceId: source.id, canonicalEventId: event.id } });
    const externalId = existing?.externalEventId || createHash('sha256').update(event.canonicalKey).digest('hex');
    const calendarId = googleCalendarId(source);
    const path = `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(externalId)}`;
    const before = await googleFetch(source.id, path);
    if (before.ok) {
        const observed = await before.json() as GoogleEvent;
        if (observed.extendedProperties?.private?.clinicalPortalCanonicalKey !== event.canonicalKey)
            throw new Error('Refusing to delete an unmanaged Google event');
        if (observed.status !== 'cancelled') {
            const removed = await googleFetch(source.id, path, { method: 'DELETE' });
            if (!removed.ok && ![404, 410].includes(removed.status))
                throw new Error(`Google event removal failed: ${removed.status}`);
        }
    }
    else if (![404, 410].includes(before.status))
        throw new Error('Google event lookup before cancellation failed');
    const verification = await googleFetch(source.id, path);
    if (verification.ok) {
        const observed = await verification.json() as GoogleEvent;
        if (observed.status !== 'cancelled')
            throw new Error('Google cancellation readback still shows an active event');
    }
    else if (![404, 410].includes(verification.status))
        throw new Error('Google cancellation readback failed');
    if (existing)
        await prisma.calendarExternalEvent.update({ where: { id: existing.id }, data: { status: 'CANCELLED', lastObservedAt: new Date() } });
    return { externalEventId: externalId, observedState: { status: 'CANCELLED', verifiedBy: 'PROVIDER_READBACK' } };
}
