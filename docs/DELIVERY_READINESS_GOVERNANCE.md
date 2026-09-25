# Clinical Portal — Delivery Readiness & Governance

Date: 2026-09-24
Branch: delivery/calendar-discovery-governance
Status basis: repository main @ fdbda4269464033c4ba5338d4ee47e28ea43d7de

## 1. What exists now

Observed implementation:
- Next.js 14 clinical portal.
- Prisma/PostgreSQL persistence.
- Models for User, Person, Patient, Provider, Appointment, Encounter, Observation, Diagnosis, Medication, Prescription, LabResult, Document, Consent, Reminder, AuditLog, DomainEvent, AIInsight, ResearchDataset and ClinicSettings.
- CRUD APIs for patients, appointments and encounters.
- Dashboard aggregation.
- NextAuth credentials-based authentication.
- Audit logging on several write paths.
- Vercel deployment status on latest commit is successful.

Not observed in current implementation:
- Federation of three external calendars.
- Google Calendar / Microsoft / Doctoralia / Calendly adapters.
- Canonical calendar conflict resolution.
- Webhooks or external calendar synchronization.
- Public physician identity graph / Discovery Mesh.
- sitemap.xml, robots.txt, LocalBusiness/Physician structured data or Search Console automation.
- Google Business Profile API automation.
- Runtime agents as autonomous software workers.

## 2. Delivery interpretation

The repository is currently an MVP clinical information system, not yet a federated clinical operating layer.

For the requested delivery, the first demonstrable slice should be:

A. Canonical Agenda
Three fragmented appointment sources -> normalized calendar events -> one canonical agenda -> deduplication/conflict policy -> source attribution -> writeback policy -> audit trail.

B. Physician Discovery Surface
Private medical login remains an authorization boundary.
Public physician identity becomes a separate discoverable surface containing verified professional information, structured data, canonical URLs, sitemap and provenance links.

The private login MUST NOT itself be used as the physician's discovery surface. Search crawlers should not depend on authenticated pages.

## 3. Operational actors ("agents")

No autonomous agents are implemented today. The following agents are the governance roles required for the next phase.

### Calendar Intake Agent
Purpose: read events from authorized calendar sources.
Authority: read only by default.
Output: normalized candidate events with source and external ID.
Cannot: create/delete clinical appointments without an authorized write policy.

### Calendar Reconciliation Agent
Purpose: deduplicate and reconcile collisions.
Inputs: normalized candidate events.
Output: canonical appointment proposal + conflict flags.
Rules: preserve source identity; never silently overwrite contradictory events.

### Calendar Writeback Agent
Purpose: propagate an authorized canonical change to eligible external calendars.
Authority: explicit per-source write scope.
Requirement: idempotency, audit record and external result capture.

### Identity Publication Agent
Purpose: publish verified public professional identity data to the website surfaces controlled by the portal.
Authority: public professional fields only.
Cannot: expose patient information, private account data or authentication state.

### Indexing/Discovery Agent
Purpose: maintain sitemap, structured metadata and submit/re-submit controlled URLs where API authority exists.
Authority: site-owned indexing surfaces only.
Cannot: claim or fabricate third-party reviews, rankings, credentials or Google prominence.

### Governance/Audit Agent
Purpose: record material actions, source, actor, authority and RETURN.
Output: immutable/auditable event history.
Cannot: treat requested action as completed until external return is observed.

## 4. Contracts

### Calendar Source Contract
Every source must expose:
- source id
- source type
- external event id
- start/end
- timezone
- title/appointment class
- provider
- location
- patient reference only when legally and operationally permitted
- updated_at / source version
- read authority
- write authority

### Canonical Appointment Contract
Every canonical appointment must preserve:
- canonical id
- source links[]
- provider
- start/end
- timezone
- status
- reason
- conflict state
- provenance
- last reconciliation time
- writeback state

### Identity Contract
Public identity fields may include:
- physician name
- specialty
- professional credentials that have been verified
- clinic name
- public contact routes
- public address and hours
- canonical website URL
- controlled social/profile links
- public booking URL

Private identity fields must remain excluded.

### Action Contract
Every automated external action must record:
OBSERVED input -> AUTHORITY -> ACTION -> external RETURN -> resulting state.

An API response is not equivalent to persisted or externally visible state.

## 5. Governance rules

1. Capability != authority.
2. Public discovery and private authentication are separate trust zones.
3. Clinical data never exists to improve SEO.
4. External calendars are evidence sources; the canonical appointment is a governed record.
5. Conflicts are surfaced, not silently resolved.
6. Writeback is source-specific and disabled until credentials/scopes are verified.
7. Google visibility is not represented as a guaranteed score increase.
8. Search ranking work optimizes factual consistency, crawlability, relevance and prominence signals; outcome remains externally determined.
9. Patient-facing AI cannot diagnose, prescribe or modify treatment.
10. Material actions require audit provenance and observable RETURN.

## 6. Critical blocker observed

The current credentials provider retrieves a user by email and contains a TODO for password hashing/verification. A matching user can currently be returned without a demonstrated password check.

This is a release blocker for authenticated clinical use.

## 7. Acceptance criteria for requested first phase

### Calendar
- Three named sources configured.
- Each source has verified read authority.
- Events normalize into one canonical structure.
- Duplicate/collision rules are deterministic.
- Source provenance visible.
- No double-booking is silently accepted.
- At least one real synchronization cycle produces an auditable RETURN.
- Writeback, if enabled, is independently permissioned and tested.

### Physician discovery
- Public physician page is crawlable without login.
- Canonical metadata present.
- sitemap and robots configuration present.
- structured data validates against applicable Google/Search schema guidance.
- consistent public professional identity across controlled website surfaces.
- Google Business Profile data is reconciled manually or through authorized API access.
- Search Console ownership/authority verified before submission automation.
- No promise of a numeric ranking increase; baseline and subsequent observations are recorded.

## 8. Expected delivery state

A defensible first delivery is not "three calendars and Google magically fixed."

It is:
1. one governed canonical agenda fed by three verified sources;
2. one crawlable, consistent physician identity surface;
3. a secure doctor login as the private authority plane;
4. auditable automation with explicit authority and RETURN;
5. measurable baseline vs subsequent external observations.
