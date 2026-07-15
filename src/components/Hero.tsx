import Link from 'next/link'

export default function Hero(){
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-left">
          <h2 className="hero-title">Gestión clínica segura, confiable y centrada en la atención médica.</h2>
          <p className="hero-sub">Plataforma integral para administración clínica, expedientes, citas, consultas, documentos y seguimiento de pacientes cumpliendo con estándares de seguridad y privacidad.</p>
          <div className="hero-actions">
            <Link href="/login"><button className="btn">Acceder al sistema</button></Link>
            <Link href="#features"><button className="btn-ghost">Conocer funcionalidades</button></Link>
          </div>
        </div>
        <div style={{width:420,background:'#fff',padding:12,border:'1px solid #e6e6e6'}} aria-hidden>
          {/* Placeholder: realistic dashboard composition */}
          <div style={{height:200,background:'#f5f7fa',display:'flex',flexDirection:'column',gap:8,padding:12}}>
            <div style={{height:28,width:'60%',background:'#e9eef7'}}></div>
            <div style={{flex:1,display:'flex',gap:8}}>
              <div style={{flex:1,background:'#fff',border:'1px solid #e6e6e6'}}></div>
              <div style={{flex:1,background:'#fff',border:'1px solid #e6e6e6'}}></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
