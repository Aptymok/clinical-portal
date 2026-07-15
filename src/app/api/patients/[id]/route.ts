import { prisma } from '@/lib/prisma'
import { jsonErrorResponse, jsonSuccess } from '@/lib/errors'
import { parseJsonBody, validateSchema } from '@/lib/validation'
import { PatientPatchSchema } from '@/schemas/patient.schema'
import { logAudit } from '@/lib/audit'

export async function GET(_req: Request, { params }: { params: { id: string } }){
  try{
    const id = params.id
    const patient = await prisma.patient.findUnique({ where: { id }, include: { person: true } })
    if (!patient) return jsonErrorResponse({ message: 'Not found', code: 'NOT_FOUND', status: 404 })
    return jsonSuccess(patient)
  }catch(e){
    return jsonErrorResponse(e)
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }){
  try{
    const id = params.id
    const body = await parseJsonBody<any>(req)
    const data = validateSchema(PatientPatchSchema, body)
    const updated = await prisma.patient.update({ where: { id }, data: data as any, include: { person: true } })
    await logAudit({ action: 'UPDATE', resource: 'Patient', resourceId: id, meta: { updated: true } })
    return jsonSuccess(updated)
  }catch(e){
    return jsonErrorResponse(e)
  }
}
