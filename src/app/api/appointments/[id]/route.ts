import { prisma } from '@/lib/prisma'
import { jsonErrorResponse, jsonSuccess } from '@/lib/errors'
import { parseJsonBody, validateSchema } from '@/lib/validation'
import { AppointmentPatchSchema } from '@/schemas/appointment.schema'
import { logAudit } from '@/lib/audit'

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
