# Execution Tracker — Calendar + Physician Discovery

Updated: 2026-09-24
Branch: `delivery/calendar-discovery-governance`

## Goal
Deliver a first defensible clinical continuity slice:
1. secure private authority plane;
2. governed canonical calendar capable of reconciling three sources;
3. public crawlable physician identity plane;
4. external actions only when authority and RETURN are observable.

## Current state

| Workstream | State | Evidence | Remaining gate |
|---|---|---|---|
| Password verification | IMPLEMENTED_ON_BRANCH | scrypt hash/verify + credentials provider | build/deploy check + real authorized account |
| Clinical route protection | IMPLEMENTED_ON_BRANCH | middleware protects pages/APIs by staff role | deployment verification |
| Functional login UI | IMPLEMENTED_ON_BRANCH | credentials form + callback | deployment verification |
| Canonical calendar contract | IMPLEMENTED_ON_BRANCH | source/canonical types | persistence adapter |
| Reconciliation engine | IMPLEMENTED_ON_BRANCH | provenance + contradictions + collision logic | test execution + three real source adapters |
| Calendar provider A | BLOCKED | no provider/credentials supplied | identify source + authorize |
| Calendar provider B | BLOCKED | no provider/credentials supplied | identify source + authorize |
| Calendar provider C | BLOCKED | no provider/credentials supplied | identify source + authorize |
| Physician public identity | IMPLEMENTED_ON_BRANCH | public route + canonical metadata | deploy + enrich only with verified public data |
| Structured data | IMPLEMENTED_ON_BRANCH | Physician JSON-LD | production URL + external validation |
| Sitemap | IMPLEMENTED_ON_BRANCH | sitemap.ts | production URL |
| Robots governance | IMPLEMENTED_ON_BRANCH | private routes disallowed | deployment verification |
| Google Business reconciliation | BLOCKED | no authorized GBP connection observed | account/API authority |
| Search Console submission | BLOCKED | no ownership/API authority observed | verified property authority |
| Ranking/visibility RETURN | NOT_OBSERVED | no baseline captured yet | deploy, index, then measure |

## Verified RETURN — connector-ready calendar fabric

Final connector head verified: `cd936b6fc250d54cfd2aadebfe459415e7b5f1b2`

- Prisma schema validation: SUCCESS
- TypeScript typecheck: SUCCESS
- Vitest: SUCCESS (including encryption + Docplanner callback behavior)
- Next.js production build: SUCCESS
- Vercel: SUCCESS
- Google connector code: IMPLEMENTED, external OAuth credentials NOT_OBSERVED
- Docplanner connector code: IMPLEMENTED, external integration credentials NOT_OBSERVED
- Third-calendar generic connector: IMPLEMENTED, actual provider NOT_IDENTIFIED
- Production DB migration: NOT_OBSERVED

This is now CONNECTOR_READY, not yet EXTERNALLY_CONNECTED.

## Previous verified RETURN — calendar master first instance

Head validated: `d3aff46ec516c204dd78b412a4c568a238113532`

- Prisma schema validation: SUCCESS
- TypeScript typecheck: SUCCESS
- Vitest suite: SUCCESS
- Next.js build: SUCCESS
- Vercel deployment status: SUCCESS
- Production database migration: NOT_OBSERVED
- Real Doctoralia/Google/source-C credentials: NOT_OBSERVED
- External writeback cycle: NOT_OBSERVED

This means the first implementation is technically buildable and deployable, but external calendar synchronization is not yet operational until real provider authority and database migration are applied.

## Observed RETURN history

### Vercel preview attempt 1
- Head: `66d821f2caed1d54a47bfd59004df3fa684dfb16`
- RETURN: FAILURE
- Direct build log was not observable through the available Vercel connection because the `clinical-portal` project was not exposed by that connector.
- A concrete Next.js build-risk was identified in the login page: `useSearchParams()` at page level can require a Suspense boundary during static generation.
- Reversible correction applied: removed the page-level `useSearchParams()` dependency and resolved callback URL at submit time.
- Corrective commit: `097bf4815e03968d9407cf355202e1a73217e712`
- New deployment RETURN: pending/not yet observed at tracker update time.

## Rules for closure
A task may move to DONE only when:
- code/config exists where required;
- build/test/deployment RETURN is observed;
- external integrations have verified authority;
- external state is re-read after writes;
- ranking/indexing claims are based on observations, not requested actions.

## Next execution order
1. Observe the deployment RETURN for corrective head `097bf4815e03968d9407cf355202e1a73217e712`.
2. If it fails, isolate the next concrete build error and correct it.
3. Identify the three calendar providers and connection method.
4. Add read-only adapters first.
5. Run one real reconciliation cycle and inspect conflicts.
6. Add persistence for source links and canonical reconciliation state.
7. Connect authorized Google Business/Search Console surfaces.
8. Capture discovery baseline and subsequent observations.
