import AppointmentForm from '@/components/AppointmentForm'
import {calendarCoverage} from '@/lib/calendar/coverage'
import { requireStaffPage } from '@/lib/staff-access'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import AppointmentsTable from '@/components/AppointmentsTable'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function Appointments(){
  await requireStaffPage()
  const items = await prisma.appointment.findMany({
    include: {
      patient: { include: { person: true } },
      provider: { include: { person: true } }
    },
    orderBy: { scheduledFor: 'asc' }
  })

  const [patients,providers,sources]=await Promise.all([prisma.patient.findMany({include:{person:true},take:200}),prisma.provider.findMany({include:{person:true}}),prisma.calendarSource.findMany()])
  const ready=calendarCoverage(sources).verified && providers.some(p=>p.id===process.env.CALENDAR_INTERNAL_PROVIDER_ID)
  return (
    <>
      <Header />
      <div className="container page">
        <h2>Citas</h2>
        <div className="card">
          <AppointmentsTable items={items} />
          <AppointmentForm ready={ready} patients={patients.map(p=>({id:p.id,label:p.person.firstName+' '+p.person.lastName}))} providers={providers.filter(p=>p.id===process.env.CALENDAR_INTERNAL_PROVIDER_ID).map(p=>({id:p.id,label:p.person.firstName+' '+p.person.lastName}))}/>
        </div>
      </div>
      <Footer />
    </>
  )
}
