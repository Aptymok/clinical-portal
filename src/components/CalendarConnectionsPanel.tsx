"use client"

import { useEffect, useState } from 'react'

type Health = {
  sources: Array<{
    id: string
    name: string
    providerType: string
    enabled: boolean
    readAuthority: boolean
    writeAuthority: boolean
    lastSyncAt?: string | null
    realtimeBookingCheck: boolean
    webhookEnabled: boolean
    connection: Record<string, unknown>
  }>
  pendingPropagationJobs: number
  openAlerts: number
  endpoints: Record<string, string>
}

export default function CalendarConnectionsPanel() {
  const [health, setHealth] = useState<Health | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [alerts, setAlerts] = useState<Array<{id:string;type:string;severity:string;message:string;createdAt:string}>>([])

  async function refresh() {
    try {
      const [response, alertResponse] = await Promise.all([
        fetch('/api/calendar/status', { cache: 'no-store' }),
        fetch('/api/calendar/alerts', { cache: 'no-store' })
      ])
      if (!response.ok || !alertResponse.ok) throw new Error('No fue posible comprobar las conexiones. Revisa tu sesión o vuelve a intentar.')
      setHealth(await response.json())
      const result = await alertResponse.json()
      setAlerts(result.items || [])
    } catch (error) {
      setHealth(null)
      setMessage(error instanceof Error ? error.message : 'No se pudo consultar el estado.')
    }
  }

  useEffect(() => { void refresh() }, [])

  async function post(path: string) {
    setBusy(true)
    setMessage('Procesando…')
    try {
      const response = await fetch(path, { method: 'POST' })
      if (!response.ok) throw new Error('No se completó la conexión. Comprueba su configuración y autorización.')
      setMessage('Respuesta recibida. Comprueba el estado y la última sincronización antes de utilizar esta fuente.')
      await refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo completar.')
    } finally { setBusy(false) }
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="card">
        <h2>Preparación</h2>
        <p>Primero registra las tres fuentes gobernadas. No activa credenciales inexistentes.</p>
        <button className="btn" disabled={busy} onClick={() => post('/api/calendar/bootstrap')}>Preparar fuentes</button>
      </div>

      <div className="card">
        <h2>Google Calendar</h2>
        <p>Inicia OAuth para acceder a Google Calendar. Confirma después que la sincronización inicial y las notificaciones funcionan.</p>
        <a href="/api/calendar/google/connect?sourceId=google-primary"><button className="btn">Conectar Google Calendar</button></a>
      </div>

      <div className="card">
        <h2>Doctoralia / Docplanner</h2>
        <p>Verifica las credenciales de Integrations API configuradas. La verificación no habilita automáticamente escritura externa.</p>
        <button className="btn" disabled={busy} onClick={() => post('/api/calendar/docplanner/connect')}>Verificar Doctoralia</button>
      </div>

      {message ? <p role="status">{message}</p> : null}

      <div className="card">
        <h2>Estado</h2>
        <p>Propagaciones pendientes: {health?.pendingPropagationJobs ?? '—'} · Alertas abiertas: {health?.openAlerts ?? '—'}</p>
        {(health?.sources || []).map((source) => (
          <div key={source.id} style={{ borderTop: '1px solid #e6e6e6', padding: '12px 0' }}>
            <strong>{source.name}</strong>
            <div>Lectura: {source.readAuthority ? 'autorizada' : 'pendiente'} · Escritura: {source.writeAuthority ? 'autorizada' : 'pendiente'}</div>
            <div>Última sincronización: {source.lastSyncAt ? new Date(source.lastSyncAt).toLocaleString('es-MX',{timeZone:'America/Mexico_City'}) : 'sin observar'}</div>
            <div>Notificaciones: {source.webhookEnabled ? 'habilitadas' : 'sin verificar'} · Bloqueo de doble reserva en tiempo real: {source.realtimeBookingCheck ? 'habilitado' : 'sin verificar'}</div>
          </div>
        ))}
      </div>
      <section className="card" aria-label="Alertas de calendario"><h2>Alertas de sincronización</h2>{alerts.length ? <ul>{alerts.map(a => <li key={a.id}><strong>{a.severity} · {a.type}</strong> — {a.message}</li>)}</ul> : <p>{health ? 'Sin alertas abiertas registradas. Esto no confirma que las fuentes estén sincronizadas.' : 'Alertas sin comprobar. No se ha podido confirmar el estado.'}</p>}</section>
    </div>
  )
}
