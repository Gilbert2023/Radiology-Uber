# Repository & Folder Structure
## Radiology Uber (Working Title)

**Document version:** 0.1 (Draft for founding-team review)
**Date:** 2026-07-28
**Companion documents:** `docs/SRS.md`, `docs/PRD.md`, `docs/DATABASE_DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/UX_DESIGN.md`, `docs/API_DESIGN.md`
**Scope note:** This is a repository-layout design — folders, their purpose, and the tooling that ties them together. No application code, no file contents beyond the configuration files a repo needs to exist (workspace manifests, Dockerfiles as build recipes, CI pipeline definitions) are written here; those are implementation work once this layout is approved.

---

## 0. Monorepo Rationale (read first — every folder choice below follows from this)

**Choice: a single monorepo containing every app, package, and piece of infrastructure config, managed with pnpm workspaces + Turborepo — not six separate repositories.**

- **Why not a repo per app (patient app, backend, admin panel, etc.):** `docs/ARCHITECTURE.md` §4.3 already committed to sharing TypeScript types between frontend and backend specifically to eliminate an entire class of integration bugs — that sharing mechanism *requires* a monorepo (or a much heavier published-package workflow that's overkill for a team this size). Beyond types, a monorepo lets one pull request touch the API contract (`docs/API_DESIGN.md`), the backend endpoint, and the three frontends that call it, reviewed and merged atomically — a polyrepo setup would spread that same logical change across six PRs that can drift out of sync between merges.
- **Why pnpm workspaces specifically (over npm/Yarn workspaces):** pnpm's content-addressable storage and strict dependency resolution catch "phantom dependency" bugs (a package silently working because some *other* package hoisted a shared dependency) that npm/Yarn's flatter node_modules can hide — worth the marginal tooling-familiarity cost for a project that will run for years.
- **Why Turborepo specifically:** with six deployable apps and several shared packages, a naive "run every app's build/test/lint on every commit" CI pipeline gets slow and expensive fast. Turborepo's task graph understands which packages actually changed and caches the rest — `turbo run build` only rebuilds what a given commit could have affected, which matters immediately, not as a someday optimization, given six deployables from day one.
- **The trade-off, stated honestly:** a monorepo needs more CI/tooling discipline up front (path-based triggering so a mobile-only change doesn't run the whole web test suite, §8) than six independent repos would. That cost is paid once, in the CI configuration described in §8, in exchange for the ongoing cross-cutting-change benefit above — a good trade for a team this size building this many interdependent surfaces.

---

## 1. Root-Level Layout

```
radiology-uber/
├── apps/                   # every independently deployable application
├── packages/               # shared code consumed by two or more apps
├── database/               # migrations, seed data, schema snapshot
├── infrastructure/         # Terraform, Orthanc config, ops scripts
├── docker/                 # Dockerfiles and local-dev compose files
├── testing/                # cross-app e2e, load, and contract tests
├── docs/                   # this document series (SRS, PRD, etc.)
├── scripts/                # repo-wide developer/ops scripts
├── .github/
│   └── workflows/          # CI/CD pipeline definitions
├── package.json            # workspace root manifest
├── pnpm-workspace.yaml      # declares apps/* and packages/* as workspaces
├── turbo.json               # Turborepo task graph (build/test/lint/deploy)
├── tsconfig.base.json        # shared TypeScript compiler config, extended by every app/package
├── .eslintrc.js / .prettierrc # shared lint/format rules
├── .env.example               # documented environment variables (no real secrets, ever)
├── .gitignore
└── README.md                   # orientation for a new engineer; links into docs/
```

**Why `packages/` is a peer of `apps/`, not nested inside it:** this is the standard convention for exactly the reason stated in §0 — code in `packages/` is *shared*, code in `apps/` is *deployed*; keeping them visually and structurally separate makes it immediately obvious, browsing the repo, which folders produce a running service and which only produce libraries other folders consume.

---

## 2. Frontend

Covers the three desktop-first web applications from `docs/ARCHITECTURE.md` §4.3/§4.4 (Next.js/React/TypeScript) plus the packages they share with each other — and, where the code is genuinely platform-agnostic, with the mobile apps in §4 as well.

```
apps/
├── radiologist-portal/         # Web app — docs/UX_DESIGN.md Part C
│   ├── src/
│   │   ├── app/                # Next.js routes: /login, /worklist, /cases/[id], /earnings, /profile
│   │   ├── features/
│   │   │   ├── worklist/       # C2: queue, availability toggle, active offers
│   │   │   ├── case-viewer/    # C3/C4: embedded OHIF viewer + report form + sign confirmation
│   │   │   ├── case-offers/    # C5: notification-landing accept/decline screen
│   │   │   ├── earnings/       # C6
│   │   │   └── credentials/    # C7
│   │   ├── components/         # screens built only from packages/ui-web primitives
│   │   └── lib/                # auth/session wiring, wraps packages/api-client
│   └── public/
│
├── provider-dashboard/          # Web app — docs/UX_DESIGN.md Parts D & E combined
│   ├── src/
│   │   ├── app/
│   │   ├── features/
│   │   │   ├── overview/               # D2 / E2 (role-aware KPI set)
│   │   │   ├── calendar/                # D3 / E3 (role-aware default: open vs. opt-in slots)
│   │   │   ├── order-queue/              # D4 / E4
│   │   │   ├── teleradiology-queue/       # D5 / E5
│   │   │   ├── services-catalog/           # D6 (imaging-center only)
│   │   │   ├── staff/                       # D7 / E6
│   │   │   ├── payouts/                      # D8
│   │   │   ├── facility-settings/             # D9 / E8 (E8 adds RIS/HL7 integration fields)
│   │   │   └── reports-analytics/              # E7 (hospital only)
│   │   └── lib/
│   └── public/
│
├── admin-panel/                  # Web app — docs/UX_DESIGN.md Part F
│   ├── src/
│   │   ├── app/
│   │   ├── features/
│   │   │   ├── dashboard/        # F2 — North Star + input + guardrail metrics
│   │   │   ├── credentialing/     # F3
│   │   │   ├── bookings-oversight/ # F4
│   │   │   ├── matching-monitor/    # F5
│   │   │   ├── disputes/             # F6
│   │   │   ├── payments-console/      # F7
│   │   │   ├── audit-log/              # F8
│   │   │   ├── user-management/         # F9
│   │   │   └── feature-flags/            # F10
│   │   └── lib/
│   └── public/
```

**Why `provider-dashboard` is one app serving both imaging centers and hospitals, not two:** `docs/UX_DESIGN.md` Part E was explicitly written as "shares its structural bones with... Part D — most screens... described only where they meaningfully differ." Building two separate applications for ~80%-identical screens would mean every shared bug fix and design update gets done twice and drifts apart over time. A single app with role-aware rendering (reading the logged-in staff member's facility's `facility_type` and `staff_role`, per `docs/DATABASE_DESIGN.md` §3.2/§3.3, to decide which variant of a shared feature to show — e.g., Calendar's open-by-default vs. opt-in-by-default slot visibility from the UX spec) captures the real overlap while still expressing the genuine differences (E3's opt-in model, E7's analytics screen, E8's integration settings) as additive features within the same codebase rather than forked logic.

**Why `admin-panel` is its own separate app, not folded into `provider-dashboard`:** unlike the center/hospital split, the Admin Panel serves an entirely different audience (internal Ops/Finance/Support staff, `docs/DATABASE_DESIGN.md` §2.11) with materially higher-privilege access (credentialing approval, user suspension, audit logs) — keeping it a separate deployable means its build, its access controls, and its deployment cadence are fully independent of provider-facing surfaces, and a vulnerability or outage in one can never directly implicate the other's codebase.

```
packages/
├── ui-web/                  # shared React component library for the three web apps above
│   ├── src/components/       # Button, Card, StatusPill, VerificationBadge, DataTable, ConfirmDialog, ...
│   └── src/tokens/            # colors, spacing, typography — the single source for cross-app visual consistency
│
├── api-client/                # typed client for every endpoint in docs/API_DESIGN.md
│   ├── src/resources/           # one file per API domain (bookings.ts, payments.ts, matching.ts, ...)
│   ├── src/hooks/                # React Query hooks wrapping each resource, shared by web AND mobile
│   └── src/errors.ts              # maps the { error: { code, message } } envelope (API_DESIGN §0.4) to typed exceptions
│
├── shared-types/                 # TypeScript interfaces for every resource shape (Booking, Facility, Report, ...)
│                                  # generated from database/schema (§5) wherever possible, hand-maintained otherwise
│
└── config/                        # shared tsconfig, eslint, prettier, jest base configs extended by every app/package
```

**Why `StatusPill`/`VerificationBadge` live in `ui-web` as named, first-class components rather than being re-implemented per app:** these are the exact components carrying the cross-app consistency commitments `docs/UX_DESIGN.md`'s closing appendix insists on — the same booking-status color coding across the patient app, provider dashboards, and (via `ui-mobile`, §4) the practitioner app. Putting them in one shared package makes "keep these consistent" a property of the code (one component, one place to update) rather than a policy three separate teams have to remember to honor.

---

## 3. Backend

The "Core API — Modular Monolith" from `docs/ARCHITECTURE.md` §3/§5, built on NestJS/TypeScript, with its internal module boundaries mirroring `docs/DATABASE_DESIGN.md` §2–§10 exactly.

> **Amendment (2026-08-15, approved):** each domain module below is internally structured as **Clean Architecture layers** (`domain/` → `application/` → `infrastructure/`/`interface/`, dependencies pointing inward only), superseding the flatter `controllers/services/entities/dto` layout originally written here. This is a refinement of *how a module is organized internally* — it does **not** change the module boundaries themselves (still one module per `docs/DATABASE_DESIGN.md` domain), the modular-monolith-vs-microservices decision, the `main.ts`/`worker.ts` split, or any other architectural decision in `docs/ARCHITECTURE.md`. Recorded here explicitly per the standing rule that architecture is never changed without approval.

```
apps/
└── api/
    ├── src/
    │   ├── main.ts                # HTTP server bootstrap — the deployable most requests hit
    │   ├── worker.ts               # background-worker bootstrap — same modules, different entrypoint (see below)
    │   ├── app.module.ts            # root module, imports every domain module
    │   ├── modules/
    │   │   ├── identity/             # users, roles, all practitioner profiles, credential documents, admin profiles
    │   │   │   ├── domain/             # LAYER 1 (innermost, no dependencies on anything below):
    │   │   │   │                         entities (plain TS classes — no ORM/NestJS decorators), value objects,
    │   │   │   │                         domain errors, and repository INTERFACES (ports) — e.g. UserRepository
    │   │   │   ├── application/          # LAYER 2 (depends only on domain/): use cases — one class per business
    │   │   │   │                           operation (e.g. RequestOtpUseCase, VerifyOtpUseCase), plus outbound
    │   │   │   │                           port interfaces the use case needs (e.g. SmsGatewayPort) — no NestJS,
    │   │   │   │                           no Prisma, no HTTP types anywhere in this layer
    │   │   │   ├── infrastructure/         # LAYER 3 (depends on domain/ + application/, implements their ports):
    │   │   │   │                             Prisma repository implementations, concrete adapters (SMS gateway
    │   │   │   │                             client, object-storage client) — the ONLY layer allowed to import Prisma
    │   │   │   ├── interface/                # LAYER 4 (depends on application/): NestJS controllers (thin — parse
    │   │   │   │                               request, call a use case, map result to response), request/response
    │   │   │   │                               DTOs matching API_DESIGN §3, NestJS-specific wiring
    │   │   │   └── identity.module.ts          # NestJS DI wiring: binds each domain/application port interface
    │   │   │                                     to its infrastructure/ implementation
    │   │   ├── facilities/                # same four-layer structure — facilities, staff, equipment, services, slots
    │   │   ├── bookings/                   # same four-layer structure — referrals, bookings, status history
    │   │   ├── imaging/                      # same four-layer structure — studies, reports, addenda
    │   │   ├── matching/                       # same four-layer structure — match requests/offers
    │   │   ├── payments/                         # same four-layer structure — payments, payouts, commission ledger
    │   │   ├── trust/                              # same four-layer structure — ratings, disputes
    │   │   ├── compliance/                           # same four-layer structure — consent records, audit logs
    │   │   └── notifications/                          # same four-layer structure — device tokens, dispatch
    │   ├── common/
    │   │   ├── guards/                 # JWT auth guard, RBAC role guard, live-verification-status guard
    │   │   ├── interceptors/            # audit-log-writing interceptor (attached to every clinical-data read)
    │   │   ├── filters/                   # global exception filter → the { error: {...} } envelope (API_DESIGN §0.4)
    │   │   └── decorators/                  # @CurrentUser(), @RequireRole(), @RequireVerifiedPractitioner()
    │   └── config/                            # typed environment configuration module
    └── test/                                    # integration/e2e tests specific to this app (see §7 for the boundary)
```

**Why `main.ts` and `worker.ts` as two entrypoints into the same `modules/` tree, rather than a separate `apps/worker`:** `docs/ARCHITECTURE.md` §5.4 describes background job processing (the SLA-breach scanner, payout batching, credential-expiry checks, notification retries — `docs/DATABASE_DESIGN.md`-backed jobs) as part of the same modular monolith, sharing the same Redis infrastructure and the same business logic (a payout batch job needs the exact same payment-domain service code an HTTP request would use). Splitting it into a genuinely separate `apps/worker` would either duplicate that service code or force an awkward internal-package extraction with no real benefit yet. Two bootstrap files sharing one `modules/` tree gets the real operational win — **the API and the worker can still be deployed and scaled as two separate Docker images/processes** (§9) — without splitting code that has no reason to be split. This is the same "boundaries in code before boundaries in infrastructure" principle `docs/ARCHITECTURE.md` §1 states for the monolith-vs-microservices decision, applied one level down.

**Why each domain module has its own four-layer structure rather than one flat `src/controllers`, `src/services` etc. across the whole app:** grouping by domain (not by technical layer, at the top level) is what makes "extract Imaging & Reporting into its own service later" (the specific candidate `docs/ARCHITECTURE.md` §16 names) a matter of moving one folder, not hunting across the codebase for every file that happens to touch studies/reports — that reasoning is unchanged from the original version of this document.

**Why Clean Architecture layers *within* each module (the amendment):** the dependency rule — `interface/` and `infrastructure/` depend inward on `application/` and `domain/`, never the reverse — buys three concrete things this project needs given its stated trajectory toward millions of users and its regulated-data stakes: (1) **testability without a database** — a use case like `SubmitReportUseCase` (§9's immutability logic) can be unit-tested against an in-memory fake implementing the `ReportRepository` port, with no Postgres, no NestJS test module, no network — fast enough to run on every keystroke; (2) **the domain rules that matter most are framework-independent** — the report-immutability rule, the slot-capacity invariant, the booking-status state machine live in `domain/`/`application/` as plain TypeScript, so a future decision to change ORM, split a module into its own service (§16), or even swap NestJS itself touches `infrastructure/`/`interface/` only, never the business rules; (3) **it forces the Dependency Inversion half of SOLID at a structural level** — a use case depends on a `PaymentGatewayPort` interface it owns, not on the Paystack SDK directly, so swapping or mocking the payment provider never touches business logic. The cost — more files per module, an extra mapping step between domain entities and Prisma models — is accepted deliberately for the modules where it matters most (`bookings`, `imaging`, `matching`, `payments`) and applied uniformly to every module for consistency, per the "no special-cased module" principle already established in `docs/ARCHITECTURE.md` §1.

---

## 4. Mobile

The two React Native apps from `docs/ARCHITECTURE.md` §4.1/§4.4, plus the shared package that gives them (and, per §4's `ui-mobile` note, potentially any future mobile surface) a consistent foundation.

```
apps/
├── patient-app/                    # docs/UX_DESIGN.md Part A — consumer-facing, its own app-store listing
│   ├── src/
│   │   ├── screens/
│   │   │   ├── Login/               # A1
│   │   │   ├── Home/                 # A2
│   │   │   ├── Search/                # A3
│   │   │   ├── Booking/                # A4 (the 4-step wizard as one screen's internal state machine)
│   │   │   ├── Payment/                 # A5
│   │   │   ├── Tracking/                 # A6
│   │   │   ├── Reports/                   # A7
│   │   │   └── Profile/                    # A8
│   │   ├── navigation/                       # stack/tab navigators, deep-link handling for notification landing
│   │   ├── offline/                            # local queue + sync engine (ARCHITECTURE §4.1 offline tolerance)
│   │   └── lib/                                  # wraps packages/api-client + packages/mobile-core
│   └── assets/
│
└── practitioner-app/                 # docs/UX_DESIGN.md Part B (Radiographer) + the mobile portion of Part C
    ├── src/                            # (Radiologist worklist/offers/availability/earnings — see rationale below)
    │   ├── screens/
    │   │   ├── Login/                   # B1 / C1
    │   │   ├── Home/                     # B2 (radiographer) and C2's mobile companion view (radiologist)
    │   │   ├── ShiftMarketplace/           # B3 — radiographer only
    │   │   ├── StudyWorkflow/               # B4 — radiographer only
    │   │   ├── CaseOffer/                     # C5 — radiologist (and B3's shift-offer equivalent)
    │   │   ├── Earnings/                        # B5 / C6
    │   │   └── Profile/                           # B6 / C7
    │   ├── navigation/                              # role-aware: nav stack differs by radiographer vs. radiologist
    │   └── lib/
    └── assets/
```

**Why `practitioner-app` is one binary for both radiographers and radiologists, rather than a third separate app:** `docs/ARCHITECTURE.md` §4.4 already established that the radiologist's mobile presence is a "lightweight... module reusing the patient app's mobile shell" for worklist/availability/offer-notification functionality — the full DICOM case-viewer/reporting work (C3/C4) stays desktop-only regardless. This document makes that reuse concrete: rather than folding radiologist screens into the *patient-facing* app (a confusing product decision — a consumer downloading "Radiology Uber" shouldn't find a hidden professional mode), the two credentialed-practitioner roles share one app, using the same role-aware-codebase pattern already applied to `provider-dashboard` in §2. A radiographer and a radiologist have near-identical mobile needs (see an offer, accept/decline, toggle availability, check earnings) with only the radiographer needing the additional in-facility Study Workflow screen — one app with role-conditional navigation captures that overlap the same way `provider-dashboard` does for imaging centers vs. hospitals.

```
packages/
├── mobile-core/                # the actual shared "shell" — navigation container, secure token storage,
│                                 # FCM push registration, the offline queue/sync engine, API client wiring
└── ui-mobile/                   # shared RN component library — mobile counterpart to ui-web (§2), same
                                  # cross-app-consistency rationale (status pills, trust badges, form primitives)
```

---

## 5. Database

Migrations, seed data, and a maintained snapshot of the schema designed in `docs/DATABASE_DESIGN.md`.

```
database/
├── migrations/               # versioned migration files, applied in the exact order from DATABASE_DESIGN §11.4:
│                               # 001_extensions_and_enums, 002_users_and_roles, 003_profiles, 004_facilities, ...
├── seeds/
│   ├── reference/              # always-run reference data: modalities (§3.1), Ghana regions — identical in
│   │                            # every environment including production
│   └── dev-fixtures/             # local/staging-only sample data (test facilities, dummy patients) —
│                                  # never runs against production, kept in a separate folder specifically
│                                  # so a CI/deploy script can trivially exclude it by path
└── schema/
    └── schema.prisma (or schema.sql)   # a committed, CI-regenerated snapshot of the live schema —
                                          # the reviewable artifact docs/DATABASE_DESIGN.md's tables map onto,
                                          # kept in sync automatically (§8) so it can never silently drift
                                          # from what the migrations actually produce
```

**Why Prisma is the recommended migration/ORM tool (a concrete choice this document adds, not fixed in `docs/ARCHITECTURE.md`):** given the architecture's TypeScript-everywhere principle (`docs/ARCHITECTURE.md` §5.1), Prisma's generated TypeScript client and schema-first workflow feeds directly into `packages/shared-types` (§2) with minimal hand-maintenance — a schema change in one file propagates typed models to `apps/api` and, via the shared package, to every frontend, which is precisely the type-sharing benefit the monorepo (§0) exists to capture. This is flagged explicitly as an implementation choice this document is making (not one `docs/ARCHITECTURE.md` committed to), open to revisiting if a specific migration-tooling need argues otherwise.

**Why `dev-fixtures/` is a separate folder from `reference/` rather than one `seeds/` directory:** these have fundamentally different blast radii — reference data is safe (indeed required) to run against production, while fixture data must never touch it. Separating them by folder path, rather than by a flag inside a shared script, makes it structurally harder for a deploy script to run the wrong one by mistake.

---

## 6. Infrastructure

Terraform and the operational configuration for the self-hosted, non-generic-app pieces of the platform (`docs/ARCHITECTURE.md` §7/§11/§14).

```
infrastructure/
├── terraform/
│   ├── modules/                  # one reusable module per infrastructure primitive:
│   │   ├── vpc/                    # network layout, public/private subnets (ARCHITECTURE §15's segmentation)
│   │   ├── ecs-service/              # a parameterized ECS/Fargate service (used for api, worker, and each web app)
│   │   ├── rds-postgres/               # primary + read replica configuration (ARCHITECTURE §7.1)
│   │   ├── elasticache-redis/            # cache/queue/event-bus infrastructure (ARCHITECTURE §7.2/§5.4)
│   │   ├── s3-storage/                     # object storage buckets + lifecycle policies (ARCHITECTURE §7.3)
│   │   └── cdn/                              # CDN distribution in front of the storage/report-delivery bucket
│   └── environments/
│       ├── dev/                    # composes the modules above with dev-sized instances/variables
│       ├── staging/                  # mirrors production topology at smaller scale, for realistic pre-release testing
│       └── production/                 # the live environment — its own Terraform state, isolated from the others
│
├── orthanc/                      # PACS server configuration (docs/ARCHITECTURE.md §11) — kept separate from
│   ├── orthanc.json.template       # terraform/ since it's application-level config for a specific piece of
│   └── s3-plugin-config/            # self-hosted software, not a cloud-provider resource definition
│
└── scripts/                      # ops scripts run by a human, not the deploy pipeline: manual payment
                                     # reconciliation runner, backup-restore verification, credential re-check job trigger
```

**Why `environments/{dev,staging,production}` are separate Terraform root modules rather than one config with environment variables/conditionals:** this is a blast-radius decision, not a style preference — separate root modules mean separate Terraform state files, so a `terraform apply` run against `dev` has no code path that can accidentally reach production's state. Given this platform holds regulated medical data (`docs/SRS.md` §5, §8), that isolation is worth the modest duplication cost of three environment folders each composing the same underlying modules.

---

## 7. Testing

Cross-cutting test suites that don't belong to any single app. **Unit tests are deliberately *not* here** — they live colocated with the code they test (e.g., `apps/api/src/modules/bookings/bookings.service.spec.ts`, `apps/patient-app/src/screens/Booking/Booking.test.tsx`), because a unit test's value depends on staying next to the implementation it exercises and moving in the same PR when that code changes. This top-level folder is reserved for tests that inherently span more than one app or aren't unit-shaped at all.

```
testing/
├── e2e-web/                  # Playwright — flows spanning multiple web apps, e.g. "center admin blocks a
│                                slot for maintenance in provider-dashboard → it disappears from the patient
│                                app's search results" — no single app's own test suite can verify this alone
├── e2e-mobile/                # Detox (or equivalent RN e2e framework) — critical patient-app and
│                                practitioner-app flows: login, search, book, pay, accept an offer
├── contract/                    # validates apps/api's actual live responses against the schemas implied by
│                                  docs/API_DESIGN.md — catches API drift from the documented contract before
│                                  it reaches a frontend team relying on that contract
├── load/                          # k6 (or Artillery) scripts modeling the capacity assumptions in
│                                    docs/ARCHITECTURE.md §2 — booking throughput, concurrent search load —
│                                    so "this scales to 1M users" is a checkable, run-on-demand result,
│                                    not just an assertion left inside a design document
└── fixtures/                        # shared factory/seed data used by more than one suite above (a
                                        "verified radiologist," a "confirmed booking") so integration/e2e
                                        tests don't each invent slightly different ad hoc test data
```

**Why `contract/` is its own category, distinct from `e2e-web`:** an e2e test checks that a *user flow* works; a contract test checks that the *API shape itself* still matches what `docs/API_DESIGN.md` promises every frontend team is building against — these fail for different reasons and are useful to distinguish in CI output (a contract-test failure means "the API changed and someone needs to update the docs or the client," an e2e failure means "a real user flow broke").

---

## 8. CI/CD

GitHub Actions (`docs/ARCHITECTURE.md` §14's choice), designed specifically around the monorepo's need for path-based selectivity (§0's stated trade-off).

```
.github/
└── workflows/
    ├── ci-api.yml               # triggered on changes under apps/api/** or packages/shared-types/**, etc.
    │                              — lint, unit test, integration test (against a CI-spun-up Postgres/Redis)
    ├── ci-web.yml                 # triggered on changes under apps/{radiologist-portal,provider-dashboard,
    │                                admin-panel}/** or packages/{ui-web,api-client}/** — matrixed across the
    │                                three apps so each gets its own pass/fail status, not one combined result
    ├── ci-mobile.yml                # triggered on apps/{patient-app,practitioner-app}/** or packages/
    │                                  {ui-mobile,mobile-core}/** — lint, unit test, and a native build check
    ├── ci-database.yml                # triggered on database/migrations/** — applies every migration against
    │                                    a fresh Postgres instance in CI (catching a broken migration before
    │                                    merge) and regenerates database/schema/ (§5) to prevent drift
    ├── deploy-staging.yml               # on merge to main: builds/pushes the relevant Docker images (§9),
    │                                      runs `terraform apply` against infrastructure/terraform/environments/
    │                                      staging, then runs testing/e2e-web + e2e-mobile as a release gate
    ├── deploy-production.yml              # manually-approval-gated promotion of a specific, already-staging-
    │                                        tested image/commit to production — never an automatic follow-on
    │                                        from staging, given the regulated-data stakes (docs/SRS.md §5.7)
    └── reusable/
        └── build-and-push-image.yml         # a composite action used by every ci-*/deploy-* workflow that
                                                needs to build a Docker image, so the build steps are defined
                                                once (§9's Dockerfiles referenced from exactly one place)
```

**Why per-surface CI workflows (`ci-api`, `ci-web`, `ci-mobile`, `ci-database`) rather than one giant `ci.yml`:** combined with Turborepo's own change-detection (§0), path-triggered separate workflows mean a mobile-only PR never waits on (or risks being blocked by) an unrelated flaky web test — each surface gets independent, fast feedback, which matters more as the number of apps in this monorepo grows, not less.

---

## 9. Docker

Container build recipes and the local-development environment.

```
docker/
├── api.Dockerfile              # multi-stage build of apps/api, CMD ["node", "dist/main.js"] (the HTTP server)
├── worker.Dockerfile             # identical build stage from the SAME apps/api source, CMD ["node",
│                                   "dist/worker.js"] instead — built from one source tree, two images,
│                                   directly reflecting the main.ts/worker.ts split explained in §3
├── web.Dockerfile                  # one parameterized Dockerfile (build arg selects which of
│                                     radiologist-portal / provider-dashboard / admin-panel to build) —
│                                     reused three times rather than maintained as three near-duplicate files
├── docker-compose.yml                # local dev stack: postgres, redis, orthanc, and mock SMS/payment
│                                       providers — so a new engineer runs the entire backend dependency
│                                       set with one command, without needing real Africa's Talking/Paystack
│                                       sandbox credentials just to start developing
├── docker-compose.override.yml         # local-only additions layered on top (hot-reload volume mounts,
│                                         exposed debugger ports) — kept separate so docker-compose.yml
│                                         alone stays a reasonably faithful reflection of production topology
└── .dockerignore                        # excludes node_modules, .git, docs/, and other non-build-context
                                           files, keeping images smaller and builds faster
```

**Why one `web.Dockerfile` with a build argument rather than three separate files:** the three Next.js apps in §2 are built identically (install → build → run) and differ only in *which* app's `apps/<name>` path gets built — three copies of the same recipe would be exactly the kind of duplication that drifts (someone updates the Node version in one and forgets the other two); one parameterized file makes that structurally impossible.

---

## 10. Full Consolidated Tree (Reference)

```
radiology-uber/
├── apps/
│   ├── api/                      # NestJS backend (HTTP + worker entrypoints) — §3
│   ├── patient-app/                # React Native — §4
│   ├── practitioner-app/             # React Native (radiographer + radiologist mobile) — §4
│   ├── radiologist-portal/             # Next.js — §2
│   ├── provider-dashboard/               # Next.js (imaging center + hospital) — §2
│   └── admin-panel/                        # Next.js — §2
├── packages/
│   ├── shared-types/               # §2
│   ├── api-client/                   # §2
│   ├── ui-web/                         # §2
│   ├── ui-mobile/                        # §4
│   ├── mobile-core/                        # §4
│   └── config/                               # §2
├── database/
│   ├── migrations/                 # §5
│   ├── seeds/{reference,dev-fixtures}/  # §5
│   └── schema/                       # §5
├── infrastructure/
│   ├── terraform/{modules,environments}/  # §6
│   ├── orthanc/                     # §6
│   └── scripts/                       # §6
├── docker/                            # §9
├── testing/{e2e-web,e2e-mobile,contract,load,fixtures}/  # §7
├── .github/workflows/                    # §8
├── docs/                                    # SRS, PRD, DATABASE_DESIGN, ARCHITECTURE, UX_DESIGN, API_DESIGN, this file
├── scripts/                                    # repo-wide dev bootstrap, db reset, codegen triggers
├── package.json / pnpm-workspace.yaml / turbo.json / tsconfig.base.json / .eslintrc.js / .env.example / README.md
```

---

## 11. Naming & Convention Notes

- **Every app under `apps/` is independently versioned and deployable**; every package under `packages/` is a library with no deployment of its own — this distinction (§1) is the first thing to check when deciding where new code belongs.
- **A new shared component or utility used by exactly one app stays inside that app** until a *second* app needs it — only then does it move to `packages/`. Extracting shared code preemptively (before a second consumer exists) is exactly the kind of speculative abstraction this whole document series has consistently avoided (`docs/DATABASE_DESIGN.md` §11.3, `docs/ARCHITECTURE.md` §16's trigger-based scaling philosophy applied here to code organization).
- **Domain module names inside `apps/api/src/modules/` are permanent identifiers.** Renaming `bookings` to something else later is a larger-than-it-looks change (imports, path aliases, CI path triggers in §8 all reference it) — treated with the same "stable identifier" discipline `docs/DATABASE_DESIGN.md` §3 applied to functional requirement IDs.

---

## 12. Approval

Requires sign-off from Head of Engineering — the same gating role as the architecture document this layout directly implements — before the first commit lands in any `apps/` or `packages/` folder.

| Reviewer | Role | Status |
|---|---|---|
| — | Head of Engineering | Pending |
