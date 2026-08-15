# apps/

This directory holds every **independently deployable application** in the Radiology Uber platform. Each subdirectory is a complete, independently buildable and deployable unit with its own `package.json`, build output, and (per `docs/FOLDER_STRUCTURE.md` §8) its own CI pipeline and Docker image.

Planned contents (scaffolded incrementally, one per milestone in `docs/MILESTONES.md`):

| App | Stack | Serves | Milestone |
|---|---|---|---|
| `api` | NestJS / TypeScript | Core backend — HTTP server (`main.ts`) and background worker (`worker.ts`) sharing one module tree | M30 |
| `patient-app` | React Native | Patients booking and tracking imaging (`docs/UX_DESIGN.md` Part A) | M114 |
| `practitioner-app` | React Native | Radiographers and radiologists' mobile worklist/shift/earnings needs (Parts B and part of C) | M123 |
| `radiologist-portal` | Next.js | Radiologist case viewing and reporting (Part C, desktop) | M128 |
| `provider-dashboard` | Next.js | Imaging center and hospital staff (Parts D and E, one role-aware codebase) | M133 |
| `admin-panel` | Next.js | Internal Ops/Finance/Support staff (Part F) | M139 |

**Why these boundaries and not others** (e.g., why `provider-dashboard` serves two personas, why `practitioner-app` serves two roles, why the API's worker is a second entrypoint rather than a separate app) is explained in full in `docs/FOLDER_STRUCTURE.md` §2–§4.

Nothing is deployed directly from this README — it exists purely as an orientation point for anyone landing in this directory before any app has been scaffolded yet.
