import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { formatDateTime, getStatusText } from '@/lib/format'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function PatientDetail({ params }: { params: { id: string } }) {
  const patient = await prisma.patient.findUnique({
    where: { id: params.id },
    include: {
      person: true,
      appointments: {
        include: { provider: { include: { person: true } } },
        orderBy: { scheduledFor: 'asc' },
        take: 5
      }
    }
  })

  if (!patient) {
    return (
      <>
        <Header />
        <div className="container page">
          <h2>Paciente no encontrado</h2>
          <p>No existe un paciente con este identificador.</p>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="container page">
        <div className="card" style={{ display: 'grid', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="eyebrow">Paciente</p>
              <h2 style={{ margin: 0 }}>{patient.person.firstName} {patient.person.lastName}</h2>
              <p style={{ margin: '4px 0 0' }}>MRN: {patient.mrn ?? '—'}</p>
            </div>
            <Link href="/patients" className="btn-ghost">Volver a pacientes</Link>
          </div>

          <div className="card" style={{ background: '#f8fbff' }}>
            <h3>Datos del paciente</h3>
            <p><strong>Género:</strong> {patient.person.gender ?? 'No informado'}</p>
            <p><strong>Fecha de nacimiento:</strong> {formatDateTime(patient.person.birthDate)}</p>
          </div>

          <div className="card">
            <h3>Próximas citas</h3>
            <ul>
              {(patient.appointments ?? []).length > 0 ? patient.appointments.map((item: any) => (
                <li key={item.id}>
                  {formatDateTime(item.scheduledFor)} · {getStatusText(item.status)} · {item.reason ?? 'Sin motivo registrado'}
                </li>
              )) : <li>No hay citas registradas.</li>}
            </ul>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
