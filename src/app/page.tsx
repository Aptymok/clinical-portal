import Link from 'next/link'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import { publicPhysician } from '@/config/public-physician'

type IconName = 'pin' | 'school' | 'medical' | 'clock' | 'shield' | 'lungs' | 'drop' | 'file' | 'people'

function Icon({ name }: { name: IconName }) {
  const common = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'square' as const, strokeLinejoin: 'miter' as const }
  if (name === 'pin') return <svg {...common}><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"/><path d="M12 8.2v3.6M10.2 10h3.6"/></svg>
  if (name === 'school') return <svg {...common}><path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M6 11.5V17h12v-5.5M9 14v3m6-3v3"/></svg>
  if (name === 'medical') return <svg {...common}><path d="M6 3v6a6 6 0 0 0 12 0V3M9 3v3m6-3v3M12 15v6"/><path d="M12 21h4"/></svg>
  if (name === 'clock') return <svg {...common}><path d="M12 3v9l5 3"/><path d="M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0"/></svg>
  if (name === 'shield') return <svg {...common}><path d="M12 3 5 6v5c0 4.8 3 8.2 7 10 4-1.8 7-5.2 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-5"/></svg>
  if (name === 'lungs') return <svg {...common}><path d="M12 4v8M10 9c-2-4-4-4-5-1-1 3-2 8 1 10 2 1 4-1 4-4V9Zm4 0c2-4 4-4 5-1 1 3 2 8-1 10-2 1-4-1-4-4V9Z"/></svg>
  if (name === 'drop') return <svg {...common}><path d="M12 3s6 7 6 12a6 6 0 1 1-12 0c0-5 6-12 6-12Z"/></svg>
  if (name === 'file') return <svg {...common}><path d="M6 3h8l4 4v14H6V3Z"/><path d="M14 3v5h5M9 12h6M9 16h6"/></svg>
  return <svg {...common}><path d="M8 12a4 4 0 1 0 0-8 4 4 0 1 0 0 8Zm8 0a4 4 0 1 0 0-8"/><path d="M2 21v-3c0-3 2-5 6-5s6 2 6 5v3m1-8c4 0 7 2 7 5v3"/></svg>
}

const serviceItems = [
  { icon: 'lungs' as IconName, title: 'Rinitis alérgica y asma', text: 'Valoración, diagnóstico y seguimiento de enfermedades alérgicas respiratorias.' },
  { icon: 'drop' as IconName, title: 'Pruebas de alergia', text: 'Pruebas cutáneas y evaluación dirigida según la historia clínica.' },
  { icon: 'shield' as IconName, title: 'Inmunología clínica', text: 'Evaluación de inmunodeficiencias, autoinmunidad y alteraciones del sistema inmune.' },
  { icon: 'medical' as IconName, title: 'Medicina interna', text: 'Integración clínica de la persona adulta y sus condiciones concomitantes.' },
  { icon: 'file' as IconName, title: 'Seguimiento', text: 'Continuidad del tratamiento, revisión de respuesta y ajustes clínicos documentados.' },
]

export default function Page() {
  return (
    <div className="public-site">
      <PublicHeader />

      <main>
        <section className="public-hero" id="sobre">
          <div className="public-shell public-hero-grid">
            <div className="public-hero-copy">
              <div className="public-kicker">ALERGOLOGÍA · INMUNOLOGÍA CLÍNICA · MEDICINA INTERNA</div>
              <h1 className="public-h1">Dr. Jesús Guillermo<br />Espinoza Contreras</h1>

              <div className="public-hierarchy">
                <div className="public-hierarchy-row public-site-name">
                  <span className="public-line-icon"><Icon name="medical" /></span>
                  <span className="public-antique">INMUNOCLINIC</span>
                  <span className="public-hierarchy-muted">Star Médica Aguascalientes</span>
                </div>
                <div className="public-hierarchy-row">
                  <span className="public-line-icon"><Icon name="pin" /></span>
                  <span>Av. Universidad 103 · Consultorio 117 · Primer piso · Aguascalientes</span>
                </div>
                <div className="public-hierarchy-row">
                  <span className="public-line-icon"><Icon name="school" /></span>
                  <span>UACH · UNAM · UNAM · UAA</span>
                </div>
                <div className="public-hierarchy-row">
                  <span className="public-line-icon"><Icon name="medical" /></span>
                  <span>Alergología · Inmunología clínica · Medicina interna</span>
                </div>
              </div>

              <div className="public-accent-rule" />
              <h2 className="public-human-title">Atención integral y humana</h2>
              <p className="public-lead">
                Con enfoque en personas adultas y adultas mayores. La valoración integra alergología,
                inmunología clínica y medicina interna para mantener continuidad, claridad y contexto clínico.
              </p>

              <div className="public-actions">
                <a href="#contacto" className="public-cta">Agendar cita <span>→</span></a>
                <a href="#servicios" className="public-secondary-cta">Conocer servicios <span>→</span></a>
              </div>
            </div>

            <aside className="public-glass public-schedule" aria-label="Horario de consulta">
              <div className="public-section-label"><Icon name="clock" /> CONSULTA DEL DR. GUILLERMO</div>
              <div className="public-hours">
                <div><strong>Martes</strong><span>11:00–14:00</span><span>16:00–19:00</span></div>
                <div><strong>Jueves</strong><span>11:00–14:00</span><span>16:00–19:00</span></div>
                <div><strong>Sábado</strong><span>Al mediodía</span><span>Confirmar hora</span></div>
              </div>
              <div className="public-soft-panel">
                <strong>Consultorio con operación toda la semana</strong>
                <span>Recolección de medicamento, vacunas y agenda de citas.</span>
              </div>
              <div className="public-schedule-contact">
                <span className="public-phone-number">449 996 6500</span>
                <a href="#contacto">Agendar cita →</a>
              </div>
            </aside>
          </div>
        </section>

        <section className="public-principles">
          <div className="public-shell public-principles-grid">
            <div><span>01</span><strong>Precisión</strong><small>Diagnóstico fundamentado</small></div>
            <div><span>02</span><strong>Confianza</strong><small>Información clara y verificable</small></div>
            <div><span>03</span><strong>Orden clínico</strong><small>Seguimiento y continuidad</small></div>
            <div><span>04</span><strong>Atención adulta</strong><small>Adultos y adultos mayores</small></div>
          </div>
        </section>

        <section className="public-section" id="especialidades">
          <div className="public-shell public-two-column">
            <div className="public-section-intro">
              <div className="public-section-kicker">ESPECIALIDADES</div>
              <h2>Alergología, inmunología clínica y medicina interna.</h2>
              <p>
                Tres disciplinas que permiten observar síntomas, respuesta inmune, antecedentes y
                condiciones concomitantes sin fragmentar la valoración de la persona adulta.
              </p>
            </div>
            <div className="public-specialty-grid">
              <div className="public-glass public-specialty"><Icon name="lungs" /><strong>Alergología</strong><span>Enfermedades alérgicas respiratorias, cutáneas y otras reacciones de hipersensibilidad.</span></div>
              <div className="public-glass public-specialty"><Icon name="shield" /><strong>Inmunología clínica</strong><span>Evaluación del funcionamiento del sistema inmune y sus alteraciones.</span></div>
              <div className="public-glass public-specialty"><Icon name="medical" /><strong>Medicina interna</strong><span>Contexto integral de la salud de la persona adulta y adulta mayor.</span></div>
            </div>
          </div>
        </section>

        <section className="public-section public-section-muted" id="servicios">
          <div className="public-shell">
            <div className="public-section-heading">
              <div>
                <div className="public-section-kicker">SERVICIOS</div>
                <h2>Atención ordenada alrededor del problema clínico.</h2>
              </div>
              <Link href="/dr-jesus-guillermo-espinoza-contreras" className="public-text-link">Ver perfil profesional completo →</Link>
            </div>
            <div className="public-service-grid">
              {serviceItems.map((item, index) => (
                <article className="public-service-card" key={item.title}>
                  <div className="public-service-index">0{index + 1}</div>
                  <Icon name={item.icon} />
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="public-section" id="vacunas">
          <div className="public-shell public-adult-grid">
            <div className="public-adult-callout">
              <div className="public-section-kicker">ATENCIÓN ADULTA</div>
              <h2 className="public-antique public-display-serif">Cuidado con contexto, no por fragmentos.</h2>
            </div>
            <div className="public-adult-copy">
              <p>
                En personas adultas y adultas mayores, la medicina interna aporta contexto para interpretar
                alergias, respuesta inmune, tratamientos concomitantes y evolución general. Cuando una
                necesidad corresponde a otra especialidad, la atención se coordina o refiere según corresponda.
              </p>
              <div className="public-mini-rule" />
              <h3>Vacunas e inmunoterapia</h3>
              <p>
                El consultorio mantiene operación durante la semana para vacunas y recolección de medicamento.
                La indicación clínica y el esquema se determinan de forma individual.
              </p>
            </div>
          </div>
        </section>

        <section className="public-section public-section-muted" id="ubicacion">
          <div className="public-shell public-academic-grid">
            <div>
              <div className="public-section-kicker">ACADEMIA Y FORMACIÓN</div>
              <h2>Formación médica con continuidad académica.</h2>
            </div>
            <div className="public-academic-list">
              {publicPhysician.education.map((item) => (
                <div key={`${item.institution}-${item.program}`}>
                  <strong>{item.institution.replace('Universidad Nacional Autónoma de México', 'UNAM').replace('Universidad Autónoma de Chihuahua', 'UACH').replace('Universidad Autónoma de Aguascalientes', 'UAA')}</strong>
                  <span>{item.program}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="public-contact" id="contacto">
          <div className="public-shell public-contact-grid">
            <div>
              <div className="public-section-kicker">CONTACTO</div>
              <h2>Agenda y ubicación.</h2>
              <p>Inmunoclinic · Star Médica Aguascalientes</p>
              <p>Av. Universidad 103 · Consultorio 117 · Primer piso · C.P. 20029</p>
            </div>
            <div className="public-contact-actions">
              <a className="public-contact-phone" href="tel:+524499966500">449 996 6500</a>
              <p>Martes y jueves · 11:00–14:00 y 16:00–19:00<br />Sábado · al mediodía, confirmar hora.</p>
              <a className="public-cta" href="tel:+524499966500">Llamar para agendar <span>→</span></a>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
