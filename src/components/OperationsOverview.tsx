import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireStaffPage } from '@/lib/staff-access'
export default async function OperationsOverview() {
  await requireStaffPage()
  const since = new Date(Date.now()-30*86400000)
  const [jobs, syncs, reviews, completed, missed, cancelled, recent, maintenance] = await Promise.all([
    prisma.calendarPropagationJob.groupBy({by:['state'],_count:true}),
    prisma.calendarSyncEvent.groupBy({by:['state'],_count:true}),
    prisma.domainEvent.count({where:{type:'DISCOVERY_OBSERVATION_V1'}}),
    prisma.appointment.count({where:{scheduledFor:{gte:since,lte:new Date()},status:'COMPLETED'}}),
    prisma.appointment.count({where:{scheduledFor:{gte:since,lte:new Date()},status:'NO_SHOW'}}),
    prisma.appointment.count({where:{scheduledFor:{gte:since,lte:new Date()},status:'CANCELLED'}}),
    prisma.auditLog.findMany({orderBy:{createdAt:'desc'},take:8,select:{id:true,createdAt:true,action:true,resource:true,status:true}}),
    prisma.domainEvent.findFirst({where:{type:'CALENDAR_MAINTENANCE_RETURN_V1'},orderBy:{createdAt:'desc'}})
  ])
  const count = (state:string)=>jobs.find(item=>item.state===state)?._count || 0
  const failed = syncs.find(item=>item.state==='FAILED')?._count || 0
  const receipt = maintenance?.payload as {status?:string} | undefined
  const maintenanceLabel = receipt?.status === 'COMPLETED' ? 'Ciclo de mantenimiento completado' : receipt?.status === 'PARTIAL' ? 'Ciclo con fallos o pendientes' : 'Sin operación de fuentes comprobada'
  const labels: Record<string,string> = {CREATE:'Registro creado',UPDATE:'Registro actualizado',CANCEL:'Cita cancelada',AUTH_LOGIN_SUCCESS:'Acceso autorizado',AUTH_LOGIN_FAILURE:'Intento de acceso rechazado'}
  return <section className="operations-overview"><div className="clinic-grid"><article className="card"><p className="eyebrow">01 · SUPERVISIÓN</p><h2>Lo que requiere atención</h2><p className="clinic-badge">{maintenance ? maintenanceLabel + ' · ' + maintenance.createdAt.toLocaleString('es-MX',{timeZone:'America/Mexico_City'}) : 'Sin comprobante de mantenimiento registrado'}</p><div className="clinic-metrics"><div><strong>{count('PENDING')+count('SENT')}</strong><span>Envíos pendientes de cierre</span></div><div><strong>{count('FAILED')+failed}</strong><span>Fallos registrados de sincronización o envío</span></div><div><strong>{count('SKIPPED')}</strong><span>Envíos omitidos por condiciones de seguridad</span></div></div><p>Son registros de los conectores de calendario; no prueban que exista un agente autónomo trabajando. Un envío confirmado tampoco acredita por sí solo una cita atendida.</p><Link href="/dashboard/calendar-integrations">Revisar conexiones y alertas →</Link></article><article className="card"><p className="eyebrow">02 · PRESENCIA DIGITAL</p><h2>Información oficial y contraste</h2><p>{reviews} revisiones registradas por el equipo. Compara dirección, teléfono, nombre y horarios con la ficha oficial.</p><Link href="/dashboard/discovery" className="btn-ghost">Abrir Discovery Mesh →</Link><p>Las correcciones externas se comprueban en la fuente. No se han automatizado denuncias ni retiros.</p></article></div><section className="card" style={{marginTop:20}}><p className="eyebrow">03 · ATENCIÓN REAL</p><h2>Resultados registrados · últimos 30 días</h2><div className="clinic-metrics"><div><strong>{completed}</strong><span>Citas completadas</span></div><div><strong>{missed}</strong><span>Inasistencias registradas</span></div><div><strong>{cancelled}</strong><span>Citas canceladas</span></div></div><p>Se cuentan los estados de citas internas, no visitas al sitio. El origen de los contactos y su conversión a consulta todavía no están instrumentados.</p></section><details className="card" style={{marginTop:20}}><summary>Actividad reciente registrada</summary>{recent.length?<ul className="clinic-activity">{recent.map(item=><li key={item.id}><span>{labels[item.action]||'Operación registrada'} · {item.status==='REJECTED'?'Rechazada':item.status==='SUCCESS'?'Realizada':'Resultado sin clasificar'}</span><time dateTime={item.createdAt.toISOString()}>{item.createdAt.toLocaleString('es-MX',{timeZone:'America/Mexico_City'})}</time></li>)}</ul>:<p>No hay actividad registrada. Esto no certifica una operación sin errores.</p>}</details></section>
}
