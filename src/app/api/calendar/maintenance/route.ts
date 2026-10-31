import { calendarCoverage } from '@/lib/calendar/coverage'
import { maintenanceResult } from '@/lib/calendar/maintenance-result'
import { NextResponse } from 'next/server'
import { hasValidCalendarSyncSecret } from '@/lib/calendar/integration-auth'
import { prisma } from '@/lib/prisma'
import { pullDocplannerNotifications, normalizeDocplannerNotification } from '@/lib/calendar/docplanner'
import { ingestCalendarEvent } from '@/lib/calendar/orchestrator'
import { processPropagationJobs } from '@/lib/calendar/propagation'
import { sourceConfig, type GoogleSourceConfig } from '@/lib/calendar/source-config'
import { startGoogleWatch, syncGoogleSource } from '@/lib/calendar/google'

export async function POST(request: Request) {
  if (!hasValidCalendarSyncSecret(request)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const errors: string[] = []
  let pulled = 0
  const doctoralia = await prisma.calendarSource.findUnique({ where: { id: 'doctoralia' } })
  if (doctoralia?.enabled && doctoralia.readAuthority) {
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
      errors.push('DOCPLANNER_PULL_FAILED')
      console.error('Docplanner maintenance pull failed', error)
    }
  }

  const googleSources = await prisma.calendarSource.findMany({
    where: { providerType: 'GOOGLE_CALENDAR', enabled: true, readAuthority: true }
  })

  let renewed = 0
  for (const source of googleSources) {
    try { const scan = await syncGoogleSource(source.id); pulled += scan.ingested } catch(error) { errors.push('GOOGLE_PULL_FAILED'); console.error('Google recovery pull failed', source.id) }
    const config = sourceConfig<GoogleSourceConfig>(source.config)
    const expiration = Number(config.watchExpiration || 0)
    if (!expiration || expiration < Date.now() + 24 * 60 * 60 * 1000) {
      try {
        await startGoogleWatch(source.id)
        renewed += 1
      } catch (error) {
        errors.push('GOOGLE_WATCH_FAILED')
        console.error('Google watch renewal failed', source.id, error)
      }
    }
  }

  const propagation = await processPropagationJobs({ limit: 50 })
  const sources = googleSources.length + (doctoralia?.enabled && doctoralia.readAuthority ? 1 : 0)
  const unresolved = await prisma.calendarPropagationJob.count({where:{state:{in:['PENDING','SENT','FAILED']}}})
  if(unresolved) errors.push('PROPAGATION_UNRESOLVED')
  const blockedJobs=await prisma.calendarPropagationJob.findMany({where:{state:'SKIPPED'},select:{externalReturn:true}})
  if(blockedJobs.some(job=>(job.externalReturn as {reason?:string})?.reason!=='superseded'))errors.push('PROPAGATION_BLOCKED')
  if(await prisma.canonicalCalendarEvent.count({where:{conflict:true,status:{not:'CANCELLED'}}}))errors.push('CALENDAR_CONFLICT_UNRESOLVED')
  const allSources=await prisma.calendarSource.findMany()
  if(sources && !calendarCoverage(allSources).verified)errors.push('CALENDAR_COVERAGE_UNVERIFIED')
  const status = maintenanceResult(sources, errors, propagation)
  await prisma.domainEvent.create({data:{type:'CALENDAR_MAINTENANCE_RETURN_V1',payload:{status,sources,pulled,renewed,errors,jobCount:propagation.length,observedAt:new Date().toISOString()}}})
  return NextResponse.json({ status, pulled, renewed, propagation, errors }, {status:status==='PARTIAL'?502:200})
}
