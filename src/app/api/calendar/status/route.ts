import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sourceConfig, type DocplannerSourceConfig, type GoogleSourceConfig, type GenericWebhookSourceConfig } from '@/lib/calendar/source-config'

export const dynamic = 'force-dynamic'

export async function GET() {
  const sources = await prisma.calendarSource.findMany({
    orderBy: { id: 'asc' },
    include: { secret: { select: { id: true, updatedAt: true } } }
  })

  const pending = await prisma.calendarPropagationJob.count({
    where: { state: { in: ['PENDING', 'SENT', 'FAILED'] } }
  })
  const alerts = await prisma.calendarAlert.count({ where: { status: 'OPEN' } })

  const publicSources = sources.map((source) => {
    let connection: Record<string, unknown> = {}

    if (source.providerType === 'GOOGLE_CALENDAR') {
      const config = sourceConfig<GoogleSourceConfig>(source.config)
      connection = {
        calendarId: source.externalRef || config.calendarId || 'primary',
        oauthConnected: Boolean(source.secret),
        watchActive: Boolean(config.watchChannelId && config.watchExpiration),
        watchExpiration: config.watchExpiration || null
      }
    } else if (source.providerType === 'DOCPLANNER') {
      const config = sourceConfig<DocplannerSourceConfig>(source.config)
      connection = {
        domain: config.domain || 'doctoralia.mx',
        facilityConfigured: Boolean(config.facilityId),
        doctorConfigured: Boolean(config.doctorId),
        addressConfigured: Boolean(config.addressId),
        credentialsConfigured: Boolean(process.env.DOCPLANNER_CLIENT_ID && process.env.DOCPLANNER_CLIENT_SECRET)
      }
    } else if (source.providerType === 'GENERIC_WEBHOOK') {
      const config = sourceConfig<GenericWebhookSourceConfig>(source.config)
      connection = {
        writeUrlConfigured: Boolean(config.writeUrl || process.env.THIRD_CALENDAR_WRITE_URL)
      }
    }

    return {
      id: source.id,
      name: source.name,
      providerType: source.providerType,
      enabled: source.enabled,
      readAuthority: source.readAuthority,
      writeAuthority: source.writeAuthority,
      realtimeBookingCheck: source.realtimeBookingCheck,
      webhookEnabled: source.webhookEnabled,
      lastSyncAt: source.lastSyncAt,
      connection
    }
  })

  return NextResponse.json({
    sources: publicSources,
    pendingPropagationJobs: pending,
    openAlerts: alerts,
    endpoints: {
      googleRedirectUri: `${(process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')}/api/calendar/google/callback`,
      docplannerWebhookPath: '/api/calendar/docplanner/webhook?sourceId=doctoralia&token=<DOCPLANNER_WEBHOOK_SECRET>',
      genericIntakePath: '/api/calendar/intake',
      availabilityGatePath: '/api/calendar/availability',
      maintenancePath: '/api/calendar/maintenance'
    }
  })
}
