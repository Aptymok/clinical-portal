import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import { patientTimeline } from '@/lib/patient-portal'
import { formatDateTime, getStatusText } from '@/lib/format'
export const dynamic='force-dynamic'
export const metadata={title:'Mi seguimiento | Inmunoclinic',robots:{index:false,follow:false}}
export default async function Portal(){
 const session=await auth()
 if(!session?.user?.email)redirect('/login?callbackUrl=%2Fportal')
 const timeline=await patientTimeline(session.user.email)
 return <div className="public-site"><PublicHeader/><main className="container page"><p className="eyebrow">ACCESO PERSONAL</p><h1>Mi seguimiento</h1>{timeline?<><p>Hola, {timeline.person.firstName}. Consulta las citas y los recordatorios registrados por el consultorio.</p><section className="card"><h2>Mis citas</h2>{timeline.appointments.length?<ul>{timeline.appointments.map(a=><li key={a.id}>{formatDateTime(a.scheduledFor)} · {getStatusText(a.status)}</li>)}</ul>:<p>No hay citas recientes registradas.</p>}</section><section className="card"><h2>Recordatorios del consultorio</h2>{timeline.reminders.length?<ul>{timeline.reminders.map(r=><li key={r.id}>{formatDateTime(r.at)} · {r.message}</li>)}</ul>:<p>No hay recordatorios registrados.</p>}</section><p>Para solicitar cambios, contacta directamente al consultorio. Esta página no sustituye una consulta.</p></>:<p>Tu cuenta todavía no está vinculada a un expediente de paciente. Solicita la vinculación al consultorio; no se muestran expedientes de otras personas.</p>}<Link href="/login">Volver al acceso</Link></main><PublicFooter/></div>
}
