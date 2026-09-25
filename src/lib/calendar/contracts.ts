export type CalendarAuthority = 'READ' | 'WRITE'
export type ExternalEventStatus = 'SCHEDULED' | 'CANCELLED' | 'COMPLETED' | 'UNKNOWN'

export type CalendarSource = {
  id: string
  label: string
  sourceType: string
  timezone: string
  authority: CalendarAuthority[]
}

export type NormalizedCalendarEvent = {
  sourceId: string
  externalEventId: string
  correlationKey?: string | null
  canonicalEcho?: boolean
  providerRef: string
  startsAt: string
  endsAt: string
  timezone: string
  status: ExternalEventStatus
  summary?: string | null
  location?: string | null
  sourceUpdatedAt?: string | null
}

export type CalendarConflict =
  | {
      type: 'SOURCE_CONTRADICTION'
      field: 'startsAt' | 'endsAt' | 'status' | 'providerRef'
      sourceIds: string[]
      values: string[]
    }
  | {
      type: 'PROVIDER_COLLISION'
      sourceIds: string[]
      externalEventIds: string[]
      startsAt: string
      endsAt: string
    }

export type CanonicalCalendarEvent = {
  canonicalKey: string
  providerRef: string
  startsAt: string
  endsAt: string
  timezone: string
  status: ExternalEventStatus
  sourceLinks: Array<{
    sourceId: string
    externalEventId: string
    sourceUpdatedAt?: string | null
  }>
  conflicts: CalendarConflict[]
  reconciliationState: 'CONSISTENT' | 'CONFLICT'
}

export type CalendarReconciliationResult = {
  generatedAt: string
  events: CanonicalCalendarEvent[]
  unmergedEvents: NormalizedCalendarEvent[]
  conflicts: CalendarConflict[]
}
