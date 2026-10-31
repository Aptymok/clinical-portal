'use client'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { identityFields } from '@/lib/discovery/review'
export default function DiscoveryReviewForm() {
  const router = useRouter()
  const [busy,setBusy] = useState(false)
  const [message,setMessage] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form))
    setBusy(true);setMessage('')
    try {
      const response = await fetch('/api/discovery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(values)})
      if (!response.ok) throw new Error('No se guardó la observación. Comprueba tu sesión, el enlace HTTPS y los campos; vuelve a intentar.')
      setMessage('Observación guardada. No se envió ninguna solicitud a la plataforma externa.')
      form.reset();router.refresh()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo guardar.') }
    finally { setBusy(false) }
  }
  return <form onSubmit={submit} className="clinic-form"><h2>Registrar una revisión</h2><p>Copia únicamente información pública del consultorio. No incluyas datos de pacientes.</p><label htmlFor="source-url">Enlace del perfil revisado</label><input id="source-url" name="sourceUrl" type="url" required maxLength={1500} placeholder="https://directorio.example/perfil"/><label htmlFor="identity-field">Dato revisado</label><select id="identity-field" name="field">{Object.entries(identityFields).map(([key,item])=><option key={key} value={key}>{item.label}</option>)}</select><label htmlFor="observed-value">Texto que aparece en esa fuente</label><textarea id="observed-value" name="observedValue" required maxLength={1000} rows={4}/><button type="submit" className="btn" disabled={busy}>{busy?'Guardando…':'Guardar y contrastar'}</button><p role="status">{message}</p></form>
}
