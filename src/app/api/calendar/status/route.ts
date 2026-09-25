import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const sources = await prisma.calendarSource.findMany({
    orderBy: { id: 'asc' },
    select: {
      id: true,
      name: true,
      providerType: true,
      enabled: true,
      readAuthority: true,
      writeAuthority: true,
      realtimeBookingCheck: true,
      webhookEnabled: true,
      externalRef: true,
      lastSyncAt: true,
      config: true,
      secret: { select: { id: true, updatedAt: true } }
    }
  })

  const pending = await prisma.calendarPropagationJob.count({
    where: { state: { in: ['PENDING', 'SENT', 'FAILED'] } }
  })
  const alerts = await prisma.calendarAlert.count({ where: { status: 'OPEN' } })

  return NextResponse.json({
    sources: sources.map((source) => ({
      ...source,
      hasEncryptedSecret: Boolean(source.secret),
      secret: undefined
    })),
    pendingPropagationJobs: pending,
    openAlerts: alerts
  })
}
