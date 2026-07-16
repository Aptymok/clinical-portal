import { prisma } from '@/lib/prisma'
import { jsonErrorResponse, jsonSuccess } from '@/lib/errors'

export async function GET() {
  try {
    const [patientsCount, appointmentsCount, encountersCount, upcomingAppointments] = await Promise.all([
      prisma.patient.count(),
      prisma.appointment.count(),
      prisma.encounter.count(),
      prisma.appointment.findMany({
        where: {
          scheduledFor: {
            gte: new Date(),
            lte: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
          }
        },
        include: {
          patient: { include: { person: true } },
          provider: { include: { person: true } }
        },
        orderBy: { scheduledFor: 'asc' },
        take: 5
      })
    ])

    return jsonSuccess({
      patientsCount,
      appointmentsCount,
      encountersCount,
      upcomingAppointments
    })
  } catch (e) {
    return jsonErrorResponse(e)
  }
}
