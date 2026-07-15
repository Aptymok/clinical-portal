import Header from '@/components/Header'
import Footer from '@/components/Footer'
import PatientsTable from '@/components/PatientsTable'

export default async function Patients(){
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/patients`, { cache: 'no-store' })
  const body = await res.json()
  const patients = body?.success ? body.data : []

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
