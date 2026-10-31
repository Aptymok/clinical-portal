import { upsertDocplannerBusy, cancelDocplannerBusy } from '../src/lib/calendar/docplanner';
import { POST as docplannerCallback } from '../src/app/api/calendar/docplanner/webhook/route';
import { cancelGoogleBusy, upsertGoogleBusy, syncGoogleSource } from '../src/lib/calendar/google';
import { writeCalendarSecret } from '../src/lib/calendar/secrets';
import assert from 'node:assert/strict';
import { createAppointment, updateAppointment } from '../src/lib/calendar/appointments';
import { processPropagationJobs } from '../src/lib/calendar/propagation';
import { prisma } from '../src/lib/prisma';
import { ingestCalendarEvent } from '../src/lib/calendar/orchestrator';
import { checkCanonicalAvailability } from '../src/lib/calendar/availability';
import { POST as availabilityRoute } from '../src/app/api/calendar/availability/route';
async function main() {
    if (new URL(process.env.DATABASE_URL || '').pathname !== '/clinic_qa')
        throw new Error('Disposable QA database only');
    for (const id of ['qa-a', 'qa-b'])
        await prisma.calendarSource.create({ data: { id, name: id, providerType: 'GENERIC_WEBHOOK', readAuthority: true, writeAuthority: false, lastSyncAt: new Date(), enabled: true } });
    const privacy = await prisma.$queryRaw<Array<{relname:string;relrowsecurity:boolean}>>`SELECT c.relname,c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('Patient','User','CalendarConnectionSecret')`;
    assert.equal(privacy.length,3);
    assert.ok(privacy.every(table=>table.relrowsecurity),'Clinical tables must deny direct public Data API access');
    const publicAccess = await prisma.$queryRaw<Array<{exposed:boolean}>>`SELECT has_table_privilege(r.oid, 'public."Patient"', 'SELECT') AS exposed FROM pg_roles r WHERE rolname IN ('anon','authenticated')`;
    assert.ok(publicAccess.every(role=>!role.exposed),'Public client roles must not read patient tables');
    let serial = 0;
    const event = (key: string, source = 'qa-a', start = '2030-01-01T10:00:00-06:00', end = '2030-01-01T10:30:00-06:00', updated = '2026-10-31T10:00:00Z') => ({ sourceId: source, externalEventId: key + '-' + source, correlationKey: key, providerRef: 'qa-doctor', startsAt: start, endsAt: end, timezone: 'America/Mexico_City', status: 'SCHEDULED' as const, sourceUpdatedAt: updated });
    const ingest = (value: any) => ingestCalendarEvent(value, 'qa-audit-' + (++serial));
    const results: any[] = [{test:'Tablas clínicas protegidas con RLS y sin lectura para clientes públicos',pass:true}];
    await ingest(event('contradiction'));
    const contradiction = await ingest(event('contradiction', 'qa-b', '2030-01-01T11:00:00-06:00', '2030-01-01T11:30:00-06:00'));
    results.push({ test: 'Contradicción entre fuentes del mismo evento', expected: 'conflict=true', observed: { conflict: contradiction.conflicts, startsAt: contradiction.canonicalEvent?.startsAt }, pass: contradiction.conflicts === true });
    await ingest(event('stale', 'qa-a', '2030-01-02T11:00:00-06:00', '2030-01-02T11:30:00-06:00', '2026-10-31T12:00:00Z'));
    const stale = await ingest(event('stale', 'qa-a', '2030-01-02T10:00:00-06:00', '2030-01-02T10:30:00-06:00', '2026-10-30T12:00:00Z'));
    results.push({ test: 'Notificación antigua fuera de orden', expected: 'conservar horario más reciente: 17:00Z', observed: { startsAt: stale.canonicalEvent?.startsAt }, pass: stale.canonicalEvent?.startsAt.toISOString() === '2030-01-02T17:00:00.000Z' });
    await ingest(event('equal-version', 'qa-a', '2030-01-07T10:00:00-06:00', '2030-01-07T10:30:00-06:00', '2026-10-31T12:00:00Z'));
    const equalVersion = await ingest(event('equal-version', 'qa-a', '2030-01-07T11:00:00-06:00', '2030-01-07T11:30:00-06:00', '2026-10-31T12:00:00Z'));
    assert.equal(equalVersion.conflicts, true, 'Two different payloads with the same source version must require reconciliation');
    const repeatedVersion = await ingest(event('equal-version', 'qa-a', '2030-01-07T11:00:00-06:00', '2030-01-07T11:30:00-06:00', '2026-10-31T12:00:00Z'));
    assert.equal(repeatedVersion.conflicts, true);
    results.push({ test: 'Misma versión de fuente con dos horarios distintos', pass: true });
    const patient = await prisma.patient.create({ data: { person: { create: { firstName: 'QA', lastName: 'SYNTHETIC' } } } });
    const provider = await prisma.provider.create({ data: { person: { create: { firstName: 'QA', lastName: 'PROVIDER' } } } });
    await prisma.appointment.create({ data: { patientId: patient.id, providerId: provider.id, scheduledFor: new Date('2030-01-03T10:00:00-06:00') } });
    process.env.CALENDAR_INTERNAL_PROVIDER_ID = provider.id;
    process.env.CALENDAR_PROVIDER_REF = 'qa-doctor';
    const local = await checkCanonicalAvailability({ providerRef: 'qa-doctor', startsAt: '2030-01-03T10:00:00-06:00', endsAt: '2030-01-03T10:30:00-06:00' });
    results.push({ test: 'Disponibilidad con una cita interna ocupada', expected: 'available=false', observed: local, pass: local.available === false });
    await prisma.calendarSource.updateMany({ data: { lastSyncAt: new Date('2020-01-01T00:00:00Z') } });
    process.env.CALENDAR_SYNC_SECRET = 'qa-calendar-audit-only';
    const response = await availabilityRoute(new Request('http://localhost/api/calendar/availability', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer qa-calendar-audit-only' }, body: JSON.stringify({ providerRef: 'qa-doctor', startsAt: '2030-01-04T10:00:00-06:00', endsAt: '2030-01-04T10:30:00-06:00' }) }));
    results.push({ test: 'Disponibilidad con fuentes sin observación reciente', expected: '503: no garantizar disponibilidad', observed: { status: response.status, body: response.status === 204 ? 'NO_CONTENT' : await response.json() }, pass: response.status === 503 });
    const doctoralia = await prisma.calendarSource.create({ data: { id: 'qa-doc', name: 'QA Docplanner', providerType: 'DOCPLANNER', readAuthority: true, realtimeBookingCheck: true, lastSyncAt: new Date('2020-01-01') } });
    process.env.DOCPLANNER_WEBHOOK_SECRET = 'qa-doc-only';
    const docResponse = await docplannerCallback(new Request('http://localhost/api/calendar/docplanner/webhook?sourceId=qa-doc&token=qa-doc-only', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'slot-booking', data: { visit_booking_request: { start_at: '2030-01-04T10:00:00-06:00', end_at: '2030-01-04T10:30:00-06:00' } } }) }));
    assert.equal(docResponse.status, 503, 'Actual Docplanner callback must reject stale coverage');
    results.push({ test: 'Callback real de Doctoralia rechaza observaciones vencidas', pass: true });
    await prisma.calendarSource.delete({ where: { id: doctoralia.id } });
    const boundary = await checkCanonicalAvailability({ providerRef: 'qa-doctor', startsAt: '2030-01-03T10:30:00-06:00', endsAt: '2030-01-03T11:00:00-06:00' });
    results.push({ test: 'Citas contiguas de 30 minutos (disponibilidad real)', expected: 'sin colisión al terminar cita anterior', observed: boundary, pass: boundary.available });
    // Provider responses below are SIMULATED. Persistence/appointments/outbox use
    // real application functions against this disposable database.
    await prisma.calendarSource.updateMany({ where: { id: { in: ['qa-a', 'qa-b'] } }, data: { lastSyncAt: new Date() } });
    await prisma.calendarSource.update({ where: { id: 'qa-b' }, data: { writeAuthority: true, config: { writeUrl: 'https://calendar.example.test/write' } } });
    process.env.THIRD_CALENDAR_WEBHOOK_SECRET = 'qa-only-signature';
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_url, init) => {
        const body = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({ ...body, observed: true }), { status: 200 });
    };
    try {
        const created = await createAppointment({ patientId: patient.id, providerId: provider.id, scheduledFor: '2030-01-05T10:00:00-06:00' });
        assert.equal(created.synchronization.canonicalEvent?.canonicalKey, `appointment:${created.appointment.id}`);
        assert.equal(created.synchronization.propagationQueued, 1);
        await assert.rejects(() => createAppointment({ patientId: patient.id, providerId: provider.id, scheduledFor: '2030-01-05T10:00:00-06:00' }), /APPOINTMENT_SLOT_CONFLICT/);
        const first = await processPropagationJobs({ syncEventId: created.synchronization.syncEvent.id });
        assert.equal(first[0].state, 'CONFIRMED');
        const moved = await updateAppointment(created.appointment.id, { scheduledFor: '2030-01-05T11:00:00-06:00' });
        assert.equal(moved.synchronization.conflicts, false);
        const movedJob = await prisma.calendarPropagationJob.findFirstOrThrow({ where: { syncEventId: moved.synchronization.syncEvent.id } });
        await prisma.calendarPropagationJob.update({ where: { id: movedJob.id }, data: { state: 'SENT', lastAttemptAt: new Date(Date.now() - 180000), attempts: 1 } });
        const recovered = await processPropagationJobs({ syncEventId: moved.synchronization.syncEvent.id });
        assert.equal(recovered[0].state, 'CONFIRMED');
        const pending = await updateAppointment(created.appointment.id, { scheduledFor: '2030-01-05T12:00:00-06:00' });
        const cancelled = await updateAppointment(created.appointment.id, { status: 'CANCELLED' });
        const obsolete = await processPropagationJobs({ syncEventId: pending.synchronization.syncEvent.id });
        assert.equal(obsolete[0].state, 'SUPERSEDED');
        const beforeFree = await checkCanonicalAvailability({ providerRef: 'qa-doctor', startsAt: '2030-01-05T12:00:00-06:00', endsAt: '2030-01-05T12:30:00-06:00' });
        assert.equal(beforeFree.available, false, 'Unconfirmed external cancellation cannot certify a free slot');
        const freed = await processPropagationJobs({ syncEventId: cancelled.synchronization.syncEvent.id });
        assert.equal(freed[0].state, 'CONFIRMED');
        const reread = await prisma.appointment.findUniqueOrThrow({ where: { id: created.appointment.id } });
        assert.equal(reread.status, 'CANCELLED');
        assert.equal((await checkCanonicalAvailability({ providerRef: 'qa-doctor', startsAt: '2030-01-05T12:00:00-06:00', endsAt: '2030-01-05T12:30:00-06:00' })).available, true);
        results.push({ test: 'Crear, mover, recuperar envío interrumpido, omitir versión obsoleta y cancelar', providerResponses: 'SIMULATED', persistence: 'REAL_DISPOSABLE_DATABASE', pass: true });
    }
    finally {
        globalThis.fetch = originalFetch;
    }
    // Deliberately pause an old external write while a cancellation commits.
    let releaseWrite!: () => void, markStarted!: () => void;
    const paused = new Promise<void>(resolve => { releaseWrite = resolve; });
    const started = new Promise<void>(resolve => { markStarted = resolve; });
    let externalBusy = false, firstWrite = true;
    globalThis.fetch = async (_url, init) => {
        const body = JSON.parse(String(init?.body));
        if (body.action === 'UPSERT_BUSY' && firstWrite) {
            firstWrite = false;
            markStarted();
            await paused;
        }
        externalBusy = body.action !== 'CANCEL_OR_FREE';
        return new Response(JSON.stringify({ ...body, observed: true }));
    };
    try {
        const racing = await createAppointment({ patientId: patient.id, providerId: provider.id, scheduledFor: '2030-01-06T10:00:00-06:00' });
        const running = processPropagationJobs({ syncEventId: racing.synchronization.syncEvent.id });
        await started;
        const cancelled = await updateAppointment(racing.appointment.id, { status: 'CANCELLED' });
        await processPropagationJobs({ syncEventId: cancelled.synchronization.syncEvent.id });
        releaseWrite();
        await running;
        await processPropagationJobs();
        assert.equal(externalBusy, false, 'An older in-flight write must not permanently resurrect a cancelled event');
        results.push({ test: 'Cancelación concurrente con envío anterior en vuelo', providerResponses: 'SIMULATED', pass: true });
    }
    finally {
        releaseWrite();
        globalThis.fetch = originalFetch;
    }
    // A provider write can succeed before its local mapping is persisted.
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
    const google = await prisma.calendarSource.create({ data: { id: 'qa-google', name: 'QA Google', providerType: 'GOOGLE_CALENDAR', enabled: false } });
    await writeCalendarSecret(google.id, { accessToken: 'qa-only', refreshToken: 'qa-only', expiresAt: Date.now() + 3600000 });
    const cancelledEvent = await prisma.canonicalCalendarEvent.findFirstOrThrow({ where: { canonicalKey: { startsWith: 'appointment:' }, status: 'CANCELLED' } });
    let remoteActive = true;
    globalThis.fetch = async (_url, init) => {
        if (init?.method === 'DELETE') {
            remoteActive = false;
            return new Response(null, { status: 204 });
        }
        return remoteActive ? new Response(JSON.stringify({ id: 'qa', status: 'confirmed', extendedProperties: { private: { clinicalPortalCanonicalKey: cancelledEvent.canonicalKey } } })) : new Response(null, { status: 404 });
    };
    try {
        await cancelGoogleBusy(google, cancelledEvent);
        assert.equal(remoteActive, false, 'Cancellation must remove a previously written event even without its local mapping');
        results.push({ test: 'Cancelar Google tras escritura exitosa sin mapeo persistido', providerResponses: 'SIMULATED', pass: true });
    }
    finally {
        globalThis.fetch = originalFetch;
    }
    const adapterEvent = await prisma.canonicalCalendarEvent.create({ data: { canonicalKey: 'qa-adapter', providerRef: 'qa-doctor', startsAt: new Date('2030-02-01T16:00:00Z'), endsAt: new Date('2030-02-01T16:30:00Z'), timezone: 'America/Mexico_City' } });
    let googleRemote: any = null;
    globalThis.fetch = async (_url, init) => {
        if (init?.method === 'POST' || init?.method === 'PATCH') {
            googleRemote = { ...googleRemote, ...JSON.parse(String(init.body)), status: 'confirmed' };
            return new Response(JSON.stringify(googleRemote));
        }
        if (init?.method === 'DELETE') {
            googleRemote = null;
            return new Response(null, { status: 204 });
        }
        return googleRemote ? new Response(JSON.stringify(googleRemote)) : new Response(null, { status: 404 });
    };
    try {
        await upsertGoogleBusy(google, adapterEvent);
        const moved = { ...adapterEvent, startsAt: new Date('2030-02-01T17:00:00Z'), endsAt: new Date('2030-02-01T17:30:00Z') };
        await upsertGoogleBusy(google, moved);
        assert.equal(googleRemote.start.dateTime, moved.startsAt.toISOString());
        await cancelGoogleBusy(google, { ...moved, status: 'CANCELLED' });
        assert.equal(googleRemote, null);
        results.push({ test: 'Adaptador Google: crear, mover, cancelar y releer estado remoto', providerResponses: 'SIMULATED', pass: true });
    }
    finally {
        globalThis.fetch = originalFetch;
    }
    await prisma.calendarSource.update({ where: { id: google.id }, data: { enabled: true, readAuthority: true } });
    globalThis.fetch = async () => new Response(JSON.stringify({ items: [], nextSyncToken: 'qa-token' }));
    try {
        await syncGoogleSource(google.id);
        const observed = await prisma.calendarSource.findUniqueOrThrow({ where: { id: google.id } });
        assert.ok(observed.lastSyncAt);
        results.push({ test: 'Lectura Google vacía completa registra observación reciente', providerResponses: 'SIMULATED', pass: true });
    }
    finally {
        globalThis.fetch = originalFetch;
    }
    const docSource = await prisma.calendarSource.create({ data: { id: 'qa-doc-adapter', name: 'QA Docplanner adapter', providerType: 'DOCPLANNER', enabled: false, config: { domain: 'doctoralia.mx', facilityId: 'qa', doctorId: 'qa', addressId: 'qa' } } });
    process.env.DOCPLANNER_CLIENT_ID = 'qa-only';
    process.env.DOCPLANNER_CLIENT_SECRET = 'qa-only';
    let docRemote: any = null;
    globalThis.fetch = async (url, init) => {
        if (String(url).includes('/oauth/'))
            return new Response(JSON.stringify({ access_token: 'qa-only', expires_in: 3600 }));
        if (init?.method === 'POST') {
            docRemote = { ...JSON.parse(String(init.body)), id: 'qa-break' };
            return new Response(JSON.stringify(docRemote));
        }
        if (init?.method === 'PATCH') {
            docRemote = { ...docRemote, ...JSON.parse(String(init.body)) };
            return new Response(JSON.stringify(docRemote));
        }
        if (init?.method === 'DELETE') {
            docRemote = null;
            return new Response(null, { status: 204 });
        }
        if (String(url).includes('/breaks?'))
            return new Response(JSON.stringify({ _items: docRemote ? [docRemote] : [] }));
        return docRemote ? new Response(JSON.stringify(docRemote)) : new Response(null, { status: 404 });
    };
    try {
        await upsertDocplannerBusy(docSource, adapterEvent);
        const moved = { ...adapterEvent, startsAt: new Date('2030-02-01T18:00:00Z'), endsAt: new Date('2030-02-01T18:30:00Z') };
        await upsertDocplannerBusy(docSource, moved);
        assert.equal(docRemote.since, moved.startsAt.toISOString());
        await cancelDocplannerBusy(docSource, { ...moved, status: 'CANCELLED' });
        assert.equal(docRemote, null);
        results.push({ test: 'Adaptador Doctoralia: crear, mover, cancelar y releer estado remoto', providerResponses: 'SIMULATED', pass: true });
    }
    finally {
        globalThis.fetch = originalFetch;
    }
    // Preserve other QA fixtures; remove this diagnostic's sources and events only.
    await prisma.canonicalCalendarEvent.deleteMany({ where: { providerRef: 'qa-doctor' } });
    await prisma.calendarSource.deleteMany({ where: { id: { in: ['qa-a', 'qa-b', 'qa-google', 'qa-doc-adapter', 'clinical-portal'] } } });
    console.log(JSON.stringify({ environment: 'DISPOSABLE_SYNTHETIC_DATABASE', productionWrites: false, results }, null, 2));
    await prisma.$disconnect();
    if (results.some(result => !result.pass))
        process.exitCode = 1;
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
