# packages/

Shared code consumed by **two or more** apps in `apps/`. Nothing in this directory is independently deployed — every package here is a library, imported via the pnpm workspace, not a running service.

Planned contents:

| Package | Purpose | Consumed by | Milestone |
|---|---|---|---|
| `config` | Shared `tsconfig.base.json`, ESLint config, Prettier config | every app and package | M3 |
| `shared-types` | TypeScript interfaces mirroring the database schema and API contracts | `api`, all frontends | M109 |
| `api-client` | Typed client + React Query hooks for every endpoint in `docs/API_DESIGN.md` | all frontends | M110 |
| `ui-web` | Shared React component library and design tokens (`Button`, `Card`, `StatusPill`, `VerificationBadge`, ...) | `radiologist-portal`, `provider-dashboard`, `admin-panel` | M111 |
| `ui-mobile` | Mobile-native equivalent of `ui-web` | `patient-app`, `practitioner-app` | M112 |
| `mobile-core` | Shared React Native shell: navigation container, secure token storage, offline queue/sync engine | `patient-app`, `practitioner-app` | M113 |

**Rule for adding a new package** (per `docs/FOLDER_STRUCTURE.md` §11): code used by exactly one app stays inside that app until a *second* app needs it — only then does it move here. Extracting shared code before a second consumer exists is a speculative abstraction this project deliberately avoids.

**Why these packages and not others** is explained in `docs/FOLDER_STRUCTURE.md` §2/§4.
