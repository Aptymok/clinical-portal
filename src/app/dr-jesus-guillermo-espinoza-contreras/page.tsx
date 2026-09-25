import type { Metadata } from 'next'
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
  }

  return (
    <main className="container page" style={{ maxWidth: 880 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <p className="eyebrow">Perfil médico público canónico</p>
      <h1>{publicPhysician.name}</h1>
      <p>{publicPhysician.specialties.join(' · ')}</p>
      <p>{publicPhysician.description}</p>

      <section className="card" style={{ marginTop: 24 }}>
        <h2>Formación</h2>
        <ul>
          {publicPhysician.education.map((item) => (
            <li key={`${item.institution}-${item.program}`}>
              <strong>{item.program}</strong> — {item.institution}
            </li>
          ))}
        </ul>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Credenciales profesionales</h2>
        <ul>
          {publicPhysician.credentials.map((credential) => (
            <li key={credential.value}>
              {credential.label}: {credential.value}
            </li>
          ))}
        </ul>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Atención clínica</h2>
        <p>Enfoque: {publicPhysician.focus}.</p>
        <p>Pacientes: {publicPhysician.patients.join(' y ')}.</p>
        <p>Idiomas: {publicPhysician.languages.join(' e ')}.</p>
        <p>
          Principales áreas reportadas: {publicPhysician.conditions.join(', ')}.
        </p>
        <p>
          Servicios públicos consistentes: {publicPhysician.services.join(', ')}.
        </p>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Consultorio</h2>
        <p>{publicPhysician.clinicName}</p>
        <p>
          {publicPhysician.address.streetAddress}, {publicPhysician.address.addressLocality},{' '}
          {publicPhysician.address.addressRegion}, C.P. {publicPhysician.address.postalCode}.
        </p>
        <p>Teléfono: {publicPhysician.telephone}</p>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Actividad académica</h2>
        <p>
          Publicación identificada:{' '}
          <a href={publicPhysician.publication.url} rel="noopener noreferrer">
            {publicPhysician.publication.title}
          </a>
        </p>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Fuentes profesionales relacionadas</h2>
        <ul>
          {publicPhysician.externalProfiles.map((url) => (
            <li key={url}>
              <a href={url} rel="me noopener noreferrer">
                {url}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Agenda</h2>
        <p>
          La disponibilidad se publica únicamente desde fuentes de calendario autorizadas y
          reconciliadas. No se infieren horarios a partir de directorios externos.
        </p>
      </section>
    </main>
  )
}
