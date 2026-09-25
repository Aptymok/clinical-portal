import { CalendarCanonicalStatus, CalendarSyncState, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { NormalizedCalendarEvent } from './contracts'

function canonicalKeyFor(event: NormalizedCalendarEvent) {
  const correlation = event.correlationKey?.trim()
  return correlation || `source:${event.sourceId}:${event.externalEventId}`
}

function canonicalStatusFor(event: NormalizedCalendarEvent): CalendarCanonicalStatus {
  if (event.status === 'CANCELLED') return CalendarCanonicalStatus.CANCELLED
  if (event.status === 'UNKNOWN') return CalendarCanonicalStatus.TENTATIVE
  return CalendarCanonicalStatus.BUSY
}

export async function ingestCalendarEvent(
  event: NormalizedCalendarEvent,
  dedupeKey: string
) {
  return prisma.$transaction(async (tx) => {
    const source = await tx.calendarSource.findUnique({ where: { id: event.sourceId } })

    if (!source || !source.enabled || !source.readAuthority) {
      throw new Error(`Calendar source ${event.sourceId} is not authorized for intake`)
    }

    const existingSync = await tx.calendarSyncEvent.findUnique({
      where: { dedupeKey },
      include: { canonicalEvent: true, propagationJobs: true }
    })

    if (existingSync) {
      return {
        duplicate: true,
        syncEvent: existingSync,
        canonicalEvent: existingSync.canonicalEvent,
        conflicts: existingSync.state === CalendarSyncState.CONFLICT,
        propagationQueued: existingSync.propagationJobs.length
      }
    }

    const syncEvent = await tx.calendarSyncEvent.create({
      data: {
        dedupeKey,
        sourceId: event.sourceId,
        externalEventId: event.externalEventId,
        eventType: event.status === 'CANCELLED' ? 'CANCEL_OR_FREE' : 'UPSERT_BUSY',
        payload: event as unknown as Prisma.InputJsonValue,
        state: CalendarSyncState.RECEIVED
      }
    })

    const canonicalKey = canonicalKeyFor(event)
    const startsAt = new Date(event.startsAt)
    const endsAt = new Date(event.endsAt)

    if (!(startsAt < endsAt)) {
      await tx.calendarSyncEvent.update({
        where: { id: syncEvent.id },
        data: { state: CalendarSyncState.FAILED, error: 'Invalid calendar interval', processedAt: new Date() }
      })
      throw new Error('Invalid calendar interval')
    }

    const incomingStatus = canonicalStatusFor(event)

    const overlaps = incomingStatus === CalendarCanonicalStatus.CANCELLED
      ? []
      : await tx.canonicalCalendarEvent.findMany({
          where: {
            providerRef: event.providerRef,
            status: { not: CalendarCanonicalStatus.CANCELLED },
            canonicalKey: { not: canonicalKey },
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt }
          },
          select: { id: true, canonicalKey: true, startsAt: true, endsAt: true }
        })

    const conflict = overlaps.length > 0
    const conflictMeta = conflict
      ? {
          overlapCanonicalIds: overlaps.map((item) => item.id),
          overlapCanonicalKeys: overlaps.map((item) => item.canonicalKey)
        }
      : Prisma.JsonNull

    const canonicalEvent = await tx.canonicalCalendarEvent.upsert({
      where: { canonicalKey },
      create: {
        canonicalKey,
        providerRef: event.providerRef,
        startsAt,
        endsAt,
        timezone: event.timezone,
        status: incomingStatus,
        sourceOfTruthId: event.sourceId,
        conflict,
        conflictMeta
      },
      update: {
        providerRef: event.providerRef,
        startsAt,
        endsAt,
        timezone: event.timezone,
        status: incomingStatus,
        sourceOfTruthId: event.sourceId,
        conflict,
        conflictMeta,
        version: { increment: 1 }
      }
    })

    if (conflict) {
      await tx.canonicalCalendarEvent.updateMany({
        where: { id: { in: overlaps.map((item) => item.id) } },
        data: { conflict: true }
      })

      await tx.calendarAlert.create({
        data: {
          canonicalEventId: canonicalEvent.id,
          type: 'SLOT_CONFLICT',
          severity: 'CRITICAL',
          message: `El horario ${event.startsAt}–${event.endsAt} ya aparece ocupado en otra fuente. Requiere reconciliación antes de cancelar o mover una cita.`,
          meta: conflictMeta
        }
      })
    }

    await tx.calendarExternalEvent.upsert({
      where: {
        sourceId_externalEventId: {
          sourceId: event.sourceId,
          externalEventId: event.externalEventId
        }
      },
      create: {
        sourceId: event.sourceId,
        externalEventId: event.externalEventId,
        canonicalEventId: canonicalEvent.id,
        correlationKey: event.correlationKey,
        providerRef: event.providerRef,
        startsAt,
        endsAt,
        timezone: event.timezone,
        status: event.status,
        sourceUpdatedAt: event.sourceUpdatedAt ? new Date(event.sourceUpdatedAt) : null
      },
      update: {
        canonicalEventId: canonicalEvent.id,
        correlationKey: event.correlationKey,
        providerRef: event.providerRef,
        startsAt,
        endsAt,
        timezone: event.timezone,
        status: event.status,
        sourceUpdatedAt: event.sourceUpdatedAt ? new Date(event.sourceUpdatedAt) : null,
        lastObservedAt: new Date()
      }
    })

    const targets = await tx.calendarSource.findMany({
      where: {
        enabled: true,
        writeAuthority: true,
        id: { not: event.sourceId }
      },
      select: { id: true }
    })

    const action = incomingStatus === CalendarCanonicalStatus.CANCELLED
      ? 'CANCEL_OR_FREE'
      : 'UPSERT_BUSY'

    if (targets.length) {
      await tx.calendarPropagationJob.createMany({
        data: targets.map((target) => ({
          syncEventId: syncEvent.id,
          canonicalEventId: canonicalEvent.id,
          targetSourceId: target.id,
          action
        })),
        skipDuplicates: true
      })
    }

    const nextState = conflict
      ? CalendarSyncState.CONFLICT
      : targets.length
        ? CalendarSyncState.PROPAGATION_PENDING
        : CalendarSyncState.COMPLETED

    const updatedSync = await tx.calendarSyncEvent.update({
      where: { id: syncEvent.id },
      data: {
        state: nextState,
        canonicalEventId: canonicalEvent.id,
        processedAt: new Date()
      },
      include: { propagationJobs: true }
    })

    await tx.calendarSource.update({
      where: { id: source.id },
      data: { lastSyncAt: new Date() }
    })

    return {
      duplicate: false,
      syncEvent: updatedSync,
      canonicalEvent,
      conflicts: conflict,
      overlappingCanonicalEvents: overlaps,
      propagationQueued: updatedSync.propagationJobs.length
    }
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable
  })
}
