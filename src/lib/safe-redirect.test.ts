import { expect, it } from 'vitest'
import { safeCallback } from './safe-redirect'
it('permite sólo destinos profesionales locales y rechaza variantes de redirección externa', () => {
  expect(safeCallback('/dashboard/discovery')).toBe('/dashboard/discovery')
  for (const value of ['https://evil.test', '//evil.test', '/\\evil.test', '/%5cevil.test', '/login', '/dashboard-evil']) expect(safeCallback(value)).toBe('/dashboard')
})
