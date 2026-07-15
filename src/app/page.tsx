import Header from '@/components/Header'
import Hero from '@/components/Hero'
import Footer from '@/components/Footer'

export default function Page(){
  return (
    <>
      <Header />
      <main>
        <Hero />
        <div className="container">
          <section id="features" style={{paddingTop:24}}>
            <div className="caps">
              {['Seguridad y privacidad','Control de acceso','Historia clínica electrónica','Agenda médica','Gestión documental','Reportes e indicadores'].map((t)=> (
                <div key={t} className="cap-card">
                  <div style={{height:36,background:'#e9eef7'}} />
                  <h4>{t}</h4>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
