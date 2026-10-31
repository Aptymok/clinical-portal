import { prisma } from './prisma'
import { randomUUID } from 'node:crypto'

type AuditInput = {
  actorId?: string | null
  action: string
  resource?: string | null
  resourceId?: string | null
  requestId?: string | null
  ip?: string | null
  userAgent?: string | null
  status?: string | null
  meta?: any
}

export async function logAudit(input: AuditInput){
  try{
    const eventId = randomUUID()
    await prisma.auditLog.create({ data: {
      actorId: input.actorId,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      requestId: input.requestId || eventId,
      ip: input.ip,
      userAgent: input.userAgent,
      status: input.status,
      meta: input.meta ?? {}
    }})
    // SFI-compatible local observation, deliberately stripped of patient data.
    // External delivery requires a separately authorized outbox processor.
    await prisma.domainEvent.create({data:{type:'SFI_OBSERVATION_V1',payload:{contract:'SFI-EXTERNAL-RETURN-1.0',eventId,client:'inmunoclinic',observedAt:new Date().toISOString(),action:input.action,resourceClass:input.resource || 'unknown',outcome:input.status || 'RECORDED',authority:'CLINIC_LOCAL',externalDelivery:'NOT_AUTHORIZED',containsPatientData:false}}})
  }catch(e){
    // don't break main flow; best effort
    console.error('audit error', e)
  }
}
