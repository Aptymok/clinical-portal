# Calendar Master Runtime — Operational Contract

Updated: 2026-09-24

## Human behavior

The Clinical Portal is the canonical availability authority.

When any connected source reports that a time range is booked, moved, cancelled or blocked:

1. the source event is received with an idempotency key;
2. the event is persisted without losing its source identity;
3. the master calendar checks whether the doctor is already busy;
4. the canonical event is created/updated;
5. a conflict alert is created if another independent event already occupies the interval;
6. propagation jobs are queued for every other enabled source with write authority;
7. external adapters apply the canonical busy/free state;
8. the external result must be re-observed before the propagation is considered confirmed.

No conflicting appointment is silently cancelled.

## Saturday example

Doctoralia reports Saturday 10:00–10:30 as booked.

Expected result:
- canonical master: BUSY;
- Doctoralia external record: linked as source;
- Google target: UPSERT_BUSY queued;
- third calendar target: UPSERT_BUSY queued;
- public availability: Saturday 10:00–10:30 is no longer available.

If another platform submits a different booking for the same interval before receiving the update:
- the second event is preserved;
- both facts remain observable;
- the master marks a conflict;
- a CRITICAL calendar alert is persisted;
- the system does not arbitrarily cancel either patient.

## Real-time prevention

A connected marketplace may call the canonical availability gate before final booking.

- HTTP 204: slot is available.
- HTTP 409: slot is already occupied.

This is designed to support provider-specific real-time booking callbacks.

## Runtime endpoints

- POST /api/calendar/intake
  - normalized, idempotent event intake;
  - requires CALENDAR_SYNC_SECRET;
  - persists canonical state and fan-out jobs.

- POST /api/calendar/availability
  - canonical availability gate;
  - requires CALENDAR_SYNC_SECRET;
  - 204 available / 409 occupied.

- GET /api/calendar/alerts
  - staff-authenticated open conflict alerts.

## Persistence

- CalendarSource: source identity and read/write authority.
- CanonicalCalendarEvent: master availability state.
- CalendarExternalEvent: external source copy/provenance.
- CalendarSyncEvent: received/reconciled event.
- CalendarPropagationJob: target update queue.
- CalendarAlert: operational conflict requiring attention.

## External adapters

The core is provider-independent. Each real platform still needs an adapter with verified credentials/scopes.

For Doctoralia/Docplanner, the public integrations documentation describes:
- push and pull notifications;
- slot-booked, booking-canceled and booking-moved notifications;
- optional real-time slot-booking validation;
- API operations to update bookings, breaks and availability.

Google Calendar supports push notifications for event changes via watch channels.

Those provider capabilities make near-real-time synchronization technically feasible, but no provider is marked connected until credentials, identifiers and observed RETURNS exist.
