import { describe, expect, it } from 'vitest'
import { compareIdentity, ObservationSchema, latestObservations } from './review'

describe('revisión de identidad pública', () => {
  it('distingue normalización tipográfica de una dirección diferente', () => {
    expect(compareIdentity('name', 'Dr. Jesus Guillermo Espinoza Contreras').status).toBe('MATCH')
    expect(compareIdentity('address', 'Avenida Universidad 101, planta baja C-9').status).toBe('REVIEW')
  })
  it('no marca un teléfono distinto como canónico', () => {
    expect(compareIdentity('telephone', '449 996 6500').status).toBe('MATCH')
    expect(compareIdentity('telephone', '4493880419').status).toBe('REVIEW')
  })
  it('requiere valor y fuente pública sin credenciales', () => {
    expect(ObservationSchema.safeParse({sourceUrl:'https://example.com/perfil',field:'name',observedValue:''}).success).toBe(false)
    expect(ObservationSchema.safeParse({sourceUrl:'https://user:pass@example.com',field:'name',observedValue:'Guillermo'}).success).toBe(false)
    expect(ObservationSchema.safeParse({sourceUrl:'javascript:alert(1)',field:'name',observedValue:'Guillermo'}).success).toBe(false)
  })
  it('conserva la última observación por URL y campo sin ocultar otras fuentes', () => {
    const rows = [
      {sourceUrl:'https://example.com',field:'name',observedValue:'A'},
      {sourceUrl:'https://example.com',field:'name',observedValue:'B'},
      {sourceUrl:'https://other.com',field:'name',observedValue:'C'}
    ]
    expect(latestObservations(rows).map(r=>r.observedValue)).toEqual(['A','C'])
  })
})
