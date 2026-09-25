import { CalendarPropagationState, CalendarSyncState, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { upsertGoogleBusy, cancelGoogleBusy } from '@/lib/calendar/google'
import { upsertDocplannerBusy, cancelDocplannerBusy } from '@/lib/calendar/docplanner'
import { upsertGenericBusy, cancelGenericBusy } from '@/lib/calendar/generic-webhook'

export async function processPropagationJobs(input: { syncEventId?: string; limit?: number } = {}) {
  const jobs = await prisma.calendarPropagationJob.findMany({
    where: {
      ...(input.syncEventId ? { syncEventId: input.syncEventId } : {}),
      state: { in: [CalendarPropagationState.PENDING, CalendarPropagationState.FAILED] },
      attempts: { lt: 5 }
    },
    include: {
      targetSource: true,
      canonicalEvent: true,
      syncEvent: true
    },
    orderBy: { createdAt: 'asc' },
    take: input.limit || 25
  })

  const results: Array<{ jobId: string; state: string; error?: string }> = []

  for (const job of jobs) {
    await prisma.calendarPropagationJob.update({
      where: { id: job.id },
      data: {
        state: CalendarPropagationState.SENT,
        attempts: { increment: 1 },
        lastAttemptAt: new Date(),
        error: null
      }
    })

    try {
      let result: { externalEventId?: string; observedState?: unknown }

      if (job.targetSource.providerType === 'GOOGLE_CALENDAR') {
        result = job.action === 'CANCEL_OR_FREE'
          ? await cancelGoogleBusy(job.targetSource, job.canonicalEvent)
          : await upsertGoogleBusy(job.targetSource, job.canonicalEvent)
      } else if (job.targetSource.providerType === 'DOCPLANNER') {
        result = job.action === 'CANCEL_OR_FREE'
          ? await cancelDocplannerBusy(job.targetSource, job.canonicalEvent)
          : await upsertDocplannerBusy(job.targetSource, job.canonicalEvent)
      } else if (job.targetSource.providerType === 'GENERIC_WEBHOOK') {
        result = job.action === 'CANCEL_OR_FREE'
          ? await cancelGenericBusy(job.targetSource, job.canonicalEvent)
          : await upsertGenericBusy(job.targetSource, job.canonicalEvent)
      } else {
        await prisma.calendarPropagationJob.update({
          where: { id: job.id },
          data: {
            state: CalendarPropagationState.SKIPPED,
            externalReturn: { reason: 'unsupported-provider-type' }
          }
        })
        results.push({ jobId: job.id, state: 'SKIPPED' })
        continue
      }

      await prisma.calendarPropagationJob.update({
        where: { id: job.id },
        data: {
          state: CalendarPropagationState.CONFIRMED,
          externalReturn: (result.observedState ?? { externalEventId: result.externalEventId }) as Prisma.InputJsonValue
        }
      })
      results.push({ jobId: job.id, state: 'CONFIRMED' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Propagation failed'
      await prisma.calendarPropagationJob.update({
        where: { id: job.id },
        data: { state: CalendarPropagationState.FAILED, error: message }
      })
      await prisma.calendarAlert.create({
        data: {
          canonicalEventId: job.canonicalEventId,
          type: 'PROPAGATION_FAILED',
          severity: 'CRITICAL',
          message: `No se pudo actualizar ${job.targetSource.name}: ${message}`,
          meta: { jobId: job.id, sourceId: job.targetSourceId, action: job.action }
        }
      })
      results.push({ jobId: job.id, state: 'FAILED', error: message })
    }
  }

  const syncIds = Array.from(new Set(jobs.map((job) => job.syncEventId)))
  for (const syncEventId of syncIds) {
    const sync = await prisma.calendarSyncEvent.findUnique({ where: { id: syncEventId } })
    if (!sync || sync.state === CalendarSyncState.CONFLICT) continue

    const remaining = await prisma.calendarPropagationJob.count({
      where: {
        syncEventId,
        state: { in: [CalendarPropagationState.PENDING, CalendarPropagationState.SENT, CalendarPropagationState.FAILED] }
      }
    })

    await prisma.calendarSyncEvent.update({
      where: { id: syncEventId },
      data: {
        state: remaining ? CalendarSyncState.PROPAGATION_PENDING : CalendarSyncState.COMPLETED
      }
    })
  }

  return results
}
