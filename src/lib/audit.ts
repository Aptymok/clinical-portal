import { prisma } from './prisma'

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
    await prisma.auditLog.create({ data: {
      actorId: input.actorId,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      requestId: input.requestId,
      ip: input.ip,
      userAgent: input.userAgent,
      status: input.status,
      meta: input.meta ?? {}
    }})
  }catch(e){
    // don't break main flow; best effort
    console.error('audit error', e)
  }
}
