'use client'
import { useState,type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
type Option={id:string;label:string}
export default function AppointmentForm({patients=[],providers=[],id,initialDate='',ready=true}:{patients?:Option[];providers?:Option[];id?:string;initialDate?:string;ready?:boolean}){
 const router=useRouter(),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);setBusy(true);setMessage('')
  try{
   const scheduledFor=new Date(String(form.get('scheduledFor'))+'-06:00').toISOString()
   const body=id?{scheduledFor}:{scheduledFor,patientId:form.get('patientId'),providerId:form.get('providerId'),reason:form.get('reason')}
   const response=await fetch('/api/appointments'+(id?'/'+encodeURIComponent(id):''),{method:id?'PATCH':'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
   const result=await response.json()
   if(!response.ok)throw new Error(response.status===409?'Ese horario ya está ocupado. Selecciona otro.':response.status===503?'No se puede confirmar disponibilidad: revisa conexiones, sincronización y profesional vinculado.':'No se pudo guardar la cita.')
   setMessage('Cita guardada. Los envíos externos quedan pendientes de verificación.');if(!id)router.push('/appointments/'+result.data.id);router.refresh()
  }catch(error){setMessage(error instanceof Error?error.message:'No se pudo guardar.')}finally{setBusy(false)}
 }
 return <form className="clinic-form" onSubmit={submit}><h3>{id?'Cambiar horario':'Nueva cita'}</h3><p>Hora de Aguascalientes · consulta de 30 minutos. Sólo se confirma el registro interno; la entrega a cada calendario se comprueba por separado.</p>{!ready?<p role="status">Antes de reservar, completa las conexiones de calendario y la vinculación del profesional.</p>:null}{!id?<><label htmlFor="appointment-patient">Paciente</label><select name="patientId" id="appointment-patient" required><option value="">Selecciona un paciente</option>{patients.map(p=><option value={p.id} key={p.id}>{p.label}</option>)}</select><label htmlFor="appointment-provider">Profesional</label><select name="providerId" id="appointment-provider" required><option value="">Selecciona un profesional</option>{providers.map(p=><option value={p.id} key={p.id}>{p.label}</option>)}</select><label htmlFor="appointment-reason">Motivo</label><input id="appointment-reason" name="reason" maxLength={500}/></>:null}<label htmlFor="appointment-date">Fecha y hora</label><input id="appointment-date" name="scheduledFor" type="datetime-local" defaultValue={initialDate} required/><button className="btn" disabled={busy||!ready}>{busy?'Guardando…':id?'Guardar nuevo horario':'Crear cita'}</button>{message?<p role="status">{message}</p>:null}</form>
}
