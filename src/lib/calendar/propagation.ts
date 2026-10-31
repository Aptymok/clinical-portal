import { CalendarPropagationState, CalendarSyncState, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { upsertGoogleBusy, cancelGoogleBusy } from '@/lib/calendar/google';
import { upsertDocplannerBusy, cancelDocplannerBusy } from '@/lib/calendar/docplanner';
import { upsertGenericBusy, cancelGenericBusy } from '@/lib/calendar/generic-webhook';
export async function processPropagationJobs(input: {
    syncEventId?: string;
    limit?: number;
} = {}) {
    const jobs = await prisma.calendarPropagationJob.findMany({
        where: {
            ...(input.syncEventId ? { syncEventId: input.syncEventId } : {}),
            OR: [{ state: { in: ['PENDING', 'FAILED'] } }, { state: 'SENT', lastAttemptAt: { lt: new Date(Date.now() - 120000) } }],
            attempts: { lt: 5 }
        },
        include: {
            targetSource: true,
            canonicalEvent: true,
            syncEvent: true
        },
        orderBy: { createdAt: 'asc' },
        take: input.limit || 25
    });
    const results: Array<{
        jobId: string;
        state: string;
        error?: string;
    }> = [];
    for (const job of jobs) {
        if (!job.targetSource.enabled || !job.targetSource.writeAuthority || job.canonicalEvent.conflict || job.syncEvent.state === CalendarSyncState.CONFLICT) {
            await prisma.calendarPropagationJob.update({ where: { id: job.id }, data: { state: CalendarPropagationState.SKIPPED, externalReturn: { reason: job.canonicalEvent.conflict || job.syncEvent.state === CalendarSyncState.CONFLICT ? 'conflict-requires-review' : 'target-not-authorized' } } });
            results.push({ jobId: job.id, state: 'SKIPPED' });
            continue;
        }
        // Recover abandoned SENT jobs using an atomic lease. Two workers cannot
        // claim the same attempt; every external call has a shorter timeout.
        const claim = await prisma.$transaction(async (tx) => {
            await tx.$executeRaw `SELECT pg_advisory_xact_lock(hashtext(${job.canonicalEventId + ':' + job.targetSourceId}))`;
            const active = await tx.calendarPropagationJob.findFirst({ where: { canonicalEventId: job.canonicalEventId, targetSourceId: job.targetSourceId, state: 'SENT', lastAttemptAt: { gte: new Date(Date.now() - 120000) } } });
            if (active)
                return { count: 0 };
            return tx.calendarPropagationJob.updateMany({
                where: { id: job.id, state: job.state, attempts: job.attempts, lastAttemptAt: job.lastAttemptAt },
                data: { state: 'SENT', attempts: { increment: 1 }, lastAttemptAt: new Date(), error: null }
            });
        });
        if (!claim.count)
            continue;
        const current = await prisma.canonicalCalendarEvent.findUniqueOrThrow({ where: { id: job.canonicalEventId } });
        const targetNow = await prisma.calendarSource.findUniqueOrThrow({ where: { id: job.targetSourceId } });
        if (current.conflict || !targetNow.enabled || !targetNow.writeAuthority) {
            await prisma.calendarPropagationJob.update({ where: { id: job.id }, data: { state: 'SKIPPED', externalReturn: { reason: 'authorization-or-conflict-changed' } } });
            results.push({ jobId: job.id, state: 'SKIPPED' });
            continue;
        }
        const expectedVersion = (job.syncEvent.payload as {
            canonicalVersion?: number;
        })?.canonicalVersion;
        const newer = await prisma.calendarPropagationJob.findFirst({ where: { canonicalEventId: job.canonicalEventId, targetSourceId: job.targetSourceId, createdAt: { gt: job.createdAt } } });
        if (newer || (expectedVersion && expectedVersion !== current.version) || (job.action === 'CANCEL_OR_FREE') !== (current.status === 'CANCELLED')) {
            await prisma.calendarPropagationJob.update({ where: { id: job.id }, data: { state: 'SKIPPED', externalReturn: { reason: 'superseded' } } });
            results.push({ jobId: job.id, state: 'SUPERSEDED' });
            continue;
        }
        try {
            let result: {
                externalEventId?: string;
                observedState?: unknown;
            };
            if (job.targetSource.providerType === 'GOOGLE_CALENDAR') {
                result = job.action === 'CANCEL_OR_FREE'
                    ? await cancelGoogleBusy(job.targetSource, current)
                    : await upsertGoogleBusy(job.targetSource, current);
            }
            else if (job.targetSource.providerType === 'DOCPLANNER') {
                result = job.action === 'CANCEL_OR_FREE'
                    ? await cancelDocplannerBusy(job.targetSource, current)
                    : await upsertDocplannerBusy(job.targetSource, current);
            }
            else if (job.targetSource.providerType === 'GENERIC_WEBHOOK') {
                result = job.action === 'CANCEL_OR_FREE'
                    ? await cancelGenericBusy(job.targetSource, current)
                    : await upsertGenericBusy(job.targetSource, current);
            }
            else {
                await prisma.calendarPropagationJob.update({
                    where: { id: job.id },
                    data: {
                        state: CalendarPropagationState.SKIPPED,
                        externalReturn: { reason: 'unsupported-provider-type' }
                    }
                });
                results.push({ jobId: job.id, state: 'SKIPPED' });
                continue;
            }
            const afterWrite = await prisma.canonicalCalendarEvent.findUniqueOrThrow({ where: { id: job.canonicalEventId } });
            if (afterWrite.version !== current.version || afterWrite.conflict) {
                // A provider cannot honor our database lease/fencing token. If an old
                // call outlives it, durably replay the latest version even if another
                // worker already confirmed that version before this old call finished.
                const latest = await prisma.calendarPropagationJob.findFirst({ where: { canonicalEventId: job.canonicalEventId, targetSourceId: job.targetSourceId }, include: { syncEvent: true }, orderBy: { createdAt: 'desc' } });
                if (latest && (latest.syncEvent.payload as {
                    canonicalVersion?: number;
                })?.canonicalVersion === afterWrite.version)
                    await prisma.calendarPropagationJob.updateMany({ where: { id: latest.id, state: { in: ['CONFIRMED', 'SKIPPED'] } }, data: { state: 'PENDING', attempts: 0, error: 'Recheck latest state after older in-flight write' } });
                throw new Error('Canonical event changed during external write; latest state must be verified');
            }
            await prisma.calendarPropagationJob.update({
                where: { id: job.id },
                data: {
                    state: CalendarPropagationState.CONFIRMED,
                    externalReturn: (result.observedState ?? { externalEventId: result.externalEventId }) as Prisma.InputJsonValue
                }
            });
            results.push({ jobId: job.id, state: 'CONFIRMED' });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Propagation failed';
            await prisma.calendarPropagationJob.update({
                where: { id: job.id },
                data: { state: CalendarPropagationState.FAILED, error: message }
            });
            await prisma.calendarAlert.create({
                data: {
                    canonicalEventId: job.canonicalEventId,
                    type: 'PROPAGATION_FAILED',
                    severity: 'CRITICAL',
                    message: `No se pudo actualizar ${job.targetSource.name}: ${message}`,
                    meta: { jobId: job.id, sourceId: job.targetSourceId, action: job.action }
                }
            });
            results.push({ jobId: job.id, state: 'FAILED', error: message });
        }
    }
    const syncIds = Array.from(new Set(jobs.map((job) => job.syncEventId)));
    for (const syncEventId of syncIds) {
        const sync = await prisma.calendarSyncEvent.findUnique({ where: { id: syncEventId } });
        if (!sync || sync.state === CalendarSyncState.CONFLICT)
            continue;
        const skippedRows = await prisma.calendarPropagationJob.findMany({ where: { syncEventId, state: 'SKIPPED' }, select: { externalReturn: true } });
        const skipped = skippedRows.filter(row => (row.externalReturn as {
            reason?: string;
        })?.reason !== 'superseded').length;
        const remaining = await prisma.calendarPropagationJob.count({
            where: {
                syncEventId,
                state: { in: [CalendarPropagationState.PENDING, CalendarPropagationState.SENT, CalendarPropagationState.FAILED] }
            }
        });
        await prisma.calendarSyncEvent.update({
            where: { id: syncEventId },
            data: {
                state: remaining || skipped ? CalendarSyncState.PROPAGATION_PENDING : CalendarSyncState.COMPLETED
            }
        });
    }
    return results;
}
