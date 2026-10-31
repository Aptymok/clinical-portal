import { requireStaffApi } from '@/lib/staff-access'
import { prisma } from '@/lib/prisma'
import { jsonErrorResponse, jsonSuccess } from '@/lib/errors'
import { parseJsonBody, validateSchema } from '@/lib/validation'
import { AppointmentCreateSchema } from '@/schemas/appointment.schema'
import { logAudit } from '@/lib/audit'
import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'

export async function GET(){
  try{
    await requireStaffApi()
    const items = await prisma.appointment.findMany({
      include: {
        patient: { include: { person: true } },
        provider: { include: { person: true } }
      },
      orderBy: { scheduledFor: 'asc' }
    })
    return jsonSuccess(items)
  }catch(e){
    return jsonErrorResponse(e)
  }
}

export async function POST(req: Request){
  try{
    await requireStaffApi()
    const body = await parseJsonBody<any>(req)
    const data = validateSchema(AppointmentCreateSchema, body)
    const scheduledFor = new Date(data.scheduledFor)
    const durationMinutes = 30
    const end = new Date(scheduledFor.getTime() + durationMinutes * 60_000)
    const created = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${data.providerId}))`
      const localCollision = await tx.appointment.findFirst({where:{providerId:data.providerId,status:'SCHEDULED',scheduledFor:{gte:new Date(scheduledFor.getTime()-durationMinutes*60_000),lt:end}}})
      const canonicalCollision = await tx.canonicalCalendarEvent.findFirst({where:{providerRef:process.env.CALENDAR_PROVIDER_REF||'dr-guillermo',status:{not:'CANCELLED'},startsAt:{lt:end},endsAt:{gt:scheduledFor}}})
      if (localCollision || canonicalCollision) throw new Error('APPOINTMENT_SLOT_CONFLICT')
      const sources = await tx.calendarSource.findMany({where:{enabled:true},select:{readAuthority:true,lastSyncAt:true,providerType:true,webhookEnabled:true}})
      if (!sources.length || sources.some(s=>!s.readAuthority||!s.lastSyncAt||(s.providerType==='GOOGLE_CALENDAR'&&!s.webhookEnabled))) throw new Error('CALENDAR_COVERAGE_UNVERIFIED')
      return tx.appointment.create({ data: { patientId:data.patientId, providerId:data.providerId, scheduledFor, reason:data.reason, notes:data.notes } })
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable})
    await logAudit({ action: 'CREATE', resource: 'Appointment', resourceId: created.id })
    return jsonSuccess(created, 201)
  }catch(e){
    if(e instanceof Error && (e.message==='APPOINTMENT_SLOT_CONFLICT'||e.message==='CALENDAR_COVERAGE_UNVERIFIED')) return NextResponse.json({error:e.message},{status:e.message==='APPOINTMENT_SLOT_CONFLICT'?409:503})
    return jsonErrorResponse(e)
  }
}
