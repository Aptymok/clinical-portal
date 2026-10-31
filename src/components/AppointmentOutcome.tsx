'use client'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
export default function AppointmentOutcome({id,status}:{id:string;status:string}) {
  const router=useRouter()
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const selected=String(new FormData(event.currentTarget).get('status'))
    setBusy(true);setMessage('')
    try {
      const response=await fetch('/api/appointments/'+encodeURIComponent(id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:selected})})
      if(!response.ok) throw new Error('No fue posible registrar el resultado. Comprueba tu sesión y vuelve a intentar.')
      setMessage('Resultado guardado en la cita interna. No se modificaron calendarios externos.');router.refresh()
    } catch(error) {setMessage(error instanceof Error?error.message:'No se pudo guardar.')}
    finally{setBusy(false)}
  }
  return <form onSubmit={submit} className="clinic-form"><h3>Registrar resultado de atención</h3><p>Actualiza sólo lo que el equipo haya confirmado. El resumen operativo se calcula con estos registros.</p><label htmlFor="appointment-outcome">Resultado confirmado</label><select id="appointment-outcome" name="status" defaultValue={status==='SCHEDULED'?'':status} required><option value="" disabled>Selecciona un resultado</option><option value="COMPLETED">Consulta completada</option><option value="NO_SHOW">No asistió</option><option value="CANCELLED">Cita cancelada</option></select><button className="btn" disabled={busy} type="submit">{busy?'Guardando…':'Guardar resultado'}</button><p role="status">{message}</p></form>
}
