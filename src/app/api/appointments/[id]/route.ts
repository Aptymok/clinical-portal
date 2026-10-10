import { prisma } from '@/lib/prisma'
import { jsonErrorResponse, jsonSuccess } from '@/lib/errors'
import { parseJsonBody, validateSchema } from '@/lib/validation'
import { AppointmentPatchSchema } from '@/schemas/appointment.schema'
import { logAudit } from '@/lib/audit'
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

export async function GET(_req: Request, { params }: { params: { id: string } }){
  try{
    const id = params.id
    const item = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { include: { person: true } },
        provider: { include: { person: true } }
      }
    })
    if (!item) return jsonErrorResponse({ message: 'Not found', code: 'NOT_FOUND', status: 404 })
    return jsonSuccess(item)
  }catch(e){
    return jsonErrorResponse(e)
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }){
  try{
    const id = params.id
    const body = await parseJsonBody<any>(req)
    const data = validateSchema(AppointmentPatchSchema, body)
    if (data.scheduledFor || data.status === 'SCHEDULED') {
      const current = await prisma.appointment.findUnique({where:{id}})
      if(!current) return NextResponse.json({error:'NOT_FOUND'},{status:404})
      const start = new Date(data.scheduledFor || current.scheduledFor)
      const end = new Date(start.getTime()+30*60_000)
      const updated = await prisma.$transaction(async tx=>{
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${current.providerId}))`
        const sources=await tx.calendarSource.findMany({where:{enabled:true},select:{readAuthority:true,lastSyncAt:true,providerType:true,webhookEnabled:true}})
        if(!sources.length||sources.some(s=>!s.readAuthority||!s.lastSyncAt||(s.providerType==='GOOGLE_CALENDAR'&&!s.webhookEnabled)))throw new Error('CALENDAR_COVERAGE_UNVERIFIED')
        const local=await tx.appointment.findFirst({where:{id:{not:id},providerId:current.providerId,status:'SCHEDULED',scheduledFor:{gte:new Date(start.getTime()-30*60_000),lt:end}}})
        const canonical=await tx.canonicalCalendarEvent.findFirst({where:{providerRef:process.env.CALENDAR_PROVIDER_REF||'dr-guillermo',status:{not:'CANCELLED'},startsAt:{lt:end},endsAt:{gt:start}}})
        if(local||canonical)throw new Error('APPOINTMENT_SLOT_CONFLICT')
        return tx.appointment.update({where:{id},data:data as any})
      },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable})
      await logAudit({ action:'UPDATE',resource:'Appointment',resourceId:id })
      return jsonSuccess(updated)
    }
    const updated = await prisma.appointment.update({ where: { id }, data: data as any })
    await logAudit({ action: 'UPDATE', resource: 'Appointment', resourceId: id })
    return jsonSuccess(updated)
  }catch(e){
    if(e instanceof Error && (e.message==='APPOINTMENT_SLOT_CONFLICT'||e.message==='CALENDAR_COVERAGE_UNVERIFIED')) return NextResponse.json({error:e.message},{status:e.message==='APPOINTMENT_SLOT_CONFLICT'?409:503})
    return jsonErrorResponse(e)
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }){
  try{
    const id = params.id
    const current = await prisma.appointment.findUnique({ where: { id } })
    if (!current) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    const updated = await prisma.appointment.update({ where: { id }, data: { status: 'CANCELLED' } })
    await logAudit({ action: 'CANCEL', resource: 'Appointment', resourceId: id })
    return jsonSuccess({ ok: true, status: updated.status, externalPropagation: 'NOT_VERIFIED' })
  }catch(e){
    return jsonErrorResponse(e)
  }
}
