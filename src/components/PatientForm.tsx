'use client'
import {useState,type FormEvent} from 'react'
import {useRouter} from 'next/navigation'
export default function PatientForm(){
 const router=useRouter(),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);setBusy(true)
  try{const response=await fetch('/api/patients',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mrn:String(form.get('mrn')||'')||undefined,person:{firstName:String(form.get('firstName')).trim(),lastName:String(form.get('lastName')).trim()}})});if(!response.ok)throw new Error();const result=await response.json();router.push('/patients/'+result.data.id);router.refresh()}catch{setMessage('No se pudo registrar al paciente. Revisa los datos y que el número de expediente no esté duplicado.')}finally{setBusy(false)}
 }
 return <form className="clinic-form" onSubmit={submit}><h3>Registrar paciente</h3><label htmlFor="patient-first">Nombre</label><input id="patient-first" name="firstName" required maxLength={100}/><label htmlFor="patient-last">Apellidos</label><input id="patient-last" name="lastName" required maxLength={150}/><label htmlFor="patient-mrn">Número de expediente, si ya existe</label><input id="patient-mrn" name="mrn" maxLength={100}/><p>El registro no crea credenciales ni vincula una cuenta personal automáticamente.</p><button className="btn" disabled={busy}>{busy?'Guardando…':'Registrar paciente'}</button>{message?<p role="status">{message}</p>:null}</form>
}
