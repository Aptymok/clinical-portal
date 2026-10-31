import AppointmentForm from '@/components/AppointmentForm'
import AppointmentOutcome from '@/components/AppointmentOutcome'
import { requireStaffPage } from '@/lib/staff-access'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { formatDateTime, getStatusText } from '@/lib/format'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function AppointmentDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage()
  const item = await prisma.appointment.findUnique({
    where: { id: (await params).id },
    include: {
      patient: { include: { person: true } },
      provider: { include: { person: true } }
    }
  })

  if (!item) {
    return (
      <>
        <Header />
        <div className="container page">
          <h2>Cita no encontrada</h2>
          <p>No existe una cita con este identificador.</p>
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
              <p className="eyebrow">Cita</p>
              <h2 style={{ margin: 0 }}>{formatDateTime(item.scheduledFor)}</h2>
              <p style={{ margin: '4px 0 0' }}>Estado: {getStatusText(item.status)}</p>
            </div>
            <Link href="/appointments" className="btn-ghost">Volver a citas</Link>
          </div>
          <div className="card" style={{ background: '#f8fbff' }}>
            <p><strong>Paciente:</strong> {item.patient?.person?.firstName} {item.patient?.person?.lastName}</p>
            <p><strong>Profesional:</strong> {item.provider?.person?.firstName} {item.provider?.person?.lastName}</p>
            <p><strong>Motivo:</strong> {item.reason ?? 'Sin motivo registrado'}</p>
            <p><strong>Notas:</strong> {item.notes ?? 'Sin notas'}</p>
          </div>
          {item.status==='SCHEDULED'?<AppointmentForm id={item.id} initialDate={new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(item.scheduledFor).replace(' ','T')}/>:null}
          <AppointmentOutcome id={item.id} status={item.status}/>
        </div>
      </div>
      <Footer />
    </>
  )
}
