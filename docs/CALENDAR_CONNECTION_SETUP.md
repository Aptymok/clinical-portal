# Calendar Connections — Activation Runbook

Updated: 2026-09-24

## What is already built

Clinical Portal now contains:
- canonical master calendar persistence;
- conflict detection and alerts;
- immediate propagation queue;
- Google Calendar OAuth + encrypted refresh-token storage;
- Google incremental sync + push notification watch;
- Google writeback for busy/free state;
- Doctoralia/Docplanner client-credentials authentication;
- Doctoralia real-time slot availability callback;
- Doctoralia booking/break notification ingestion;
- Doctoralia writeback using managed calendar breaks;
- generic third-calendar inbound/outbound webhook contract;
- retry/recovery maintenance endpoint and scheduled GitHub Action;
- staff UI at /dashboard/calendar-integrations.

No provider is marked connected merely because code exists. Connection is demonstrated only after authority and external RETURN are observed.

## One-time database step

Apply committed migrations to the production database:

npm run prisma:migrate:deploy

This creates the calendar sync tables and encrypted provider secret table.

## Environment values

Required common values:
- NEXT_PUBLIC_SITE_URL = the public HTTPS Clinical Portal origin.
- ENCRYPTION_KEY = 64 hexadecimal characters (32 bytes).
- CALENDAR_SYNC_SECRET = long random secret.
- CALENDAR_PROVIDER_REF = stable identifier for Dr. Guillermo.

### Google Calendar

Create a Google Cloud project or use an authorized existing project:
1. Enable Google Calendar API.
2. Configure Google OAuth consent.
3. Create OAuth 2.0 Web Application credentials.
4. Register this exact authorized redirect URI:
   {NEXT_PUBLIC_SITE_URL}/api/calendar/google/callback
5. Configure:
   - GOOGLE_CLIENT_ID
   - GOOGLE_CLIENT_SECRET
   - GOOGLE_CALENDAR_ID (default: primary)

Then, while logged into Clinical Portal as authorized staff:
1. Open /dashboard/calendar-integrations.
2. Click "Preparar fuentes".
3. Click "Conectar Google Calendar".
4. Approve Google Calendar access.
5. The callback stores the refresh token encrypted, performs initial sync and creates a Google Events watch channel.

Expected RETURN:
- source google-primary readAuthority=true;
- writeAuthority=true;
- encrypted provider secret exists;
- watchActive=true;
- initial lastSyncAt observed.

## Doctoralia / Docplanner

Docplanner Integrations API requires credentials issued through its integration process. Configure:
- DOCPLANNER_DOMAIN=doctoralia.mx
- DOCPLANNER_CLIENT_ID
- DOCPLANNER_CLIENT_SECRET
- DOCPLANNER_FACILITY_ID
- DOCPLANNER_DOCTOR_ID
- DOCPLANNER_ADDRESS_ID
- DOCPLANNER_WEBHOOK_SECRET

Callback to register with Docplanner:
{NEXT_PUBLIC_SITE_URL}/api/calendar/docplanner/webhook?sourceId=doctoralia&token={DOCPLANNER_WEBHOOK_SECRET}

Then:
1. Open /dashboard/calendar-integrations.
2. Click "Preparar fuentes".
3. Click "Verificar Doctoralia".
4. The portal requests an OAuth2 client_credentials token.
5. Only after a successful token request are read/write authorities enabled.

Doctoralia push behavior:
- slot-booking: asks the canonical master before confirmation; occupied returns 409.
- booked/moved/canceled: becomes a canonical event update.
- break-created/removed/moved: observed as external calendar state.
- Clinical Portal writeback uses calendar breaks with a canonical marker to prevent echo loops.

Operational infrastructure gate:
Docplanner documents dynamic outbound IP ranges for callbacks. Their current allowlist requirements must be implemented at the hosting/firewall layer according to the approved integration configuration.

## Third calendar

Inbound:
POST {NEXT_PUBLIC_SITE_URL}/api/calendar/intake
Authorization: Bearer {CALENDAR_SYNC_SECRET}

Normalized body:
- sourceId = calendar-third
- externalEventId
- providerRef
- startsAt
- endsAt
- timezone
- status
- optional correlationKey

Outbound:
Set THIRD_CALENDAR_WRITE_URL to a receiver owned by the third system.
Optionally set THIRD_CALENDAR_WEBHOOK_SECRET; outbound bodies receive an HMAC SHA-256 signature in x-clinical-calendar-signature.

If the third system reflects a Clinical Portal write back into the intake endpoint, it must send:
- correlationKey = canonical key received from Clinical Portal;
- canonicalEcho = true.

This prevents circular fan-out.

## Recovery and retries

Primary behavior is push/event-driven.

Recovery endpoint:
POST /api/calendar/maintenance
Authorization: Bearer {CALENDAR_SYNC_SECRET}

It:
- pulls queued Docplanner notifications as a recovery path;
- renews Google watch channels approaching expiration;
- retries pending/failed propagation jobs (maximum attempts governed in code).

A GitHub Actions schedule is included every 10 minutes as fallback.
Configure repository secrets:
- CLINICAL_PORTAL_URL
- CALENDAR_SYNC_SECRET

If those secrets are absent, the maintenance workflow exits safely without calling production.

## Human operating surface

/dashboard/calendar-integrations

This page provides:
- source bootstrap;
- Google authorization;
- Doctoralia credential verification;
- observed read/write authority;
- last synchronization time;
- pending propagation count;
- open conflict alert count.

## Closure test

The integration is not closed until this exact test succeeds:

1. Create a Saturday test booking in source A.
2. Observe it in CanonicalCalendarEvent.
3. Observe writeback in source B.
4. Observe writeback in source C.
5. Attempt an overlapping booking from another source.
6. Verify the master returns occupied or persists a conflict instead of silently overwriting.
7. Cancel the original booking.
8. Verify the master becomes free and the managed external blocks are removed.
9. Re-read all three sources and persist external RETURNS.

Only then can the three-calendar convergence be marked operational.
