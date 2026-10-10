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
  const [alerts, setAlerts] = useState<Array<{id:string;type:string;severity:string;message:string;createdAt:string}>>([])

  async function refresh() {
    const response = await fetch('/api/calendar/status', { cache: 'no-store' })
    if (response.ok) setHealth(await response.json())
    const alertResponse = await fetch('/api/calendar/alerts', { cache: 'no-store' })
    if (alertResponse.ok) { const result = await alertResponse.json(); setAlerts(result.items || []) }
  }

  useEffect(() => { void refresh() }, [])

  async function post(path: string) {
    setMessage('Procesando…')
    const response = await fetch(path, { method: 'POST' })
    const body = await response.json().catch(() => ({}))
    setMessage(response.ok ? 'Operación completada.' : String(body.error || 'No se pudo completar.'))
    await refresh()
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="card">
        <h2>Preparación</h2>
        <p>Primero registra las tres fuentes gobernadas. No activa credenciales inexistentes.</p>
        <button className="btn" onClick={() => post('/api/calendar/bootstrap')}>Preparar fuentes</button>
      </div>

      <div className="card">
        <h2>Google Calendar</h2>
        <p>Inicia OAuth para acceder a Google Calendar. Confirma después que la sincronización inicial y las notificaciones funcionan.</p>
        <a href="/api/calendar/google/connect?sourceId=google-primary"><button className="btn">Conectar Google Calendar</button></a>
      </div>

      <div className="card">
        <h2>Doctoralia / Docplanner</h2>
        <p>Verifica las credenciales de Integrations API configuradas. La verificación no habilita automáticamente escritura externa.</p>
        <button className="btn" onClick={() => post('/api/calendar/docplanner/connect')}>Verificar Doctoralia</button>
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
      <section className="card" aria-label="Alertas de calendario"><h2>Alertas de sincronización</h2>{alerts.length ? <ul>{alerts.map(a => <li key={a.id}><strong>{a.severity} · {a.type}</strong> — {a.message}</li>)}</ul> : <p>Sin alertas abiertas registradas. Esto no confirma que las fuentes estén sincronizadas.</p>}</section>
    </div>
  )
}
