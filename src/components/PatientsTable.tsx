"use client"
import React from 'react'

type Person = { firstName: string, lastName: string }
type Patient = { id: string, mrn?: string, person: Person }

export default function PatientsTable({ patients }: { patients: Patient[] }){
  return (
    <table className="table">
      <thead>
        <tr><th>Nombre</th><th>MRN</th><th>Acciones</th></tr>
      </thead>
      <tbody>
        {patients.map(p => (
          <tr key={p.id}>
            <td>{p.person.firstName} {p.person.lastName}</td>
            <td>{p.mrn ?? '—'}</td>
            <td><a href={`/patients/${p.id}`}>Ver</a></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
