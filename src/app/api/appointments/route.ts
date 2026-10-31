import { requireSameOrigin } from '@/lib/same-origin'
import { requireStaffApi } from '@/lib/staff-access'
import { prisma } from '@/lib/prisma'
import { jsonErrorResponse, jsonSuccess } from '@/lib/errors'
import { parseJsonBody, validateSchema } from '@/lib/validation'
import { AppointmentCreateSchema } from '@/schemas/appointment.schema'
import { logAudit } from '@/lib/audit'
import { createAppointment } from '@/lib/calendar/appointments'
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
    requireSameOrigin(req)
    const body = await parseJsonBody<any>(req)
    const data = validateSchema(AppointmentCreateSchema, body)
    const { appointment: created } = await createAppointment(data)
    await logAudit({ action: 'CREATE', resource: 'Appointment', resourceId: created.id })
    return jsonSuccess(created, 201)
  }catch(e){
    if(e instanceof Error && (e.message==='APPOINTMENT_SLOT_CONFLICT'||e.message==='CALENDAR_COVERAGE_UNVERIFIED'||e.message==='CALENDAR_PROVIDER_MAPPING_UNVERIFIED')) return NextResponse.json({error:e.message},{status:e.message==='APPOINTMENT_SLOT_CONFLICT'?409:503})
    return jsonErrorResponse(e)
  }
}
