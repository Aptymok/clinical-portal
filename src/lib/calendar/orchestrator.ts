import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { NormalizedCalendarEvent } from './contracts';
import { reconcileCalendarEvents } from './reconcile';
// The transaction variant is shared by appointment writes: no appointment may
// commit without its canonical representation and durable outbox.
export async function ingestCalendarEventTx(tx: Prisma.TransactionClient, event: NormalizedCalendarEvent, dedupeKey: string) {
    const startsAt = new Date(event.startsAt), endsAt = new Date(event.endsAt);
    if (!(startsAt < endsAt))
        throw new Error('Invalid calendar interval');
    if (event.sourceUpdatedAt && !Number.isFinite(Date.parse(event.sourceUpdatedAt)))
        throw new Error('Invalid source version');
    const source = await tx.calendarSource.findUnique({ where: { id: event.sourceId } });
    if (!source?.enabled || !source.readAuthority)
        throw new Error('Calendar source is not authorized for intake');
    const duplicate = await tx.calendarSyncEvent.findUnique({ where: { dedupeKey }, include: { canonicalEvent: true, propagationJobs: true } });
    if (duplicate)
        return { duplicate: true, syncEvent: duplicate, canonicalEvent: duplicate.canonicalEvent, conflicts: duplicate.state === 'CONFLICT', propagationQueued: duplicate.propagationJobs.length };
    const canonicalKey = event.correlationKey?.trim() || `source:${event.sourceId}:${event.externalEventId}`;
    const previous = await tx.calendarExternalEvent.findUnique({ where: { sourceId_externalEventId: { sourceId: event.sourceId, externalEventId: event.externalEventId } } });
    const current = await tx.canonicalCalendarEvent.findUnique({ where: { canonicalKey } });
    const sync = await tx.calendarSyncEvent.create({ data: { dedupeKey, sourceId: source.id, externalEventId: event.externalEventId, eventType: event.status === 'CANCELLED' ? 'CANCEL_OR_FREE' : 'UPSERT_BUSY', payload: event as unknown as Prisma.InputJsonValue } });
    if (previous?.sourceUpdatedAt && (!event.sourceUpdatedAt || new Date(event.sourceUpdatedAt) < previous.sourceUpdatedAt)) {
        const ignored = await tx.calendarSyncEvent.update({ where: { id: sync.id }, data: { state: 'COMPLETED', eventType: 'IGNORED_STALE', canonicalEventId: previous.canonicalEventId, processedAt: new Date() } });
        return { duplicate: false, syncEvent: ignored, canonicalEvent: current, conflicts: current?.conflict || false, propagationQueued: 0 };
    }
    // An external echo is an observation of our own write, not authority to edit it.
    const echoMismatch = Boolean(event.canonicalEcho && current && (current.providerRef !== event.providerRef || +current.startsAt !== +startsAt || +current.endsAt !== +endsAt || (current.status === 'CANCELLED') !== (event.status === 'CANCELLED')));
    const data = { correlationKey: canonicalKey, providerRef: event.providerRef, startsAt, endsAt, timezone: event.timezone, status: event.status, sourceUpdatedAt: event.sourceUpdatedAt ? new Date(event.sourceUpdatedAt) : null, lastObservedAt: new Date() };
    const observation = await tx.calendarExternalEvent.upsert({ where: { sourceId_externalEventId: { sourceId: event.sourceId, externalEventId: event.externalEventId } }, create: { ...data, sourceId: event.sourceId, externalEventId: event.externalEventId }, update: data });
    const links = await tx.calendarExternalEvent.findMany({ where: { correlationKey: canonicalKey } });
    const authoritative = links.filter(link => !(link.rawMeta as {
        managedBy?: string;
    })?.managedBy && !(event.canonicalEcho && link.id === observation.id));
    const normalized: NormalizedCalendarEvent[] = authoritative.map(link => ({ sourceId: link.sourceId, externalEventId: link.externalEventId, correlationKey: canonicalKey, providerRef: link.providerRef, startsAt: link.startsAt.toISOString(), endsAt: link.endsAt.toISOString(), timezone: link.timezone, status: link.status as NormalizedCalendarEvent['status'], sourceUpdatedAt: link.sourceUpdatedAt?.toISOString() }));
    const reconciliation = reconcileCalendarEvents(normalized);
    const versionCollision = Boolean(previous?.sourceUpdatedAt && event.sourceUpdatedAt && +previous.sourceUpdatedAt === Date.parse(event.sourceUpdatedAt) && (previous.providerRef !== event.providerRef || +previous.startsAt !== +startsAt || +previous.endsAt !== +endsAt || previous.status !== event.status || (current?.conflictMeta as {
        versionCollision?: boolean;
    })?.versionCollision));
    const contradictions = reconciliation.conflicts.length > 0 || echoMismatch || versionCollision;
    const incomingStatus = event.status === 'CANCELLED' ? 'CANCELLED' : event.status === 'UNKNOWN' ? 'TENTATIVE' : 'BUSY';
    const preserve = Boolean(current && (contradictions || event.canonicalEcho));
    const chosen = preserve ? { providerRef: current!.providerRef, startsAt: current!.startsAt, endsAt: current!.endsAt, timezone: current!.timezone, status: current!.status } : { providerRef: event.providerRef, startsAt, endsAt, timezone: event.timezone, status: incomingStatus as 'BUSY' | 'TENTATIVE' | 'CANCELLED' };
    const overlaps = chosen.status === 'CANCELLED' ? [] : await tx.canonicalCalendarEvent.findMany({ where: { providerRef: chosen.providerRef, canonicalKey: { not: canonicalKey }, status: { not: 'CANCELLED' }, startsAt: { lt: chosen.endsAt }, endsAt: { gt: chosen.startsAt } } });
    const conflict = contradictions || overlaps.length > 0;
    const meta = conflict ? { contradictions: reconciliation.conflicts, echoMismatch, versionCollision, overlapCanonicalIds: overlaps.map(row => row.id) } : Prisma.JsonNull;
    const canonicalEvent = await tx.canonicalCalendarEvent.upsert({ where: { canonicalKey }, create: { canonicalKey, ...chosen, sourceOfTruthId: event.canonicalEcho ? null : event.sourceId, conflict, conflictMeta: meta }, update: { ...chosen, sourceOfTruthId: preserve ? current?.sourceOfTruthId : event.sourceId, conflict, conflictMeta: meta, version: { increment: event.canonicalEcho ? 0 : 1 } } });
    await tx.calendarExternalEvent.update({ where: { id: observation.id }, data: { canonicalEventId: canonicalEvent.id } });
    if (conflict) {
        await tx.calendarAlert.create({ data: { canonicalEventId: canonicalEvent.id, type: contradictions ? 'SOURCE_CONTRADICTION' : 'SLOT_CONFLICT', severity: 'CRITICAL', message: 'Las fuentes discrepan o hay horarios superpuestos. Requiere revisión antes de confirmar disponibilidad.', meta } });
    }
    const targets = event.canonicalEcho || conflict ? [] : await tx.calendarSource.findMany({ where: { enabled: true, writeAuthority: true, id: { not: event.sourceId }, providerType: { not: 'CLINICAL_PORTAL' } }, select: { id: true } });
    if (targets.length)
        await tx.calendarPropagationJob.createMany({ data: targets.map(target => ({ syncEventId: sync.id, canonicalEventId: canonicalEvent.id, targetSourceId: target.id, action: event.status === 'CANCELLED' ? 'CANCEL_OR_FREE' : 'UPSERT_BUSY' })), skipDuplicates: true });
    const updated = await tx.calendarSyncEvent.update({ where: { id: sync.id }, data: { state: conflict ? 'CONFLICT' : targets.length ? 'PROPAGATION_PENDING' : 'COMPLETED', canonicalEventId: canonicalEvent.id, payload: { ...event, canonicalVersion: canonicalEvent.version } as unknown as Prisma.InputJsonValue, processedAt: new Date() }, include: { propagationJobs: true } });
    // lastSyncAt is updated by completed provider scans, never individual events.
    return { duplicate: false, syncEvent: updated, canonicalEvent, conflicts: conflict, propagationQueued: updated.propagationJobs.length };
}
export async function ingestCalendarEvent(event: NormalizedCalendarEvent, dedupeKey: string) {
    return prisma.$transaction(async (tx) => {
        await tx.$executeRaw `SELECT pg_advisory_xact_lock(hashtext(${event.providerRef}))`;
        return ingestCalendarEventTx(tx, event, dedupeKey);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 20000 });
}
