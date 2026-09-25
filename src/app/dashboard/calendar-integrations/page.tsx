import Header from '@/components/Header'
import Footer from '@/components/Footer'
import CalendarConnectionsPanel from '@/components/CalendarConnectionsPanel'

export default function CalendarIntegrationsPage() {
  return (
    <>
      <Header />
      <main className="container page" style={{ maxWidth: 900 }}>
        <h1>Integraciones de calendario</h1>
        <p>
          Esta superficie conecta fuentes autorizadas con el calendario maestro. Una capacidad
          sólo aparece como autorizada después de observar credenciales válidas o completar OAuth.
        </p>
        <CalendarConnectionsPanel />
      </main>
      <Footer />
    </>
  )
}
