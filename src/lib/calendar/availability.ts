import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { internalProviderId } from './coverage';
export const APPOINTMENT_DURATION_MS = 30 * 60000;
export async function checkCanonicalAvailability(input: {
    providerRef: string;
    startsAt: string | Date;
    endsAt: string | Date;
    excludeCanonicalKey?: string;
    excludeAppointmentId?: string;
}, db: Prisma.TransactionClient = prisma) {
    if (input.providerRef === (process.env.CALENDAR_PROVIDER_REF || 'dr-guillermo') && !process.env.CALENDAR_INTERNAL_PROVIDER_ID)
        throw new Error('CALENDAR_PROVIDER_MAPPING_UNVERIFIED');
    const startsAt = new Date(input.startsAt), endsAt = new Date(input.endsAt);
    if (!(startsAt < endsAt))
        throw new Error('Invalid calendar interval');
    const canonical = await db.canonicalCalendarEvent.findFirst({ where: { providerRef: input.providerRef, status: { not: 'CANCELLED' }, canonicalKey: input.excludeCanonicalKey ? { not: input.excludeCanonicalKey } : undefined, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } }, select: { id: true, canonicalKey: true, startsAt: true, endsAt: true, status: true, conflict: true } });
    if (canonical)
        return { available: false, occupiedBy: canonical };
    const local = await db.appointment.findFirst({ where: { providerId: internalProviderId(input.providerRef), status: 'SCHEDULED', id: input.excludeAppointmentId ? { not: input.excludeAppointmentId } : undefined, scheduledFor: { gt: new Date(+startsAt - APPOINTMENT_DURATION_MS), lt: endsAt } }, select: { id: true, scheduledFor: true } });
    if (local)
        return { available: false, occupiedBy: { id: local.id, kind: 'INTERNAL_APPOINTMENT' } };
    // Disputed observations also reserve their intervals; preserving one canonical
    // baseline must not accidentally free the other source's occupied interval.
    const disputed = await db.calendarExternalEvent.findFirst({ where: { providerRef: input.providerRef, status: { not: 'CANCELLED' }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt }, canonicalEvent: { conflict: true, ...(input.excludeCanonicalKey ? { canonicalKey: { not: input.excludeCanonicalKey } } : {}) } }, select: { id: true } });
    if (disputed)
        return { available: false, occupiedBy: { id: disputed.id, kind: 'DISPUTED_OBSERVATION' } };
    const pending = await db.calendarPropagationJob.findFirst({ where: { state: { in: ['PENDING', 'SENT', 'FAILED'] }, canonicalEvent: { providerRef: input.providerRef } }, select: { id: true } });
    if (pending)
        return { available: false, occupiedBy: { id: pending.id, kind: 'UNCONFIRMED_PROPAGATION' } };
    return { available: true, occupiedBy: null };
}
