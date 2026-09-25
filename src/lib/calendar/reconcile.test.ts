import { describe, expect, it } from 'vitest'
import { reconcileCalendarEvents } from './reconcile'
import type { NormalizedCalendarEvent } from './contracts'

const base: NormalizedCalendarEvent = {
  sourceId: 'calendar-a',
  externalEventId: 'a-1',
  correlationKey: 'appointment-001',
  providerRef: 'doctor-1',
  startsAt: '2026-10-01T10:00:00-06:00',
  endsAt: '2026-10-01T10:30:00-06:00',
  timezone: 'America/Mexico_City',
  status: 'SCHEDULED'
}

describe('reconcileCalendarEvents', () => {
  it('merges explicitly correlated sources without losing provenance', () => {
    const result = reconcileCalendarEvents([
      base,
      { ...base, sourceId: 'calendar-b', externalEventId: 'b-8' }
    ], new Date('2026-09-24T00:00:00Z'))

    expect(result.events).toHaveLength(1)
    expect(result.events[0].sourceLinks).toHaveLength(2)
    expect(result.events[0].reconciliationState).toBe('CONSISTENT')
  })

  it('surfaces contradictory source times instead of silently overwriting them', () => {
    const result = reconcileCalendarEvents([
      base,
      {
        ...base,
        sourceId: 'calendar-c',
        externalEventId: 'c-3',
        startsAt: '2026-10-01T10:30:00-06:00',
        endsAt: '2026-10-01T11:00:00-06:00'
      }
    ])

    expect(result.events[0].reconciliationState).toBe('CONFLICT')
    expect(result.conflicts.some((conflict) =>
      conflict.type === 'SOURCE_CONTRADICTION' && conflict.field === 'startsAt'
    )).toBe(true)
  })

  it('does not merge events lacking an explicit correlation key', () => {
    const result = reconcileCalendarEvents([
      { ...base, correlationKey: null }
    ])

    expect(result.events).toHaveLength(0)
    expect(result.unmergedEvents).toHaveLength(1)
  })
})
