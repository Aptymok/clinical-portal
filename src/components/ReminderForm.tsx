'use client'
import { useState, type FormEvent } from 'react'
export default function ReminderForm({patients}:{patients:Array<{id:string;label:string}>}){
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false)
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setMessage('');const form=new FormData(event.currentTarget)
  try{const response=await fetch('/api/reminders',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({patientId:form.get('patientId'),message:form.get('message'),at:new Date(String(form.get('at'))+'-06:00').toISOString()})});if(!response.ok)throw new Error();setMessage('Recordatorio guardado en el portal. No se envió un mensaje externo.');window.location.reload()}catch{setMessage('No se pudo guardar el recordatorio. Revisa los datos e inténtalo de nuevo.')}finally{setBusy(false)}
 }
 return <form onSubmit={submit} className="public-login-form"><label htmlFor="reminder-patient">Paciente</label><select id="reminder-patient" name="patientId" required><option value="">Selecciona un paciente</option>{patients.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select><label htmlFor="reminder-at">Fecha y hora de Aguascalientes</label><input id="reminder-at" name="at" type="datetime-local" required/><label htmlFor="reminder-message">Mensaje visible para el paciente en su portal</label><textarea id="reminder-message" name="message" maxLength={500} required/><button className="btn" disabled={busy||!patients.length}>{busy?'Guardando…':'Guardar recordatorio'}</button>{message?<p role="status">{message}</p>:null}</form>
}
