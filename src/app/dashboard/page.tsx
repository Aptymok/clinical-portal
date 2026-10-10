import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
 const now = new Date()
 const todayStart = new Date(now); todayStart.setHours(0,0,0,0)
 const tomorrow = new Date(todayStart); tomorrow.setDate(tomorrow.getDate()+1)
 const nextWeek = new Date(now); nextWeek.setDate(nextWeek.getDate()+7)
 const [todayAppointments, upcoming, pendingCount, patientsCount] = await Promise.all([
  prisma.appointment.findMany({where:{scheduledFor:{gte:todayStart,lt:tomorrow},status:'SCHEDULED'},include:{patient:{include:{person:true}}},orderBy:{scheduledFor:'asc'}}),
  prisma.appointment.findMany({where:{scheduledFor:{gte:now,lte:nextWeek},status:'SCHEDULED'},include:{patient:{include:{person:true}}},orderBy:{scheduledFor:'asc'},take:12}),
  prisma.appointment.count({where:{status:'SCHEDULED',scheduledFor:{gte:now}}}),
  prisma.patient.count()
 ])
 const time=(date:Date)=>new Intl.DateTimeFormat('es-MX',{timeZone:'America/Mexico_City',weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(date)
 return <><Header/><main className="container page">
 <p className="eyebrow">INMUNOCLINIC · ÁREA PROFESIONAL</p>
 <h1>Agenda clínica</h1><p>Consulta las citas registradas en el portal. Las citas de fuentes externas sólo aparecerán cuando su sincronización esté autorizada y verificada.</p>
 <div className="stats-grid">
 <div className="card stat-card"><p className="eyebrow">Citas de hoy</p><h2>{todayAppointments.length}</h2></div>
 <div className="card stat-card"><p className="eyebrow">Próximas citas registradas</p><h2>{pendingCount}</h2></div>
 <div className="card stat-card"><p className="eyebrow">Pacientes registrados</p><h2>{patientsCount}</h2></div>
 </div>
 <section className="card" style={{marginTop:24}}>
 <h2>Agenda de hoy</h2>
 {todayAppointments.length?<ul>{todayAppointments.map(a=><li key={a.id}>{time(a.scheduledFor)} · {a.patient.person.firstName} {a.patient.person.lastName} · {a.reason||'Consulta programada'}</li>)}</ul>:<p>No hay citas registradas para hoy en el portal. Esto no confirma disponibilidad en calendarios externos.</p>}
 </section>
 <section className="card" style={{marginTop:20}}><h2>Próximos siete días</h2>
 {upcoming.length?<ul>{upcoming.map(a=><li key={a.id}>{time(a.scheduledFor)} · {a.patient.person.firstName} {a.patient.person.lastName}</li>)}</ul>:<p>No hay próximas citas registradas en el portal.</p>}
 </section>
 <section className="card" style={{marginTop:20}}><h2>Herramientas clínicas</h2><div style={{display:'flex',flexWrap:'wrap',gap:16}}>
 <Link href="/appointments">Administrar citas →</Link><Link href="/patients">Pacientes →</Link><Link href="/dashboard/calendar-integrations">Calendarios conectados →</Link><Link href="/encounters">Consultas →</Link>
 </div></section>
 <p style={{marginTop:20}}>Sincronización externa: pendiente de verificación. No se presentan citas externas como consolidadas.</p>
 </main><Footer/></>
}