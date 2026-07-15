import { prisma } from '@/lib/prisma'
import { jsonErrorResponse, jsonSuccess } from '@/lib/errors'
import { parseJsonBody, validateSchema } from '@/lib/validation'
import { PatientCreateSchema } from '@/schemas/patient.schema'
import { logAudit } from '@/lib/audit'

export async function GET(){
  try{
    const patients = await prisma.patient.findMany({ include: { person: true } })
    return jsonSuccess(patients)
  }catch(e){
    return jsonErrorResponse(e)
  }
}

export async function POST(req: Request){
  try{
    const body = await parseJsonBody<any>(req)
    const data = validateSchema(PatientCreateSchema, body)
    const created = await prisma.patient.create({ data: { mrn: data.mrn, person: { create: data.person } }, include: { person: true } })
    await logAudit({ action: 'CREATE', resource: 'Patient', resourceId: created.id })
    return jsonSuccess(created, 201)
  }catch(e){
    return jsonErrorResponse(e)
  }
}
