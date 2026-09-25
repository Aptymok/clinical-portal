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
    connection: Record<string, unknown>
  }>
  pendingPropagationJobs: number
  openAlerts: number
  endpoints: Record<string, string>
}

export default function CalendarConnectionsPanel() {
  const [health, setHealth] = useState<Health | null>(null)
  const [message, setMessage] = useState('')

  async function refresh() {
    const response = await fetch('/api/calendar/status', { cache: 'no-store' })
    if (response.ok) setHealth(await response.json())
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
        <p>Autoriza lectura/escritura y crea el canal de notificaciones push.</p>
        <a href="/api/calendar/google/connect?sourceId=google-primary"><button className="btn">Conectar Google Calendar</button></a>
      </div>

      <div className="card">
        <h2>Doctoralia / Docplanner</h2>
        <p>Verifica las credenciales de Integrations API configuradas en el entorno y activa la fuente.</p>
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
            <div>Última sincronización: {source.lastSyncAt || 'sin observar'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
