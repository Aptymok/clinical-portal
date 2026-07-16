import { prisma } from '@/lib/prisma'
import { jsonErrorResponse, jsonSuccess } from '@/lib/errors'
import { parseJsonBody, validateSchema } from '@/lib/validation'
import { AppointmentCreateSchema } from '@/schemas/appointment.schema'
import { logAudit } from '@/lib/audit'

export async function GET(){
  try{
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
    const body = await parseJsonBody<any>(req)
    const data = validateSchema(AppointmentCreateSchema, body)
    const created = await prisma.appointment.create({ data: { patientId: data.patientId, providerId: data.providerId, scheduledFor: new Date(data.scheduledFor), reason: data.reason, notes: data.notes } })
    await logAudit({ action: 'CREATE', resource: 'Appointment', resourceId: created.id })
    return jsonSuccess(created, 201)
  }catch(e){
    return jsonErrorResponse(e)
  }
}
