import { requireSameOrigin } from '@/lib/same-origin'
import { requireStaffApi } from '@/lib/staff-access'
import { prisma } from '@/lib/prisma'
import { jsonErrorResponse, jsonSuccess } from '@/lib/errors'
import { parseJsonBody, validateSchema } from '@/lib/validation'
import { AppointmentPatchSchema } from '@/schemas/appointment.schema'
import { logAudit } from '@/lib/audit'
import { NextResponse } from 'next/server'
import { updateAppointment } from '@/lib/calendar/appointments'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }){
  try{
    await requireStaffApi()
    const id = (await params).id
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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }){
  try{
    await requireStaffApi()
    requireSameOrigin(req)
    const id = (await params).id
    const body = await parseJsonBody<any>(req)
    const data = validateSchema(AppointmentPatchSchema, body)
    const { appointment: updated } = await updateAppointment(id, data)
    await logAudit({ action: 'UPDATE', resource: 'Appointment', resourceId: id })
    return jsonSuccess(updated)
  }catch(e){
    if(e instanceof Error && (e.message==='APPOINTMENT_SLOT_CONFLICT'||e.message==='CALENDAR_COVERAGE_UNVERIFIED'||e.message==='CALENDAR_PROVIDER_MAPPING_UNVERIFIED')) return NextResponse.json({error:e.message},{status:e.message==='APPOINTMENT_SLOT_CONFLICT'?409:503})
    if(e instanceof Error && e.message==='NOT_FOUND')return NextResponse.json({error:'NOT_FOUND'},{status:404})
    return jsonErrorResponse(e)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }){
  try{
    await requireStaffApi()
    requireSameOrigin(_req)
    const id = (await params).id
    const current = await prisma.appointment.findUnique({ where: { id } })
    if (!current) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    const { appointment: updated, synchronization } = await updateAppointment(id, { status: 'CANCELLED' })
    await logAudit({ action: 'CANCEL', resource: 'Appointment', resourceId: id })
    return jsonSuccess({ ok: true, status: updated.status, externalPropagation: synchronization.propagationQueued ? 'QUEUED' : 'NO_AUTHORIZED_TARGET' })
  }catch(e){
    return jsonErrorResponse(e)
  }
}
