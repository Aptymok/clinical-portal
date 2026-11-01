import { calendarCoverage, MAX_OBSERVATION_AGE_MS } from '@/lib/calendar/coverage'
import CalendarSlotGrid from '@/components/CalendarSlotGrid'
import type { CalendarDisplayEvent } from '@/lib/calendar/slot-view'
import { requireStaffPage } from '@/lib/staff-access'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
const tz = 'America/Mexico_City'
const fmt = new Intl.DateTimeFormat('es-MX',{timeZone:tz,weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})
const dayFmt = new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'})
const SLOT_MINUTES = 30

export default async function MasterCalendar() {
  await requireStaffPage()
  const now = new Date()
  const start = new Date(dayFmt.format(now)+'T00:00:00-06:00')
  const end = new Date(start.getTime()+14*86400000)
  const providerId = process.env.CALENDAR_INTERNAL_PROVIDER_ID || '__unconfigured__'
  const providerRef = process.env.CALENDAR_PROVIDER_REF || 'dr-guillermo'
  const [local, canonical, sources, alerts, jobs, disputed, provider] = await Promise.all([
    prisma.appointment.findMany({where:{providerId,scheduledFor:{gte:new Date(+start-30*60000),lt:end},status:'SCHEDULED'},include:{patient:{include:{person:true}}},orderBy:{scheduledFor:'asc'},take:501}),
    prisma.canonicalCalendarEvent.findMany({where:{providerRef,startsAt:{lt:end},endsAt:{gt:start},status:{not:'CANCELLED'}},orderBy:{startsAt:'asc'},include:{externalEvents:{select:{sourceId:true,externalEventId:true}}},take:501}),
    prisma.calendarSource.findMany({select:{enabled:true,id:true,name:true,providerType:true,readAuthority:true,writeAuthority:true,lastSyncAt:true,webhookEnabled:true,realtimeBookingCheck:true,config:true},orderBy:{id:'asc'}}),
    prisma.calendarAlert.findMany({where:{status:'OPEN'},orderBy:{createdAt:'desc'},take:12}),
    prisma.calendarPropagationJob.count({where:{state:{in:['PENDING','FAILED','SENT','SKIPPED']}}}),
    prisma.calendarExternalEvent.findMany({where:{providerRef,startsAt:{lt:end},endsAt:{gt:start},status:{not:'CANCELLED'},canonicalEvent:{conflict:true}},select:{id:true,startsAt:true,endsAt:true,sourceId:true},take:501}),
    prisma.provider.findUnique({where:{id:providerId},select:{id:true}})
  ])
  const localKeys = new Set(local.map(appointment=>`appointment:${appointment.id}`))
  const external = canonical.filter(event=>!localKeys.has(event.canonicalKey))
  const coverage = calendarCoverage(sources).verified
  const truncated = [local,canonical,disputed].some(items=>items.length>500)
  const verifiedUntil = coverage && provider && !truncated ? Math.min(...sources.filter(s=>s.providerType!=='CLINICAL_PORTAL').map(s=>Math.min(+s.lastSyncAt+MAX_OBSERVATION_AGE_MS,s.providerType==='GOOGLE_CALENDAR'?Number((s.config as {watchExpiration?:string})?.watchExpiration||0):Infinity))) : 0
  const sourceNames = new Map(sources.map(source=>[source.id,source.name]))
  const displayEvents: CalendarDisplayEvent[] = [
    ...local.map(a=>({id:'local-'+a.id,startsAt:a.scheduledFor.toISOString(),endsAt:new Date(+a.scheduledFor+SLOT_MINUTES*60000).toISOString(),title:[a.patient.person.firstName,a.patient.person.lastName].join(' '),source:'Portal interno',conflict:false,href:'/appointments/'+a.id})),
    ...external.map(e=>({id:'external-'+e.id,startsAt:e.startsAt.toISOString(),endsAt:e.endsAt.toISOString(),title:'Ocupación externa',source:e.externalEvents.map(item=>sourceNames.get(item.sourceId)||item.sourceId).join(', ')||'Fuente externa',conflict:e.conflict})),
    ...disputed.map(e=>({id:'disputed-'+e.id,startsAt:e.startsAt.toISOString(),endsAt:e.endsAt.toISOString(),title:'Ocupación con discrepancia',source:sourceNames.get(e.sourceId)||e.sourceId,conflict:true}))
  ]
  const rows = [
    ...local.map(a=>({id:'local-'+a.id,date:a.scheduledFor,kind:'Cita clínica',name:[a.patient.person.firstName,a.patient.person.lastName].join(' '),source:'Portal interno',conflict:false,detail:a.reason||'Consulta',href:'/appointments/'+a.id})),
    ...external.map(e=>({id:'ext-'+e.id,date:e.startsAt,kind:e.status==='TENTATIVE'?'Tentativo':'Ocupación externa',name:'Reservado',source:e.externalEvents.map(l=>l.sourceId).join(', ')||e.sourceOfTruthId||'Fuente por determinar',conflict:e.conflict,detail:'No se muestran datos de pacientes externos',href:null as string|null}))
  ].sort((a,b)=>a.date.getTime()-b.date.getTime())
  const groups = new Map<string,typeof rows>()
  for(const row of rows){const key=dayFmt.format(row.date);groups.set(key,[...(groups.get(key)||[]),row])}
  return <><Header/><main className="container page master-calendar">
    <p className="eyebrow">INMUNOCLINIC · HUB CLÍNICO</p>
    <div className="master-heading"><div><h1>Agenda maestra</h1><p>Vista conjunta de citas internas y ocupaciones recibidas de calendarios externos · próximos 14 días · hora de Aguascalientes.</p></div><Link href="/dashboard/calendar-integrations" className="btn">Gestionar conexiones →</Link></div>
    <section className={'master-readiness '+(coverage?'master-readiness-ready':'master-readiness-warning')} aria-live="polite">
      <strong>{coverage?'Fuentes con sincronización inicial registrada':'No se puede garantizar disponibilidad'}</strong>
      <p>{coverage?'Cada fuente activa reporta lectura y una sincronización observada. Comprueba vigencia y alertas antes de confirmar reservas.':'Una o más fuentes no tienen lectura, sincronización inicial o canal requerido. Los espacios libres de esta pantalla NO son horarios disponibles.'}</p>
    </section>
    <div className="master-stats"><div><span>Citas internas</span><strong>{local.length}</strong></div><div><span>Ocupaciones externas</span><strong>{external.length}</strong></div><div><span>Conflictos detectados</span><strong>{external.filter(e=>e.conflict).length}</strong></div><div><span>Propagaciones sin cerrar</span><strong>{jobs}</strong></div></div>
    <CalendarSlotGrid startDate={dayFmt.format(start)} events={displayEvents} verifiedUntil={verifiedUntil} pending={jobs>0||truncated} observedAt={+now}/>
    <div className="master-columns">
      <div className="master-main"><h2>Calendario consolidado</h2>{rows.length?Array.from(groups.entries()).map(([key,entries])=><section className="master-day" key={key}><h3>{new Intl.DateTimeFormat('es-MX',{timeZone:tz,weekday:'long',day:'numeric',month:'long'}).format(entries[0].date)}</h3><div className="master-events">{entries.map(item=><article key={item.id} className={'master-event '+(item.conflict?'master-conflict':'')}><time dateTime={item.date.toISOString()}>{fmt.format(item.date).split(', ').pop()}</time><div><strong>{item.kind} · {item.name}</strong><span>{item.source}</span><small>{item.conflict?'Conflicto: requiere resolución manual':item.detail}</small></div>{item.href?<Link href={item.href}>Ver cita →</Link>:null}</article>)}</div></section>):<div className="card"><h3>Sin eventos observados</h3><p>La ausencia de eventos no demuestra que exista disponibilidad. Valida las fuentes antes de agendar.</p></div>}</div>
      <aside className="master-side"><section className="card"><h2>Fuentes</h2>{sources.length?sources.map(s=><div className="master-source" key={s.id}><strong>{s.name}</strong><span>{s.readAuthority?'Lectura habilitada':'Lectura pendiente'} · {s.writeAuthority?'Escritura habilitada':'Escritura pendiente'}</span><small>{s.lastSyncAt?'Última observación '+fmt.format(s.lastSyncAt):'Sin sincronización registrada'}</small></div>):<p>No hay calendarios configurados.</p>}<Link href="/dashboard/calendar-integrations">Ver detalles →</Link></section>
      <section className="card"><h2>Alertas abiertas ({alerts.length})</h2>{alerts.length?<ul>{alerts.map(a=><li key={a.id}><strong>{a.severity} · {a.type}</strong><p>{a.message}</p></li>)}</ul>:<p>Sin alertas registradas. Esto no confirma que todas las fuentes estén al día.</p>}</section>
      <section className="card"><h2>Operación segura</h2><p>Duración estimada de una consulta en el portal: {SLOT_MINUTES} minutos. La agenda consolidada es observacional: no crea ni cancela citas externas desde esta pantalla.</p><Link href="/appointments">Administrar citas internas →</Link></section>
      </aside></div>
  </main><Footer/></>
}
