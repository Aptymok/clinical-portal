export const publicPhysician = {
  slug: 'dr-jesus-guillermo-espinoza-contreras',
  name: 'Dr. Jesús Guillermo Espinoza Contreras',
  specialties: ['Alergología', 'Inmunología clínica'],
  description:
    'Consulta médica especializada con seguimiento clínico longitudinal, educación del paciente y continuidad de atención.',
} as const

export function canonicalSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
}
