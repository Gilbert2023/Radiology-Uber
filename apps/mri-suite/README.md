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
| Initial scanner | GE SIGNA Creator 1.5T · time zone Africa/Accra |
| Integrations | None live. PACS/HIS/SMS etc. are labelled *Not connected* / *Under development*; all workflow works with manual entry |

## Documentation

| Document | Contents |
|---|---|
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

## Hospital logo

The official Bank Hospital logo was not available in the repository, so a clearly labelled
**“Logo pending”** placeholder is shown everywhere the logo appears (UI and PDF exports). Place the
approved file at `public/brand/logo.png` (or `logo.svg`; PNG/JPG is required for PDFs) and it is
used automatically. Brand colours are defined in `tailwind.config.ts` (`brand`, `accent`) and
should be aligned with the official logo specification.
