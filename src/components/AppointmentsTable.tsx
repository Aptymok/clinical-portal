"use client"
import React from 'react'

type Appointment = { id: string, scheduledFor: string | Date, patient: { person: { firstName: string, lastName: string } } }

export default function AppointmentsTable({ items }: { items: Appointment[] }){
  return (
    <table className="table">
      <thead><tr><th>Paciente</th><th>Fecha</th><th>Acciones</th></tr></thead>
      <tbody>
        {items.map(a => (
          <tr key={a.id}>
            <td>{a.patient?.person?.firstName} {a.patient?.person?.lastName}</td>
            <td>{new Date(a.scheduledFor).toLocaleString()}</td>
            <td><a href={`/appointments/${a.id}`}>Ver</a></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
