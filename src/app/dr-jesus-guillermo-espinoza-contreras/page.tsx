import type { Metadata } from 'next'
import { canonicalSiteUrl, publicPhysician } from '@/config/public-physician'

const siteUrl = canonicalSiteUrl()
const canonicalUrl = `${siteUrl}/${publicPhysician.slug}`

export const metadata: Metadata = {
  title: `${publicPhysician.name} | Alergología e Inmunología Clínica`,
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
    name: publicPhysician.name,
    url: canonicalUrl,
    description: publicPhysician.description,
    medicalSpecialty: publicPhysician.specialties
  }

  return (
    <main className="container page" style={{ maxWidth: 880 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <p className="eyebrow">Perfil médico público</p>
      <h1>{publicPhysician.name}</h1>
      <p>{publicPhysician.specialties.join(' · ')}</p>
      <p>{publicPhysician.description}</p>

      <section className="card" style={{ marginTop: 24 }}>
        <h2>Seguimiento clínico</h2>
        <p>
          El portal organiza citas, consultas y seguimiento del paciente. La información clínica
          permanece en superficies privadas y no forma parte del perfil público ni de la indexación.
        </p>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Agenda</h2>
        <p>
          La disponibilidad pública se incorporará cuando las fuentes de calendario autorizadas
          estén conectadas y reconciliadas. No se publican horarios inferidos.
        </p>
      </section>
    </main>
  )
}
