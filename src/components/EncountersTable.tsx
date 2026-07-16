"use client"
import React from 'react'

type Encounter = { id: string, startedAt: string | Date, patient: { person: { firstName: string, lastName: string } } }

export default function EncountersTable({ items }: { items: Encounter[] }){
  return (
    <table className="table">
      <thead><tr><th>Paciente</th><th>Inicio</th><th>Acciones</th></tr></thead>
      <tbody>
        {items.map(e => (
          <tr key={e.id}>
            <td>{e.patient?.person?.firstName} {e.patient?.person?.lastName}</td>
            <td>{new Date(e.startedAt).toLocaleString()}</td>
            <td><a href={`/encounters/${e.id}`}>Ver</a></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
