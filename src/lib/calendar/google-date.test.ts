import { expect, it } from 'vitest'
import { googleDateValue } from './google-date'
it('uses the calendar timezone for all-day midnight',()=>expect(googleDateValue({date:'2030-01-01'},'America/Mexico_City')).toBe('2030-01-01T06:00:00.000Z'))
it('respects daylight saving where applicable',()=>expect(googleDateValue({date:'2030-07-01'},'America/New_York')).toBe('2030-07-01T04:00:00.000Z'))
it('preserves explicit event instants',()=>expect(googleDateValue({dateTime:'2030-01-01T16:00:00Z'},'America/Mexico_City')).toBe('2030-01-01T16:00:00Z'))
