# Installation & configuration

## Prerequisites
- Node.js 20 or 22 LTS and npm
- PostgreSQL 14 or later (uses `pgcrypto`, `citext`, `btree_gist` – all bundled with PostgreSQL)
- For the browser end-to-end test only: Playwright with Chromium

## 1. Database

```sql
CREATE ROLE mri LOGIN PASSWORD 'change-me';
CREATE DATABASE mri_suite OWNER mri;
CREATE DATABASE mri_suite_test OWNER mri;   -- only needed for automated tests
```
The `mri` role must own the database (migrations create extensions and an exclusion constraint).
If your PostgreSQL forbids non-superusers creating extensions, run once as a superuser in
each database: `CREATE EXTENSION pgcrypto; CREATE EXTENSION citext; CREATE EXTENSION btree_gist;`

## 2. Environment variables (`.env`)

| Variable | Purpose | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (add `?sslmode=require` in production) | `postgres://mri:pw@db:5432/mri_suite` |
| `TEST_DATABASE_URL` | Database **wiped** by the automated tests | `postgres://mri:pw@localhost:5432/mri_suite_test` |
| `UPLOAD_DIR` | Directory for uploaded documents – must be outside `public/`, backed up, not web-served | `/var/lib/mri-suite/uploads` |
| `SESSION_MAX_AGE_MINUTES` | Absolute session lifetime | `720` |
| `COOKIE_SECURE` | `true` behind HTTPS (marks session cookie Secure) | `true` |

Idle timeout, alert thresholds, operating hours and upload size limit are configured in the
application under **Administration → System Settings** (stored in the `settings` table).

## 3. Migrations and seed data

```bash
npm install
npm run db:migrate                      # applies db/migrations/*.sql in order (idempotent, tracked in schema_migrations)
npx tsx scripts/seed.ts --reference-only   # PRODUCTION: reference data + one 'admin' user (must change password)
npm run db:seed                         # DEMO: reference data + synthetic demonstration data
npm run db:reset                        # DEMO ONLY: drop everything, migrate, seed demo data
```

Reference data includes roles & permissions, the GE SIGNA Creator 1.5T scanner profile,
examination types, draft preparation protocols, implant categories, QC parameters
(without thresholds), cleaning areas and integration placeholders.

**Never run `db:reset` against a database holding real data.**

New migrations: add `db/migrations/NNN_description.sql` (forward-only); they are applied in
filename order inside a transaction.

## 4. Run

```bash
npm run dev            # development
npm run build && npm start   # production mode on port 3000
```

## 5. First-time configuration checklist (production)
1. Sign in as `admin`, change the password, create named user accounts and link them to staff records.
2. System Settings: operating hours default to 24/7 – confirm them and the alert thresholds; enter the scanner serial number and installation date.
3. The official logo is already installed (`public/brand/logo.png`).
4. MRI Supervisor: review and approve preparation protocols; enter real sequence parameters into the protocol library and approve.
5. Configure QC acceptance thresholds only from GE documentation / approved departmental standards (each limit requires a documented source).
6. Enter contrast agents, batches and reorder levels.
