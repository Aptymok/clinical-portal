import Header from '@/components/Header'
import Footer from '@/components/Footer'
import EncountersTable from '@/components/EncountersTable'

export default async function Encounters(){
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/encounters`, { cache: 'no-store' })
  const body = await res.json()
  const items = body?.success ? body.data : []

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
