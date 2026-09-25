import { NextResponse } from 'next/server'
import { hasValidCalendarSyncSecret } from '@/lib/calendar/integration-auth'
import { prisma } from '@/lib/prisma'
import { pullDocplannerNotifications, normalizeDocplannerNotification } from '@/lib/calendar/docplanner'
import { ingestCalendarEvent } from '@/lib/calendar/orchestrator'
import { processPropagationJobs } from '@/lib/calendar/propagation'
import { sourceConfig, type GoogleSourceConfig } from '@/lib/calendar/source-config'
import { startGoogleWatch } from '@/lib/calendar/google'

export async function POST(request: Request) {
  if (!hasValidCalendarSyncSecret(request)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  let pulled = 0
  const doctoralia = await prisma.calendarSource.findUnique({ where: { id: 'doctoralia' } })
  if (doctoralia?.readAuthority) {
    try {
      const notifications = await pullDocplannerNotifications('doctoralia')
      for (const payload of notifications) {
        const normalized = normalizeDocplannerNotification('doctoralia', payload)
        if (normalized.kind !== 'event') continue
        const result = await ingestCalendarEvent(normalized.event, normalized.dedupeKey)
        if (result.propagationQueued) await processPropagationJobs({ syncEventId: result.syncEvent.id })
        pulled += 1
      }
    } catch (error) {
      console.error('Docplanner maintenance pull failed', error)
    }
  }

  const googleSources = await prisma.calendarSource.findMany({
    where: { providerType: 'GOOGLE_CALENDAR', enabled: true, readAuthority: true }
  })

  let renewed = 0
  for (const source of googleSources) {
    const config = sourceConfig<GoogleSourceConfig>(source.config)
    const expiration = Number(config.watchExpiration || 0)
    if (!expiration || expiration < Date.now() + 24 * 60 * 60 * 1000) {
      try {
        await startGoogleWatch(source.id)
        renewed += 1
      } catch (error) {
        console.error('Google watch renewal failed', source.id, error)
      }
    }
  }

  const propagation = await processPropagationJobs({ limit: 50 })
  return NextResponse.json({ pulled, renewed, propagation })
}
