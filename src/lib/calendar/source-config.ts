import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type DocplannerSourceConfig = {
  domain: string
  facilityId: string
  doctorId: string
  addressId: string
}

export type GoogleSourceConfig = {
  calendarId: string
  syncToken?: string
  watchChannelId?: string
  watchResourceId?: string
  watchToken?: string
  watchExpiration?: string
}

export type GenericWebhookSourceConfig = {
  writeUrl?: string
}

export async function patchCalendarSourceConfig(sourceId: string, patch: Record<string, unknown>) {
  const source = await prisma.calendarSource.findUnique({ where: { id: sourceId } })
  if (!source) throw new Error(`Calendar source ${sourceId} not found`)

  const current = source.config && typeof source.config === 'object' && !Array.isArray(source.config)
    ? source.config as Record<string, unknown>
    : {}

  return prisma.calendarSource.update({
    where: { id: sourceId },
    data: { config: { ...current, ...patch } as Prisma.InputJsonValue }
  })
}

export function sourceConfig<T>(value: unknown): T {
  return (value && typeof value === 'object' ? value : {}) as T
}
