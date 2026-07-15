export default function Footer(){
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <strong>Sistema</strong>
          <div>Inicio</div>
          <div>Pacientes</div>
        </div>
        <div>
          <strong>Legal</strong>
          <div>Aviso legal</div>
        </div>
        <div>
          <strong>Seguridad</strong>
          <div>Políticas</div>
        </div>
        <div>
          <strong>Contacto</strong>
          <div>soporte@clinicaportal.local</div>
        </div>
      </div>
      <div style={{paddingTop:12,textAlign:'center'}}>Portal Clínico © 2026</div>
    </footer>
  )
}
