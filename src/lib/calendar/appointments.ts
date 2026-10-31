import { randomUUID } from 'node:crypto';
import { Prisma, type Appointment } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { calendarCoverage, providerCalendarRef } from './coverage';
import { APPOINTMENT_DURATION_MS, checkCanonicalAvailability } from './availability';
import { ingestCalendarEventTx } from './orchestrator';
async function mirrorAppointment(tx: Prisma.TransactionClient, appointment: Appointment) {
    await tx.calendarSource.upsert({ where: { id: 'clinical-portal' }, create: { id: 'clinical-portal', name: 'Agenda interna', providerType: 'CLINICAL_PORTAL', readAuthority: true }, update: { enabled: true, readAuthority: true } });
    return ingestCalendarEventTx(tx, {
        sourceId: 'clinical-portal', externalEventId: appointment.id, correlationKey: `appointment:${appointment.id}`,
        providerRef: providerCalendarRef(appointment.providerId), startsAt: appointment.scheduledFor.toISOString(), endsAt: new Date(+appointment.scheduledFor + APPOINTMENT_DURATION_MS).toISOString(),
        timezone: 'America/Mexico_City', status: appointment.status === 'CANCELLED' || appointment.status === 'NO_SHOW' ? 'CANCELLED' : appointment.status === 'COMPLETED' ? 'COMPLETED' : 'SCHEDULED',
        sourceUpdatedAt: appointment.updatedAt.toISOString()
    }, `appointment:${appointment.id}:${randomUUID()}`);
}
async function assertSlot(tx: Prisma.TransactionClient, providerId: string, start: Date, id?: string) {
    if (process.env.CALENDAR_INTERNAL_PROVIDER_ID !== providerId)
        throw new Error('CALENDAR_PROVIDER_MAPPING_UNVERIFIED');
    const sources = await tx.calendarSource.findMany();
    if (!calendarCoverage(sources).verified)
        throw new Error('CALENDAR_COVERAGE_UNVERIFIED');
    const available = await checkCanonicalAvailability({ providerRef: providerCalendarRef(providerId), startsAt: start, endsAt: new Date(+start + APPOINTMENT_DURATION_MS), excludeAppointmentId: id, excludeCanonicalKey: id ? `appointment:${id}` : undefined }, tx);
    if (!available.available)
        throw new Error(available.occupiedBy && 'kind' in available.occupiedBy && available.occupiedBy.kind === 'UNCONFIRMED_PROPAGATION' ? 'CALENDAR_COVERAGE_UNVERIFIED' : 'APPOINTMENT_SLOT_CONFLICT');
}
export async function createAppointment(data: {
    patientId: string;
    providerId: string;
    scheduledFor: string;
    reason?: string;
    notes?: string;
}) {
    return prisma.$transaction(async (tx) => {
        await tx.$executeRaw `SELECT pg_advisory_xact_lock(hashtext(${providerCalendarRef(data.providerId)}))`;
        const start = new Date(data.scheduledFor);
        await assertSlot(tx, data.providerId, start);
        const appointment = await tx.appointment.create({ data: { ...data, scheduledFor: start } });
        const synchronization = await mirrorAppointment(tx, appointment);
        return { appointment, synchronization };
    }, { isolationLevel: 'Serializable', timeout: 20000 });
}
export async function updateAppointment(id: string, data: {
    scheduledFor?: string;
    status?: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
    reason?: string;
    notes?: string;
}) {
    return prisma.$transaction(async (tx) => {
        const initial = await tx.appointment.findUnique({ where: { id } });
        if (!initial)
            throw new Error('NOT_FOUND');
        await tx.$executeRaw `SELECT pg_advisory_xact_lock(hashtext(${providerCalendarRef(initial.providerId)}))`;
        const current = await tx.appointment.findUniqueOrThrow({ where: { id } });
        const start = data.scheduledFor ? new Date(data.scheduledFor) : current.scheduledFor;
        const status = data.status || current.status;
        if (status === 'SCHEDULED' && (data.scheduledFor || data.status === 'SCHEDULED'))
            await assertSlot(tx, current.providerId, start, id);
        const appointment = await tx.appointment.update({ where: { id }, data: { ...data, scheduledFor: start } });
        const synchronization = await mirrorAppointment(tx, appointment);
        return { appointment, synchronization };
    }, { isolationLevel: 'Serializable', timeout: 20000 });
}
