import { describe, expect, it } from 'vitest'
import { normalizeDocplannerNotification } from './docplanner'

describe('normalizeDocplannerNotification', () => {
  it('treats slot-booking as a real-time availability request', () => {
    const result = normalizeDocplannerNotification('doctoralia', {
      name: 'slot-booking',
      data: {
        visit_booking_request: {
          start_at: '2026-10-03T10:00:00-06:00',
          end_at: '2026-10-03T10:30:00-06:00'
        }
      }
    })

    expect(result.kind).toBe('availability')
    if (result.kind === 'availability') {
      expect(result.startsAt).toBe('2026-10-03T10:00:00-06:00')
    }
  })

  it('marks Clinical Portal managed breaks as canonical echoes', () => {
    const result = normalizeDocplannerNotification('doctoralia', {
      name: 'break-created',
      created_at: '2026-09-24T20:00:00-06:00',
      data: {
        break: {
          id: '567',
          since: '2026-10-03T10:00:00-06:00',
          till: '2026-10-03T10:30:00-06:00',
          description: 'Clinical Portal|google:event-123'
        }
      }
    })

    expect(result.kind).toBe('event')
    if (result.kind === 'event') {
      expect(result.event.canonicalEcho).toBe(true)
      expect(result.event.correlationKey).toBe('google:event-123')
    }
  })
})
