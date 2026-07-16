import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { formatDateTime, getStatusText } from '@/lib/format'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function EncounterDetail({ params }: { params: { id: string } }) {
  const item = await prisma.encounter.findUnique({
    where: { id: params.id },
    include: {
      patient: { include: { person: true } },
      provider: { include: { person: true } },
      observations: true,
      diagnoses: true
    }
  })

  if (!item) {
    return (
      <>
        <Header />
        <div className="container page">
          <h2>Consulta no encontrada</h2>
          <p>No existe una consulta con este identificador.</p>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="container page">
        <div className="card" style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="eyebrow">Consulta</p>
              <h2 style={{ margin: 0 }}>{item.reason ?? 'Consulta médica'}</h2>
              <p style={{ margin: '4px 0 0' }}>Estado: {getStatusText(item.status)}</p>
            </div>
            <Link href="/encounters" className="btn-ghost">Volver a consultas</Link>
          </div>
          <div className="card" style={{ background: '#f8fbff' }}>
            <p><strong>Paciente:</strong> {item.patient?.person?.firstName} {item.patient?.person?.lastName}</p>
            <p><strong>Profesional:</strong> {item.provider?.person?.firstName} {item.provider?.person?.lastName}</p>
            <p><strong>Inicio:</strong> {formatDateTime(item.startedAt)}</p>
            <p><strong>Fin:</strong> {formatDateTime(item.endedAt)}</p>
            <p><strong>Notas:</strong> {item.notes ?? 'Sin notas'}</p>
          </div>
          <div className="card">
            <h3>Observaciones</h3>
            <ul>
              {(item.observations ?? []).length > 0 ? item.observations.map((obs: any) => (
                <li key={obs.id}>{obs.type}: {obs.value} {obs.unit ?? ''}</li>
              )) : <li>No hay observaciones registradas.</li>}
            </ul>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
