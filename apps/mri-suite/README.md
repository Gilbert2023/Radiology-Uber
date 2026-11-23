# The Bank Hospital – MRI Suite Management System

A departmental platform for the MRI Unit (Radiology Department), The Bank Hospital, Ghana.
It manages the complete seven-stage MRI patient journey – **booking → arrival → MRI safety
screening → preparation → scanning → PACS upload → completion** – together with the implant
& device registry, protocol library, contrast media, equipment QC and maintenance, staff and
duty rostering, incident reporting, infection control, analytics and branded reporting.

> **Demonstration data.** The seeded database contains only synthetic patients (MRNs `DEMO-…`)
> and clearly labelled demo records. Never load real patient data into a demo environment.

| | |
|---|---|
| Stack | Next.js 15 (App Router, React 19, TypeScript), Tailwind CSS, PostgreSQL 14+ (`pg`), Recharts, PDFKit, ExcelJS |
| Scanner & hours | GE SIGNA Creator 1.5T · operates 24/7 · time zone Africa/Accra |
| Integrations | None live. PACS/HIS/SMS etc. are labelled *Not connected* / *Under development*; all workflow works with manual entry |

## Documentation

| Document | Contents |
|---|---|
| **[docs/LAUNCH_GUIDE.md](docs/LAUNCH_GUIDE.md)** | **Go-live on GitHub + Supabase + Vercel, backups and the 10-year maintenance plan** |
| [docs/INSTALLATION.md](docs/INSTALLATION.md) | Prerequisites, environment variables, database setup, migrations, seeding, running locally |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deployment (Docker or Node), HTTPS, backups, disaster recovery, hardening checklist |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | Role-by-role guide to every module |
| [docs/TECHNICAL.md](docs/TECHNICAL.md) | Architecture, data model, workflow state machine, business rules, RBAC, security, integration strategy |
| [docs/TESTING.md](docs/TESTING.md) | Test plan, how to run tests, latest results |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Implementation checklist (done / outstanding), assumptions and open decisions |

## Quick start

```bash
cp .env.example .env            # then edit DATABASE_URL
npm install
npm run db:reset                # migrate + seed synthetic demo data
npm run dev                     # http://localhost:3000
```

Demo accounts (password `Demo@MRI2026`): `supervisor`, `radiographer1`–`5`, `nurse1`–`2`,
`receptionist1`–`2`, `mrso`, `manager`, `admin`.

## Branding

The official Bank Hospital logo is installed at `public/brand/logo.png` (also the browser icon) and
appears in the sidebar, login screen, module headers and every PDF export. The colour scheme is
taken from the logo: charcoal `#2C3135` (lettering) as the base and amber `#FDA900` (ring) as the
accent; the logo red `#ED0000` is reserved so it never competes with clinical alert colours.
Tokens are in `tailwind.config.ts`.

## Appointment audit trail

Every appointment that is entered or changed is saved automatically to an append-only audit trail
by a database trigger: who did it (user and role), when, and each field's before/after value.
View it on each appointment page and under **Patient Management → Appointment Audit Trail**
(filter by date, user, accession/MRN; export to Excel/PDF).
