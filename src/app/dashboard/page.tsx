import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { formatDateTime } from '@/lib/format'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function Dashboard(){
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

  const data = { patientsCount, appointmentsCount, encountersCount, upcomingAppointments }

  return (
    <>
      <Header />
      <div className="container page">
        <h2>Dashboard clínico</h2>
        <div className="stats-grid">
          <div className="card stat-card">
            <p className="eyebrow">Pacientes</p>
            <h3>{data?.patientsCount ?? 0}</h3>
          </div>
          <div className="card stat-card">
            <p className="eyebrow">Citas</p>
            <h3>{data?.appointmentsCount ?? 0}</h3>
          </div>
          <div className="card stat-card">
            <p className="eyebrow">Consultas</p>
            <h3>{data?.encountersCount ?? 0}</h3>
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <h3>Próximas citas</h3>
          {data?.upcomingAppointments?.length ? (
            <ul>
              {data.upcomingAppointments.map((item: any) => (
                <li key={item.id}>
                  {formatDateTime(item.scheduledFor)} · {item.patient?.person?.firstName} {item.patient?.person?.lastName} · {item.provider?.person?.firstName} {item.provider?.person?.lastName}
                </li>
              ))}
            </ul>
          ) : (
            <p>No hay citas programadas en los próximos días.</p>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}
