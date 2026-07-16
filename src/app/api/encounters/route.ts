import { prisma } from '@/lib/prisma'
import { jsonErrorResponse, jsonSuccess } from '@/lib/errors'
import { parseJsonBody, validateSchema } from '@/lib/validation'
import { EncounterCreateSchema } from '@/schemas/encounter.schema'
import { logAudit } from '@/lib/audit'

export async function GET(){
  try{
    const items = await prisma.encounter.findMany({
      include: {
        patient: { include: { person: true } },
        provider: { include: { person: true } }
      },
      orderBy: { startedAt: 'desc' }
    })
    return jsonSuccess(items)
  }catch(e){
    return jsonErrorResponse(e)
  }
}

export async function POST(req: Request){
  try{
    const body = await parseJsonBody<any>(req)
    const data = validateSchema(EncounterCreateSchema, body)
    const created = await prisma.encounter.create({ data: { patientId: data.patientId, providerId: data.providerId, startedAt: data.startedAt ? new Date(data.startedAt) : undefined, endedAt: data.endedAt ? new Date(data.endedAt) : undefined, reason: data.reason, notes: data.notes, observations: data.observations ? { create: data.observations as any } : undefined, diagnoses: data.diagnoses ? { create: data.diagnoses as any } : undefined } })
    await logAudit({ action: 'CREATE', resource: 'Encounter', resourceId: created.id })
    return jsonSuccess(created, 201)
  }catch(e){
    return jsonErrorResponse(e)
  }
}
