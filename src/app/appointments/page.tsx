import Header from '@/components/Header'
import Footer from '@/components/Footer'
import AppointmentsTable from '@/components/AppointmentsTable'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function Appointments(){
  const items = await prisma.appointment.findMany({
    include: {
      patient: { include: { person: true } },
      provider: { include: { person: true } }
    },
    orderBy: { scheduledFor: 'asc' }
  })

  return (
    <>
      <Header />
      <div className="container page">
        <h2>Citas</h2>
        <div className="card">
          <AppointmentsTable items={items} />
        </div>
      </div>
      <Footer />
    </>
  )
}
