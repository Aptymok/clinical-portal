import { calendarCoverage } from '@/lib/calendar/coverage'
import OperationsOverview from '@/components/OperationsOverview'
import { requireStaffPage } from '@/lib/staff-access'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  await requireStaffPage()
 const now = new Date()
 const mexicoDate = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)
 const todayStart = new Date(mexicoDate+'T00:00:00-06:00')
 const tomorrow = new Date(todayStart.getTime()+24*60*60*1000)
 const nextWeek = new Date(now); nextWeek.setDate(nextWeek.getDate()+7)
 const [todayAppointments, upcoming, pendingCount, patientsCount, canonicalToday, canonicalUpcoming, calendarSources, openCalendarAlerts] = await Promise.all([
  prisma.appointment.findMany({where:{scheduledFor:{gte:todayStart,lt:tomorrow},status:'SCHEDULED'},include:{patient:{include:{person:true}}},orderBy:{scheduledFor:'asc'}}),
  prisma.appointment.findMany({where:{scheduledFor:{gte:now,lte:nextWeek},status:'SCHEDULED'},include:{patient:{include:{person:true}}},orderBy:{scheduledFor:'asc'},take:12}),
  prisma.appointment.count({where:{status:'SCHEDULED',scheduledFor:{gte:now}}}),
  prisma.patient.count(),
  prisma.canonicalCalendarEvent.findMany({where:{startsAt:{gte:todayStart,lt:tomorrow},status:{not:'CANCELLED'}},orderBy:{startsAt:'asc'},take:40}),
  prisma.canonicalCalendarEvent.findMany({where:{startsAt:{gte:now,lte:nextWeek},status:{not:'CANCELLED'}},orderBy:{startsAt:'asc'},take:80}),
  prisma.calendarSource.findMany({select:{enabled:true,id:true,name:true,readAuthority:true,lastSyncAt:true,providerType:true,webhookEnabled:true,config:true}}),
  prisma.calendarAlert.count({where:{status:'OPEN'}})
 ])
 const coverageReady=calendarCoverage(calendarSources).verified
 const time=(date:Date)=>new Intl.DateTimeFormat('es-MX',{timeZone:'America/Mexico_City',weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(date)
 return <><Header/><main className="container page">
 <p className="eyebrow">INMUNOCLINIC · ÁREA PROFESIONAL</p>
 <h1>Centro de operación</h1><p>Consulta las citas registradas en el portal. Las citas de fuentes externas sólo aparecerán cuando su sincronización esté autorizada y verificada.</p>
 <OperationsOverview/>
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
 <section className="card" style={{marginTop:20}}><h2>Calendario maestro · eventos consolidados</h2>
 <p>{coverageReady?'Fuentes registradas con lectura y observación inicial.':'Cobertura incompleta: no interpretar espacios vacíos como disponibilidad.'} · {calendarSources.length} fuentes habilitadas · {openCalendarAlerts} alertas abiertas.</p>
 <p><strong>Eventos ocupados hoy:</strong> {canonicalToday.length} · <strong>Próximos siete días:</strong> {canonicalUpcoming.length}</p>
 {canonicalUpcoming.length?<ul>{canonicalUpcoming.map(e=><li key={e.id}>{time(e.startsAt)} · {e.status==='TENTATIVE'?'Tentativo':'Ocupado'}{e.conflict?' · CONFLICTO':''} · Referencia {e.canonicalKey}</li>)}</ul>:<p>Sin eventos consolidados observados. Consulta también cada calendario de origen.</p>}
 <p><Link href="/dashboard/calendar-integrations">Revisar cobertura de fuentes y alertas →</Link></p>
 </section>
 <section className="card" style={{marginTop:20}}><h2>Herramientas clínicas</h2><div style={{display:'flex',flexWrap:'wrap',gap:16}}>
 <Link href="/dashboard/calendar">Abrir agenda maestra →</Link><Link href="/appointments">Administrar citas →</Link><Link href="/patients">Pacientes →</Link><Link href="/dashboard/calendar-integrations">Calendarios conectados →</Link><Link href="/encounters">Consultas →</Link>
 </div></section>
 <p style={{marginTop:20}}>Para comprobar el estado de sincronización, consulta <Link href="/dashboard/calendar-integrations">Integraciones de calendario</Link>. Una agenda vacía en el portal no confirma disponibilidad externa.</p>
 </main><Footer/></>
}