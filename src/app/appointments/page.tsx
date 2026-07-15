import Header from '@/components/Header'
import Footer from '@/components/Footer'
import AppointmentsTable from '@/components/AppointmentsTable'

export default async function Appointments(){
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/appointments`, { cache: 'no-store' })
  const body = await res.json()
  const items = body?.success ? body.data : []

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
