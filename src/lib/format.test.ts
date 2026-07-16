import { describe, expect, it } from 'vitest'
import { formatDateTime, getStatusText } from './format'

describe('format helpers', () => {
  it('formats dates in Spanish locale', () => {
    expect(formatDateTime('2026-07-16T14:30:00.000Z')).toContain('16')
    expect(formatDateTime('2026-07-16T14:30:00.000Z')).toContain('2026')
  })

  it('maps status values to readable labels', () => {
    expect(getStatusText('SCHEDULED')).toBe('Programada')
    expect(getStatusText('IN_PROGRESS')).toBe('En curso')
  })
})
