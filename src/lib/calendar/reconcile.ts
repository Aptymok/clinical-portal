import type {
  CalendarConflict,
  CalendarReconciliationResult,
  CanonicalCalendarEvent,
  NormalizedCalendarEvent
} from './contracts'

function unique(values: string[]) {
  return Array.from(new Set(values))
}

function overlaps(a: CanonicalCalendarEvent, b: CanonicalCalendarEvent) {
  return new Date(a.startsAt).getTime() < new Date(b.endsAt).getTime() &&
    new Date(b.startsAt).getTime() < new Date(a.endsAt).getTime()
}

export function reconcileCalendarEvents(
  input: NormalizedCalendarEvent[],
  now = new Date()
): CalendarReconciliationResult {
  const correlated = new Map<string, NormalizedCalendarEvent[]>()
  const unmergedEvents: NormalizedCalendarEvent[] = []

  for (const event of input) {
    if (!event.correlationKey) {
      unmergedEvents.push(event)
      continue
    }

    const key = event.correlationKey.trim()
    const group = correlated.get(key) ?? []
    group.push(event)
    correlated.set(key, group)
  }

  const events: CanonicalCalendarEvent[] = []
  const conflicts: CalendarConflict[] = []

  for (const [canonicalKey, group] of Array.from(correlated.entries())) {
    const baseline = group
      .slice()
      .sort((a, b) => (b.sourceUpdatedAt ?? '').localeCompare(a.sourceUpdatedAt ?? ''))[0]

    const groupConflicts: CalendarConflict[] = []

    for (const field of ['providerRef', 'startsAt', 'endsAt', 'status'] as const) {
      const values = unique(group.map((event) => String(event[field])))
      if (values.length > 1) {
        const conflict: CalendarConflict = {
          type: 'SOURCE_CONTRADICTION',
          field,
          sourceIds: unique(group.map((event) => event.sourceId)),
          values
        }
        groupConflicts.push(conflict)
        conflicts.push(conflict)
      }
    }

    events.push({
      canonicalKey,
      providerRef: baseline.providerRef,
      startsAt: baseline.startsAt,
      endsAt: baseline.endsAt,
      timezone: baseline.timezone,
      status: baseline.status,
      sourceLinks: group.map((event) => ({
        sourceId: event.sourceId,
        externalEventId: event.externalEventId,
        sourceUpdatedAt: event.sourceUpdatedAt
      })),
      conflicts: groupConflicts,
      reconciliationState: groupConflicts.length ? 'CONFLICT' : 'CONSISTENT'
    })
  }

  for (let i = 0; i < events.length; i += 1) {
    for (let j = i + 1; j < events.length; j += 1) {
      const a = events[i]
      const b = events[j]
      if (a.providerRef !== b.providerRef || !overlaps(a, b)) continue

      const collision: CalendarConflict = {
        type: 'PROVIDER_COLLISION',
        sourceIds: unique([...a.sourceLinks, ...b.sourceLinks].map((link) => link.sourceId)),
        externalEventIds: [...a.sourceLinks, ...b.sourceLinks].map((link) => link.externalEventId),
        startsAt: a.startsAt < b.startsAt ? b.startsAt : a.startsAt,
        endsAt: a.endsAt < b.endsAt ? a.endsAt : b.endsAt
      }

      a.conflicts.push(collision)
      b.conflicts.push(collision)
      a.reconciliationState = 'CONFLICT'
      b.reconciliationState = 'CONFLICT'
      conflicts.push(collision)
    }
  }

  return {
    generatedAt: now.toISOString(),
    events,
    unmergedEvents,
    conflicts
  }
}
