# Build Milestones
## Radiology Uber (Working Title) — 150 Milestones, Easiest → Hardest

**Document version:** 0.1
**Date:** 2026-07-28
**Companion documents:** `docs/SRS.md`, `docs/PRD.md`, `docs/DATABASE_DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/UX_DESIGN.md`, `docs/API_DESIGN.md`, `docs/FOLDER_STRUCTURE.md`

**Method:** 150 milestones, each scoped to be completable in under 3 hours by one engineer already familiar with this codebase. Grouped into 21 phases that run easiest → hardest; within and across phases, every milestone is placed *after* everything it depends on — nothing here requires a later milestone to exist first. A few especially load-bearing dependencies that aren't simply "the item right above" are called out inline as `(needs M#)`.

---

### Phase 0 — Repository & Tooling Foundations (easiest — no dependencies)
- [ ] **M1.** Scaffold the monorepo top-level folders (`apps/`, `packages/`, `database/`, `infrastructure/`, `docker/`, `testing/`, `scripts/`) per `docs/FOLDER_STRUCTURE.md`.
- [ ] **M2.** Set up pnpm workspaces (`pnpm-workspace.yaml`, root `package.json`).
- [ ] **M3.** Add `packages/config` with shared `tsconfig.base.json`, ESLint config, and Prettier config.
- [ ] **M4.** Configure Turborepo (`turbo.json`) with stub `build`/`test`/`lint` pipelines.
- [ ] **M5.** Add root `.gitignore`, `.env.example`, and orientation `README.md`.
- [ ] **M6.** Set up Husky + lint-staged pre-commit hook.
- [ ] **M7.** Add GitHub PR template and issue templates.
- [ ] **M8.** Create `docker/docker-compose.yml` with Postgres and Redis services only.
- [ ] **M9.** Verify the local Docker stack boots and both services are reachable from the host.
- [ ] **M10.** Add a lint-only GitHub Actions workflow skeleton (`.github/workflows/ci-lint.yml`).

### Phase 1 — Database Bootstrap (mechanical, low-risk)
- [ ] **M11.** Initialize the migration/ORM tool in `database/` (Prisma) and connect it to the local Postgres from M8. *(needs M9)*
- [ ] **M12.** Migration: enable `pgcrypto`/`citext` extensions and create all shared enum types (`docs/DATABASE_DESIGN.md` §0.9, §11.4 step 1).
- [ ] **M13.** Migration: `users`, `user_roles`.
- [ ] **M14.** Migration: `modalities` lookup table.
- [ ] **M15.** Migration: `patient_profiles`, `patient_dependents`.
- [ ] **M16.** Migration: `doctor_profiles`, `radiologist_profiles`, `radiologist_subspecialties`.
- [ ] **M17.** Migration: `radiographer_profiles`, `radiographer_modalities`, `practitioner_credential_documents`, `admin_profiles`.
- [ ] **M18.** Migration: `facilities`, `facility_staff`.
- [ ] **M19.** Migration: `facility_equipment`, `facility_services`, `facility_service_slots`.
- [ ] **M20.** Migration: `referrals`, `bookings`, `booking_status_history`.
- [ ] **M21.** Migration: `studies`.
- [ ] **M22.** Migration: `match_requests`, `match_offers`. *(must precede M23 — `reports.match_request_id` FK, per DATABASE_DESIGN §5.2 note)*
- [ ] **M23.** Migration: `reports`, `report_addenda`.
- [ ] **M24.** Migration: `payments`, `payment_events`, `refunds`.
- [ ] **M25.** Migration: `payouts`, `payout_line_items`, `platform_commission_ledger`.
- [ ] **M26.** Migration: `ratings`, `disputes`, `dispute_events`.
- [ ] **M27.** Migration: `consent_records`, `audit_logs`.
- [ ] **M28.** Migration: `notifications`.
- [ ] **M29.** Write the reference-data seed script (modalities, Ghana regions) and a separate dev-fixture seed script; verify the full migration set applies cleanly to a fresh database.

### Phase 2 — Backend App Scaffolding
- [ ] **M30.** Scaffold `apps/api` (NestJS): `main.ts`, `app.module.ts`, typed config module, Prisma client wiring. *(needs M11–M29)*
- [ ] **M31.** Add the global exception filter producing the `{ error: { code, message } }` envelope (`docs/API_DESIGN.md` §0.4), structured request logging, and a `GET /health` endpoint.
- [ ] **M32.** Wire a Redis client into `apps/api`; add the `worker.ts` background-worker bootstrap sharing the same module tree.
- [ ] **M33.** Build the JWT auth guard and the RBAC role guard (`common/guards`).
- [ ] **M34.** Build the live-verification-status guard (Redis-cached DB check per request, `docs/ARCHITECTURE.md` §6.3).
- [ ] **M35.** Set up the `apps/api` test harness (Jest + Supertest against a disposable test database).

### Phase 3 — Authentication
- [ ] **M36.** Implement `POST /auth/otp/request` and `POST /auth/otp/verify`, with OTP storage/expiry in Redis and per-number/IP rate limiting. *(needs M13, M32)*
- [ ] **M37.** Integrate the SMS gateway (Africa's Talking sandbox) for OTP delivery.
- [ ] **M38.** Implement `POST /auth/refresh` and `POST /auth/logout`.
- [ ] **M39.** Implement `POST /auth/login` (password) and `POST /auth/mfa/verify` for practitioners/admins.
- [ ] **M40.** Implement `POST /auth/password/forgot` and `POST /auth/password/reset`.
- [ ] **M41.** Wire the M33/M34 guards onto a protected test route end-to-end and confirm role/verification enforcement.
- [ ] **M42.** Write integration tests covering the full OTP and password+MFA login flows.

### Phase 4 — Identity & Profiles
- [ ] **M43.** Implement `GET/PATCH /users/me` and the dependents CRUD endpoints. *(needs M15, M33)*
- [ ] **M44.** Implement the doctor profile endpoints (create/get/patch).
- [ ] **M45.** Implement the radiologist profile endpoints, including subspecialties and the `availability_status` toggle.
- [ ] **M46.** Implement the radiographer profile endpoints, including qualified modalities and the `availability_status` toggle.
- [ ] **M47.** Implement the credential-documents upload endpoint (pre-signed object-storage URL flow).
- [ ] **M48.** Implement the consent-records create/list endpoints.
- [ ] **M49.** Write unit tests for the Identity module's services.

### Phase 5 — Facilities & Services
- [ ] **M50.** Implement `GET /modalities` and facility onboarding (`POST/GET/PATCH /facilities`). *(needs M14, M18)*
- [ ] **M51.** Implement the `GET /facilities` search endpoint (filters, pagination — geo-ranking deferred to M147+).
- [ ] **M52.** Implement the facility services CRUD endpoints.
- [ ] **M53.** Implement the facility equipment CRUD endpoints.
- [ ] **M54.** Implement the facility slots list/create/block endpoints, including the atomic-capacity guard.
- [ ] **M55.** Implement the facility staff CRUD endpoints, including the invite-by-phone stub.
- [ ] **M56.** Write unit tests for the Facilities module's services.

### Phase 6 — Referrals & Bookings
- [ ] **M57.** Implement the referrals endpoints (create/list/get/cancel). *(needs M43–M50)*
- [ ] **M58.** Implement `POST /bookings` with the atomic slot-claim transaction (`docs/ARCHITECTURE.md` §5.5). *(needs M54, M57)*
- [ ] **M59.** Implement `GET /bookings` (role-scoped) and `GET /bookings/{id}`.
- [ ] **M60.** Implement `POST /bookings/{id}/cancel` and `POST /bookings/{id}/reschedule`.
- [ ] **M61.** Implement `POST /bookings/{id}/check-in`, `/start`, and `/images-acquired`.
- [ ] **M62.** Implement `GET /bookings/{id}/history` and confirm every transition writes a `booking_status_history` row and emits an event.
- [ ] **M63.** Write a concurrency test proving two simultaneous bookings against the last open slot cannot both succeed.
- [ ] **M64.** Write Bookings module integration tests covering the full lifecycle.

### Phase 7 — Studies & PACS
- [ ] **M65.** Stand up a local Orthanc instance (plus OHIF viewer) in `docker-compose.yml`.
- [ ] **M66.** Implement `POST /bookings/{id}/studies` (study record creation, DICOM UID/storage-reference handling). *(needs M61, M65)*
- [ ] **M67.** Implement `GET /studies/{id}` including signed, time-limited viewer-URL generation.

### Phase 8 — Marketplace Matching
- [ ] **M68.** Implement `POST /match-requests` for both `report_request` and `shift_request` types, with the discriminated-union validation. *(needs M55, M67)*
- [ ] **M69.** Implement the matching dispatch logic (eligible-practitioner lookup + `match_offers` creation).
- [ ] **M70.** Implement `GET /match-requests`, `GET /match-requests/{id}`, `PATCH /match-requests/{id}`.
- [ ] **M71.** Implement `GET /match-offers` (practitioner worklist).
- [ ] **M72.** Implement `POST /match-offers/{id}/accept`, including the concurrency-safe "revoke competing offers" sequence.
- [ ] **M73.** Implement `POST /match-offers/{id}/decline`, confirming it re-triggers dispatch to the next candidate.
- [ ] **M74.** Implement the SLA-breach background scanner job (`worker.ts`).
- [ ] **M75.** Write race-condition tests for concurrent offer acceptance.

### Phase 9 — Reporting
- [ ] **M76.** Implement report draft create/edit endpoints (`POST /studies/{id}/reports`, `PATCH /reports/{id}`). *(needs M67, M72)*
- [ ] **M77.** Implement the database-level report-immutability trigger plus the matching API `409` guard (`docs/DATABASE_DESIGN.md` §5.2).
- [ ] **M78.** Implement `POST /reports/{id}/submit` (sign/lock, emit the `report.ready` event and the critical-finding flag).
- [ ] **M79.** Implement the report addenda endpoints and `GET /patients/{id}/imaging-history` (consent-gated).
- [ ] **M80.** Write Reporting module unit and integration tests, including an attempted edit of a submitted report.

### Phase 10 — Payments
- [ ] **M81.** Set up the PSP (Paystack/Flutterwave) sandbox account and secrets configuration. *(needs M58)*
- [ ] **M82.** Implement `POST /bookings/{id}/payments` for the MoMo path.
- [ ] **M83.** Implement the card-checkout handoff path on the same endpoint.
- [ ] **M84.** Implement `POST /webhooks/payments/{provider}` with signature verification and idempotent event processing.
- [ ] **M85.** Implement `GET /payments/{id}` and `POST /payments/{id}/refund`.
- [ ] **M86.** Implement the payout batch generation background job.
- [ ] **M87.** Implement `GET /payouts`, `GET /payouts/{id}`, `GET /payouts/{id}/line-items`.
- [ ] **M88.** Implement the `platform_commission_ledger` write-on-booking-completion logic.
- [ ] **M89.** Write payments tests covering idempotency, webhook signature rejection, and the double-charge guard.

### Phase 11 — Notifications
- [ ] **M90.** Implement `POST/DELETE /devices` (push-token registration). *(needs M78, M84)*
- [ ] **M91.** Integrate FCM push sending.
- [ ] **M92.** Build the notification template rendering system.
- [ ] **M93.** Implement the standard push-then-SMS-fallback delivery logic.
- [ ] **M94.** Implement the critical-finding simultaneous push+SMS escalation path (`docs/ARCHITECTURE.md` §8.2). *(needs M78, M91)*
- [ ] **M95.** Implement `GET /notifications`, `PATCH /notifications/{id}/read`, `PATCH /users/me/notification-preferences` (with the critical-alert opt-out lock).
- [ ] **M96.** Write Notifications module tests, including a forced push-failure→SMS-fallback case.

### Phase 12 — Trust, Disputes & Compliance
- [ ] **M97.** Implement `POST /bookings/{id}/rating` and `GET /facilities/{id}/ratings`. *(needs M62)*
- [ ] **M98.** Implement `POST /disputes`, `GET /disputes`, `GET /disputes/{id}`.
- [ ] **M99.** Implement `POST /disputes/{id}/events` and `PATCH /disputes/{id}`.
- [ ] **M100.** Implement the audit-log-writing interceptor and attach it to every clinical-data read (`GET /studies/{id}`, `GET /reports/{id}`, etc.).
- [ ] **M101.** Implement `GET /admin/audit-logs` (cursor-paginated).
- [ ] **M102.** Write Trust/Disputes and Compliance module tests.
- [ ] **M103.** Run a security-checklist walkthrough against `docs/ARCHITECTURE.md` §15 (auth, RBAC, audit coverage, secrets) and file any gaps found.

### Phase 13 — Admin & Ops Backend
- [ ] **M104.** Implement `GET /admin/credential-documents` and the approve/reject endpoints. *(needs M47, M103)*
- [ ] **M105.** Implement `GET /admin/facilities` and `POST /admin/facilities/{id}/verify`.
- [ ] **M106.** Implement `GET /admin/dashboard/metrics` and `GET /admin/match-requests/monitor`.
- [ ] **M107.** Implement `POST /admin/bookings/{id}/override`, `GET /admin/users/{id}`, suspend/reactivate endpoints.
- [ ] **M108.** Implement `GET/PATCH /admin/feature-flags` with change-history logging.

### Phase 14 — Shared Frontend Packages
- [ ] **M109.** Scaffold `packages/shared-types`, generated from the Prisma schema. *(needs M11–M108 stabilized enough to type against)*
- [ ] **M110.** Scaffold `packages/api-client` with typed resource modules and React Query hooks covering `docs/API_DESIGN.md`.
- [ ] **M111.** Scaffold `packages/ui-web`: design tokens plus `Button`, `Card`, `StatusPill`, `VerificationBadge`, `ConfirmDialog`.
- [ ] **M112.** Scaffold `packages/ui-mobile`: the same component set, mobile-native equivalents.
- [ ] **M113.** Scaffold `packages/mobile-core`: navigation container, secure token storage, and the offline-queue skeleton.

### Phase 15 — Patient App
- [ ] **M114.** Scaffold `apps/patient-app` (React Native), navigation container, and auth wiring against `packages/api-client`. *(needs M110, M113)*
- [ ] **M115.** Build the Login screen (A1: phone entry + OTP verify).
- [ ] **M116.** Build the Home screen (A2).
- [ ] **M117.** Build the Search screen (A3: list view, filters, result cards).
- [ ] **M118.** Build the Booking screen (A4: 4-step wizard).
- [ ] **M119.** Build the Payment screen (A5: MoMo, card handoff, pay-at-center).
- [ ] **M120.** Build the Tracking screen (A6: status timeline).
- [ ] **M121.** Build the Reports screen (A7: list + detail + share/download).
- [ ] **M122.** Build the Profile screen (A8: dependents, consent, notification preferences) and wire the offline booking-action queue.

### Phase 16 — Practitioner App
- [ ] **M123.** Scaffold `apps/practitioner-app`, with role-aware navigation (radiographer vs. radiologist). *(needs M113)*
- [ ] **M124.** Build the Login and Home/Worklist screens (B1/B2, C1/C2).
- [ ] **M125.** Build the Shift Marketplace and Study Workflow screens (B3, B4 — radiographer-only).
- [ ] **M126.** Build the Case Offer screen (C5) and the Earnings screen (B5/C6).
- [ ] **M127.** Build the Profile & Credentials screen (B6/C7).

### Phase 17 — Radiologist Portal
- [ ] **M128.** Scaffold `apps/radiologist-portal` (Next.js), Login (C1), and Worklist Dashboard (C2). *(needs M65, M110)*
- [ ] **M129.** Integrate the OHIF viewer and build the Case Viewer + report form (C3).
- [ ] **M130.** Build the report submit/sign confirmation flow (C4).
- [ ] **M131.** Build the Case Offer landing screen (C5).
- [ ] **M132.** Build the Earnings (C6) and Profile & Credentials (C7) screens.

### Phase 18 — Provider Dashboard
- [ ] **M133.** Scaffold `apps/provider-dashboard`, Login, and the role-aware Overview screen (D2/E2). *(needs M50–M108, M110)*
- [ ] **M134.** Build the Calendar & Slot Management screen (D3/E3, including E3's opt-in overflow model).
- [ ] **M135.** Build the Order Queue screen (D4/E4).
- [ ] **M136.** Build the Teleradiology Queue screen (D5/E5).
- [ ] **M137.** Build the Services Catalog and Staff Management screens (D6, D7/E6).
- [ ] **M138.** Build the Payouts, Facility Settings, and (hospital-only) Reports & Analytics/Integration Settings screens (D8/D9, E7/E8).

### Phase 19 — Admin Panel
- [ ] **M139.** Scaffold `apps/admin-panel`, Login, and the Marketplace Health Dashboard (F2). *(needs M104–M108, M110)*
- [ ] **M140.** Build the Credentialing Queue UI (F3).
- [ ] **M141.** Build the Bookings Oversight (F4) and Matching Engine Monitor (F5) screens.
- [ ] **M142.** Build the Disputes (F6) and Payments Console (F7) screens.
- [ ] **M143.** Build the Audit Log Viewer (F8), User & Role Management (F9), and Feature Flags (F10) screens.

### Phase 20 — Cross-App Testing
- [ ] **M144.** Set up the Playwright e2e suite (`testing/e2e-web`) covering at least one full cross-app flow (e.g., center blocks a slot → disappears from patient search). *(needs M114–M143)*
- [ ] **M145.** Set up the Detox e2e suite (`testing/e2e-mobile`) covering patient-app and practitioner-app critical paths (login, search, book, pay, accept an offer).
- [ ] **M146.** Set up contract tests (`testing/contract`) validating live API responses against `docs/API_DESIGN.md`, and write the initial `testing/load` k6 script modeling `docs/ARCHITECTURE.md` §2's capacity assumptions.

### Phase 21 — Infrastructure & Deployment (hardest — highest blast radius)
- [ ] **M147.** Write the core Terraform modules (`vpc`, `rds-postgres`, `elasticache-redis`, `s3-storage`, `cdn`, `ecs-service`). *(needs M144–M146 passing against a local/staging-like build)*
- [ ] **M148.** Compose the `staging` environment root module and perform one manual deploy to staging.
- [ ] **M149.** Build the full per-surface CI/CD pipelines (`ci-api`, `ci-web`, `ci-mobile`, `ci-database`, `deploy-staging`, `deploy-production`) with the shared reusable Docker-build action.
- [ ] **M150.** Stand up production infrastructure, deploy behind the approval-gated production pipeline, wire the Grafana dashboards for the North Star/input/guardrail metrics from `docs/PRD.md` §10, and complete the go-live checklist.

---

## Notes on Using This List

- **Phases roughly track difficulty, but the binding constraint is dependency order** — a milestone is never scheduled before something it needs, even where that pushes an "easy" task later than its raw difficulty alone would suggest (e.g., M144's e2e setup is mechanically simple but can't run before the apps it tests exist).
- **This is an MVP-scope path**, ending at a deployed, monitored production system — it does not include Phase 2/3 items explicitly deferred in `docs/PRD.md` §6 and `docs/ARCHITECTURE.md` §13 (peer review, installment payments, NHIS integration, HL7/FHIR hospital integration, AI-assisted triage). Those become their own milestone sets once their own open questions (`docs/SRS.md` §10) are resolved.
- **Legal/regulatory gates are not milestones on this list** — confirming teleradiology's legal status and data-residency requirements (`docs/SRS.md` §10) are prerequisites to *starting* Phase 8/10 in a real production sense, tracked separately since they're not engineering tasks with a fixed time-box.
