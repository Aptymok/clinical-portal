import { z } from 'zod'
import { publicPhysician } from '@/config/public-physician'

export const identityFields = {
  name: { label: 'Nombre del médico', value: publicPhysician.name },
  address: { label: 'Dirección', value: `${publicPhysician.address.streetAddress}, Aguascalientes, Aguascalientes, C.P. 20029, México` },
  telephone: { label: 'Teléfono principal', value: publicPhysician.telephone },
  schedule: { label: 'Horario de consulta', value: 'Martes y jueves: 11:00–14:00 y 16:00–19:00. Sábado: al mediodía, confirmar hora.' },
} as const
export type IdentityField = keyof typeof identityFields
export const ObservationSchema = z.object({
  sourceUrl: z.string().url().max(1500).refine(value => {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password
  }, 'Utiliza una URL pública HTTPS sin credenciales.'),
  field: z.enum(['name','address','telephone','schedule']),
  observedValue: z.string().trim().min(1).max(1000),
})
export type Observation = z.infer<typeof ObservationSchema>
function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
}
export function compareIdentity(field: IdentityField, observedValue: string) {
  const expected = identityFields[field].value
  const phone = (v: string) => v.replace(/\D/g, '').replace(/^52(?=\d{10}$)/, '')
  const match = field === 'telephone' ? phone(expected) === phone(observedValue) : normalize(expected) === normalize(observedValue)
  return { expected, status: match ? 'MATCH' as const : 'REVIEW' as const }
}
// Input is newest-first; the complete immutable history remains in DomainEvent.
export function latestObservations<T extends {sourceUrl:string;field:string}>(rows: T[]): T[] {
  const seen = new Set<string>()
  return rows.filter(row => {
    const key = row.sourceUrl + '\n' + row.field
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
