# Clinical operational closure Implementation Plan

Goal: close the audited calendar gaps and verify operational flows before one final main update/deployment.
Architecture: reuse Appointment, canonical events, existing reconciliation, durable propagation jobs and DomainEvent receipts. No parallel calendar engine. Keep clinical information off external calendars.
Tech Stack: Next.js, Prisma/PostgreSQL, Auth.js, Vitest.
Spec: docs/VERIFICATION_2026-10-31.md and the user's four-step instruction.

## Constraints
- No remote branch or PR is needed. Work locally; main advances once at the end.
- One production deployment maximum; configuration and tests precede publication.
- Never infer external authority from a connector existing. No synthetic clinical records in production.
- Preserve public identity/design and existing clinical records.

## Review focus
- Concurrent or out-of-order intake must not lose versions or silently release occupied slots.
- A local appointment and its canonical representation must commit together.
- Disabled, stale or partially read sources cannot certify availability.
- Interrupted propagation must recover without obsolete jobs resurrecting cancelled events.
- Patient-role access must be scoped to the authenticated patient, never all records.

## Task 1 — Configuration / operating boundary
- [ ] Inspect current infrastructure and production configuration, reuse authorized resources.
- [ ] Validate authentication and database setup without publishing; record real configuration blockers.

## Task 2 — Calendar correctness
- [ ] Reproduce source contradiction, stale arrival, internal occupancy, stale coverage and contiguous appointments with disposable database tests.
- [ ] Connect Appointment writes and canonical/outbox writes in one transaction; version-aware reconciliation and conservative availability.
- [ ] Recover abandoned jobs; reject stale jobs and unsigned/unverified generic receipts; periodic Google pulls.
- [ ] Run unit, integration, type and production build checks.

## Task 3 — Provider verification
- [ ] Verify adapter create/move/cancel/readback using synthetic provider responses and real database persistence.
- [ ] Inspect actual credentials/authority; execute external tests only on explicitly authorized disposable calendars.
- [ ] Distinguish successful execution, pending work, omissions and blocked integrations in stored receipts/UI.

## Task 4 — Clinical operation and final integration
- [ ] Reuse existing reminders/patient/user models for scoped patient followup and staff reminder workflow; never mark a message delivered without evidence.
- [ ] Show execution evidence and unresolved operational dependencies in the doctor hub.
- [ ] Run complete regression/security smoke checks and final code review.
- [ ] Only when release gates pass: make one main update, observe one deployment, verify live flow, confirm only main/no open PRs.

## Progress / decisions
- Remote verified: only main, no open PRs, head d13317e. No remote mutation or deployment performed.
- Vercel connector cannot resolve the project even with explicit observed team ID; existing authorized browser fallback remains available.
- Available DB inventory: Supabase SystemFriction only; no Neon clinic match. Do not repurpose SFI clinical-data storage by assumption.
- Task 1: BLOCKED by production configuration/storage identity. Actual Vercel UI offers Anlaysis and supabase-celeste-brush, neither linked. Connecting grants the app database access; confirmation of intended clinical store is necessary.
- Task 2: implemented and locally verified. Original five runtime failures now pass. Added pending-cancellation, equal-version ambiguity and out-of-order race checks.
- Task 3: adapters exercised with simulated provider responses + real disposable persistence; live provider authority/test calendar NOT_OBSERVED. No claim of complete external synchronization.
- Task 4: patient followup, reminder registration and staff patient/appointment forms implemented. External message delivery and broader autonomous agents remain unimplemented; no fake success.
- Independent final review: four important findings (in-flight write/cancel race, Google missing mapping cancellation, stale Doctoralia callback, disabled source coverage). All corrected and covered by runtime/unit regression checks.
- Ruling: do not link an ambiguously named database or publish a candidate into missing production configuration. Cost: final integration waits for correct storage/credentials; benefit: no unintended clinical-data access or wasted deployment.
- Ruling: external delivery remains explicitly unverified when no authorized target or real provider receipt exists. Cost: booking can remain blocked until connections are completed.
- No remote branch or PR created. Remote main/deployment remain untouched pending the final release gate.
- 2026-11-01: Correct clinical Supabase project authenticated through authorized browser fallback. Empty public schema initialized atomically with all four exact migrations and Prisma history. Real readback: 32/32 RLS tables, zero public client grants, zero patients/accounts, one real doctor. Doctor/provider mapping and observed IPv4 session-pooler metadata saved in Vercel Production without redeployment.
- Prepare first real administrator through production-only bootstrap, never demo seed. Require user-entered SEED_ADMIN_PASSWORD; preserve existing passwords/roles. Verify schema checksums/privacy before bootstrap. Keep final main/deployment gate pending this credential and real runtime/provider verification.
