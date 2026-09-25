import { CalendarCanonicalStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function checkCanonicalAvailability(input: {
  providerRef: string
  startsAt: string | Date
  endsAt: string | Date
  excludeCanonicalKey?: string
}) {
  const startsAt = new Date(input.startsAt)
  const endsAt = new Date(input.endsAt)

  if (!(startsAt < endsAt)) throw new Error('Invalid calendar interval')

  const occupiedBy = await prisma.canonicalCalendarEvent.findFirst({
    where: {
      providerRef: input.providerRef,
      status: { not: CalendarCanonicalStatus.CANCELLED },
      canonicalKey: input.excludeCanonicalKey ? { not: input.excludeCanonicalKey } : undefined,
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt }
    },
    select: {
      id: true,
      canonicalKey: true,
      startsAt: true,
      endsAt: true,
      status: true,
      conflict: true
    },
    orderBy: { startsAt: 'asc' }
  })

  return {
    available: !occupiedBy,
    occupiedBy
  }
}
