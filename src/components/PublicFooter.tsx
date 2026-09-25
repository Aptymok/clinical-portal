import Link from 'next/link'

export default function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-shell public-footer-grid">
        <div>
          <div className="public-footer-brand">INMUNOCLINIC</div>
          <p>Alergología · Inmunología clínica · Medicina interna</p>
        </div>
        <div>
          <strong>Consultorio</strong>
          <p>Star Médica Aguascalientes<br />Av. Universidad 103 · Consultorio 117 · Primer piso</p>
        </div>
        <div>
          <strong>Contacto</strong>
          <p><a href="tel:+524499966500">449 996 6500</a></p>
          <p><Link href="/login">Portal clínico</Link></p>
        </div>
      </div>
      <div className="public-shell public-footer-bottom">
        <span>© 2026 Inmunoclinic</span>
        <span>Información médica pública · Datos clínicos sólo en superficies privadas</span>
      </div>
    </footer>
  )
}
