import Header from '@/components/Header'
import Footer from '@/components/Footer'
import EncountersTable from '@/components/EncountersTable'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function Encounters(){
  const items = await prisma.encounter.findMany({
    include: {
      patient: { include: { person: true } },
      provider: { include: { person: true } }
    },
    orderBy: { startedAt: 'desc' }
  })

  return (
    <>
      <Header />
      <div className="container page">
        <h2>Consultas</h2>
        <div className="card">
          <EncountersTable items={items} />
        </div>
      </div>
      <Footer />
    </>
  )
}
