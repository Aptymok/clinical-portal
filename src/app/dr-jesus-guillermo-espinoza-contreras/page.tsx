import type { Metadata } from 'next'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import { canonicalSiteUrl, publicPhysician } from '@/config/public-physician'

const siteUrl = canonicalSiteUrl()
const canonicalUrl = `${siteUrl}/${publicPhysician.slug}`

export const metadata: Metadata = {
  title: `${publicPhysician.name} | Alergología, Inmunología Clínica y Medicina Interna`,
  description: publicPhysician.description,
  alternates: { canonical: canonicalUrl },
  robots: { index: true, follow: true },
  openGraph: {
    title: publicPhysician.name,
    description: publicPhysician.description,
    url: canonicalUrl,
    type: 'profile'
  }
}

export default function PhysicianPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Physician',
    '@id': `${canonicalUrl}#physician`,
    name: publicPhysician.name,
    url: canonicalUrl,
    description: publicPhysician.description,
    medicalSpecialty: publicPhysician.specialties,
    telephone: publicPhysician.telephone,
    address: {
      '@type': 'PostalAddress',
      ...publicPhysician.address,
    },
    knowsLanguage: publicPhysician.languages,
    sameAs: publicPhysician.externalProfiles,
    identifier: publicPhysician.credentials.map((credential) => ({
      '@type': 'PropertyValue',
      name: credential.label,
      value: credential.value,
    })),
    alumniOf: publicPhysician.education.map((item) => ({
      '@type': 'EducationalOrganization',
      name: item.institution,
    })),
    areaServed: {
      '@type': 'City',
      name: 'Aguascalientes',
    },
    openingHoursSpecification: publicPhysician.physicianConsultationSchedule.exact.map((slot) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${slot.day}`,
      opens: slot.opens,
      closes: slot.closes,
    })),
  }

  return (
    <div className="public-site">
      <PublicHeader />
      <main className="public-profile-page">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />

        <section className="public-profile-hero">
          <div className="public-shell">
            <div className="public-section-kicker">PERFIL MÉDICO PÚBLICO CANÓNICO</div>
            <h1 className="public-profile-h1">{publicPhysician.name}</h1>
            <div className="public-profile-specialties">
              {publicPhysician.specialties.join(' · ')}
            </div>
            <p className="public-profile-summary">{publicPhysician.description}</p>
          </div>
        </section>

        <section className="public-profile-body">
          <div className="public-shell public-profile-grid">
            <div className="public-profile-main">
              <section className="public-profile-block">
                <div className="public-section-kicker">FORMACIÓN</div>
                <div className="public-profile-rows">
                  {publicPhysician.education.map((item) => (
                    <div className="public-profile-row" key={`${item.institution}-${item.program}`}>
                      <strong>{item.program}</strong>
                      <span>{item.institution}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="public-profile-block">
                <div className="public-section-kicker">CREDENCIALES PROFESIONALES</div>
                <div className="public-profile-rows">
                  {publicPhysician.credentials.map((credential) => (
                    <div className="public-profile-row" key={credential.value}>
                      <strong>{credential.label}</strong>
                      <span>{credential.value}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="public-profile-block">
                <div className="public-section-kicker">ATENCIÓN CLÍNICA</div>
                <div className="public-profile-copy">
                  <p><strong>Enfoque:</strong> {publicPhysician.focus}.</p>
                  <p><strong>Pacientes:</strong> personas adultas y adultas mayores dentro del alcance de sus especialidades.</p>
                  <p><strong>Idiomas:</strong> {publicPhysician.languages.join(' e ')}.</p>
                  <p><strong>Áreas reportadas:</strong> {publicPhysician.conditions.join(', ')}.</p>
                  <p><strong>Servicios públicos consistentes:</strong> {publicPhysician.services.join(', ')}.</p>
                </div>
              </section>

              <section className="public-profile-block">
                <div className="public-section-kicker">ACTIVIDAD ACADÉMICA</div>
                <div className="public-profile-copy">
                  <p>
                    Publicación identificada:{' '}
                    <a href={publicPhysician.publication.url} rel="noopener noreferrer">
                      {publicPhysician.publication.title}
                    </a>
                  </p>
                </div>
              </section>
            </div>

            <aside className="public-profile-aside">
              <div className="public-glass public-profile-factbox">
                <div className="public-section-kicker">CONSULTORIO</div>
                <h2>{publicPhysician.clinicName}</h2>
                <p>{publicPhysician.locationName}</p>
                <p>
                  {publicPhysician.address.streetAddress}<br />
                  {publicPhysician.address.addressLocality}, {publicPhysician.address.addressRegion}<br />
                  C.P. {publicPhysician.address.postalCode}
                </p>
                <a className="public-profile-phone" href="tel:+524499966500">449 996 6500</a>
              </div>

              <div className="public-profile-factbox public-profile-factbox-plain">
                <div className="public-section-kicker">CONSULTA DEL DR. GUILLERMO</div>
                <div className="public-profile-hours">
                  <div><strong>Martes</strong><span>11:00–14:00 · 16:00–19:00</span></div>
                  <div><strong>Jueves</strong><span>11:00–14:00 · 16:00–19:00</span></div>
                  <div><strong>Sábado</strong><span>Al mediodía · confirmar hora</span></div>
                </div>
                <p className="public-profile-note">
                  El consultorio opera durante toda la semana para recolección de medicamento,
                  vacunas y agenda de citas. Ese horario no equivale a disponibilidad de consulta médica.
                </p>
              </div>

              <div className="public-profile-factbox public-profile-factbox-plain">
                <div className="public-section-kicker">FUENTES PROFESIONALES</div>
                <div className="public-profile-links">
                  {publicPhysician.externalProfiles.map((url) => (
                    <a key={url} href={url} rel="me noopener noreferrer">
                      Ver perfil externo →
                    </a>
                  ))}
                </div>
              </div>

              <a className="public-cta public-profile-cta" href="tel:+524499966500">Agendar cita <span>→</span></a>
            </aside>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}
