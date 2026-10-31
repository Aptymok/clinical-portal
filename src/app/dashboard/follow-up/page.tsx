import { requireStaffPage } from '@/lib/staff-access'
import { prisma } from '@/lib/prisma'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ReminderForm from '@/components/ReminderForm'
import { formatDateTime } from '@/lib/format'
export const dynamic='force-dynamic'
export default async function FollowUp(){
 await requireStaffPage()
 const [patients,reminders]=await Promise.all([prisma.patient.findMany({include:{person:true},take:200,orderBy:{createdAt:'desc'}}),prisma.reminder.findMany({where:{sent:false},include:{patient:{include:{person:true}}},orderBy:{at:'asc'},take:100})])
 return <><Header/><main className="container page"><h1>Seguimiento de pacientes</h1><p>Registra recordatorios y consulta los pendientes. Quedan visibles en el portal de la cuenta vinculada al paciente. El envío por correo, SMS o WhatsApp requiere una conexión adicional y no se considera realizado.</p><section className="card"><h2>Nuevo recordatorio</h2><ReminderForm patients={patients.map(p=>({id:p.id,label:`${p.person.firstName} ${p.person.lastName}`}))}/></section><section className="card"><h2>Recordatorios sin envío externo confirmado</h2>{reminders.length?<ul>{reminders.map(r=><li key={r.id}><strong>{r.patient.person.firstName} {r.patient.person.lastName}</strong> · {formatDateTime(r.at)} · {r.message}</li>)}</ul>:<p>Sin pendientes registrados.</p>}</section></main><Footer/></>
}
