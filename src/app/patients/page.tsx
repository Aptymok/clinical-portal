import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default async function Patients(){
  // minimal: fetch list from API when available
  return (
    <>
      <Header />
      <div className="container page">
        <h2>Pacientes</h2>
        <div className="card">
          <table>
            <thead><tr><th>Nombre</th><th>MRN</th><th>Acciones</th></tr></thead>
            <tbody>
              <tr><td>—</td><td>—</td><td>—</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <Footer />
    </>
  )
}
