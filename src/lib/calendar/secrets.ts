import { prisma } from '@/lib/prisma'
import { decrypt, encrypt } from '@/lib/encryption'

export async function writeCalendarSecret(sourceId: string, value: unknown) {
  const encryptedPayload = encrypt(JSON.stringify(value))
  return prisma.calendarConnectionSecret.upsert({
    where: { sourceId },
    create: { sourceId, encryptedPayload },
    update: { encryptedPayload }
  })
}

export async function readCalendarSecret<T>(sourceId: string): Promise<T | null> {
  const row = await prisma.calendarConnectionSecret.findUnique({ where: { sourceId } })
  if (!row) return null
  return JSON.parse(decrypt(row.encryptedPayload)) as T
}
