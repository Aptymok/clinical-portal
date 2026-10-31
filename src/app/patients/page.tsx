import { requireStaffPage } from '@/lib/staff-access'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import PatientsTable from '@/components/PatientsTable'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function Patients(){
  await requireStaffPage()
  const patients = await prisma.patient.findMany({
    include: { person: true },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <>
      <Header />
      <div className="container page">
        <h2>Pacientes</h2>
        <div className="card">
          <PatientsTable patients={patients} />
        </div>
      </div>
      <Footer />
    </>
  )
}
