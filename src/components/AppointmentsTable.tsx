"use client"
import React from 'react'
import { formatDateTime, getStatusText } from '@/lib/format'

type Appointment = { id: string, status: string, scheduledFor: string | Date, patient: { person: { firstName: string, lastName: string } } }

export default function AppointmentsTable({ items }: { items: Appointment[] }){
  return (
    <table className="table">
      <thead><tr><th>Paciente</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>
        {items.map(a => (
          <tr key={a.id}>
            <td>{a.patient?.person?.firstName} {a.patient?.person?.lastName}</td>
            <td>{formatDateTime(a.scheduledFor)}</td>
            <td>{getStatusText(a.status)}</td>
            <td><a href={`/appointments/${a.id}`}>Ver</a></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
