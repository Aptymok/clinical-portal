import Link from 'next/link'
import { publicBrandLogo } from '@/config/public-brand'

export default function PublicHeader() {
  return (
    <header className="public-header">
      <div className="public-shell public-header-inner">
        <Link href="/" className="public-brand-link" aria-label="Inmunoclinic — Inicio">
          <img
            src={publicBrandLogo}
            alt="Dr. Jesús Guillermo Espinoza Contreras — Inmunoclinic"
            className="public-brand-logo"
          />
        </Link>

        <nav className="public-nav" aria-label="Navegación pública">
          <Link href="/#sobre">Sobre el Dr.</Link>
          <Link href="/#especialidades">Especialidades</Link>
          <Link href="/#servicios">Servicios</Link>
          <Link href="/#vacunas">Vacunas</Link>
          <Link href="/#ubicacion">Ubicación</Link>
        </nav>

        <div className="public-header-actions">
          <a className="public-phone-link" href="tel:+524499966500">449 996 6500</a>
          <Link className="public-cta public-cta-small" href="/#contacto">Agendar cita</Link>
        </div>
      </div>
    </header>
  )
}
