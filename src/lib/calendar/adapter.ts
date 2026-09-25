import type { CanonicalCalendarEvent, CalendarSource } from '@prisma/client'

export type CalendarWriteResult = {
  externalEventId?: string
  observedState?: unknown
}

export interface CalendarWriteAdapter {
  providerType: string

  upsertBusy(input: {
    source: CalendarSource
    event: CanonicalCalendarEvent
  }): Promise<CalendarWriteResult>

  cancelOrFree(input: {
    source: CalendarSource
    event: CanonicalCalendarEvent
  }): Promise<CalendarWriteResult>
}
