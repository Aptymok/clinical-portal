import { prisma } from '@/lib/prisma'
import { jsonErrorResponse, jsonSuccess } from '@/lib/errors'
import { parseJsonBody, validateSchema } from '@/lib/validation'
import { AppointmentPatchSchema } from '@/schemas/appointment.schema'
import { logAudit } from '@/lib/audit'

export async function PATCH(req: Request, { params }: { params: { id: string } }){
  try{
    const id = params.id
    const body = await parseJsonBody<any>(req)
    const data = validateSchema(AppointmentPatchSchema, body)
    const updated = await prisma.appointment.update({ where: { id }, data: data as any })
    await logAudit({ action: 'UPDATE', resource: 'Appointment', resourceId: id })
    return jsonSuccess(updated)
  }catch(e){
    return jsonErrorResponse(e)
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }){
  try{
    const id = params.id
    await prisma.appointment.delete({ where: { id } })
    await logAudit({ action: 'DELETE', resource: 'Appointment', resourceId: id })
    return jsonSuccess({ ok: true })
  }catch(e){
    return jsonErrorResponse(e)
  }
}
