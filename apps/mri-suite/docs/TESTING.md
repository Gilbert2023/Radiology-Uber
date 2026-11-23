# Testing

## How to run

```bash
npm run typecheck                 # TypeScript, strict
npm test                          # integration tests (node:test) – uses TEST_DATABASE_URL, which is WIPED and re-seeded
npm run build && npm start        # production build
npm run db:reset                  # demo data (needed by the E2E test)
npm run test:e2e                  # browser smoke test (Playwright/Chromium) against BASE_URL (default http://localhost:3000)
```

Integration tests call the same service layer the Server Actions use, against a real PostgreSQL
database seeded with reference and synthetic demo data; each test creates its own scanner and
patients so it never collides with seeded bookings.

## Coverage

| Area | Tests (file) |
|---|---|
| Appointment creation, BOOKED event, accession format | workflow – booking |
| Double-booking (scanner and patient), back-to-back allowed | workflow – booking |
| Operating hours (routine blocked, emergency allowed) | workflow – booking |
| Reschedule (event + count), cancellation reason, slot freed, no-show timing | workflow – booking |
| Booking permissions (manager, nurse denied) | workflow – booking |
| Arrival requires identity verification | workflow – stages |
| Screening permission, routine clearance, status transitions | workflow – happy path |
| Preparation completeness (metal, gown, protocol checklist; eGFR + cannula for contrast) | workflow |
| Scan blocked until prep complete; nurse cannot scan; scanner IN_USE/AVAILABLE | workflow |
| Incomplete scan requires reason; PACS record created on scan end | workflow |
| PACS: confirm only after success, failure reason required, invalid transitions, retries counted, confirmation completes exam, re-open revokes completion | workflow |
| Incomplete exam never becomes COMPLETED | workflow |
| Safety block: hazard answer details, implant declared without record, unknown implant, DO NOT SCAN, NOT CLEARED blocks scan, MR Unsafe can't proceed | workflow – safety |
| MR Conditional: comparison required, mismatch blocks, rationale required, only MR safety personnel can clear | workflow – safety |
| Clearance revoked when answers change; previous assessment not reused for a new exam | workflow – safety |
| Implant materials validation; conditional conditions required; verification checklist & documentation | workflow – safety |
| Pregnancy status required; possible pregnancy needs MR safety personnel | workflow – safety |
| Contrast stock decrement & movement ledger, duplicate/expired receipt, insufficient/expired batch, reaction → incident, negative adjustment blocked, no contrast before clearance | operations |
| QC: no thresholds → NOT_EVALUATED, limits require documented source, failure → corrective action + alert, verification once | operations |
| Maintenance: breakdown → scanner unavailable → scan blocked + downtime alert; RTS permission; scanner restored | operations |
| Maintenance due alert | operations |
| Roster vs leave, overlapping leave, rest after night shift, duplicate shift | operations |
| Incident reference, closure requirements, manage permission, confidentiality | operations |
| Cleaning compliance & explanation | operations |
| Least privilege (sysadmin no clinical access, no radiologist role, lock-out protection) | operations |
| Password policy, forced password change, duplicate MRN, similar-patient warning, future DOB | operations |
| Audit log append-only (UPDATE/DELETE rejected), audit entry written | operations |
| DB exclusion constraint prevents overlapping bookings outside the app | operations |
| Upload validation by content, permission on upload | operations |
| Integrations cannot be marked connected manually; protocol approval needs parameters; educational references cannot be approved | operations |
| Analytics vs raw SQL: exam volume, PACS success rate & average time, utilisation formula & available hours, screening compliance | operations |
| E2E: login redirect, generic login error, unauthenticated API 401, landing page per role (7 roles), access-denied pages, hidden navigation, admin has no patient access, API permission, UI-driven screening + clearance, PDF & Excel export (content verified), export permission, sign-out, no horizontal scroll on phone and tablet for 4 key pages | tests/e2e/smoke.mjs |
| Page crawl: all 66 routes render without server or browser console errors (supervisor + admin) | manual crawl script during development |

## Latest results (22–23 Nov 2026)

- `npm run typecheck` – pass
- `npm test` – **27/27 pass** (10 workflow, 17 operations/security/analytics)
- `next build` – pass
- `npm run test:e2e` – **28/28 checks pass**
- Route crawl – all routes 200 with no console errors (supervisor lacks user/role administration by design)

Defects found and fixed by testing: omitted optional enum fields failed validation; button
`name/value` (e.g. clear/not-cleared, save/complete) was not transmitted to Server Actions;
failed-login counter query had ambiguous parameter types; hydration mismatch in the live-refresh
clock; system administrator landed on the incidents page.

## Not yet tested / limitations
- Account lock-out after 5 failures is implemented but not covered by an automated test (would lock a shared demo user).
- No load/performance testing; no automated accessibility audit (keyboard navigation, labels and contrast were designed in but not tool-verified).
- Cross-browser testing limited to Chromium.
- Clinical content (preparation protocols, screening questionnaire wording) requires departmental clinical review – tests verify rules, not clinical appropriateness.
