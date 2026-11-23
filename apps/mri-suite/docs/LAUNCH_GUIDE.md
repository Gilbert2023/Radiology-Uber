# Launch guide – GitHub + Supabase + Vercel (planned life: 10 years)

This guide takes the MRI Suite from the GitHub repository to a live, secure website.
Budget about half a day. You need a computer with Node.js 22 and Git installed.

```
GitHub (code)  ──push──►  Vercel (website, London lhr1)  ──TLS──►  Supabase (PostgreSQL + private file storage, London)
      ▲                                                                          │
      └── CI tests run on every change                     daily backups + monthly off-site export
```

---

## 0. Decisions before you start (important for a 10-year system)

| Decision | Recommendation | Why |
|---|---|---|
| Who owns the accounts | Create **organisation/team accounts owned by The Bank Hospital** (a shared IT mailbox such as `it-systems@…`), with at least **two** administrators. | People leave over 10 years; personal accounts would lock you out. |
| Plans | **Vercel Pro** and **Supabase Pro**, plus Supabase **Point-in-Time Recovery** add-on. | Vercel's free Hobby plan does not allow commercial/organisational use. Supabase free projects pause when idle and have no restorable backups. Check current pricing on both sites. |
| Region | Supabase **London (eu-west-2)** + Vercel **London (lhr1)** – already set in `vercel.json`. | Both in the same city keeps the site fast. Supabase has no West African region. |
| Data protection | Before entering real patients: Data Protection Officer sign-off on cross-border hosting (Ghana **Act 843**), registration with the Data Protection Commission, and signed Data Processing Agreements with Supabase and Vercel. | Patient data will be stored outside Ghana. |
| Domain | e.g. `mri.thebankhospital.com`, renewed for 10 years with auto-renew on. | Stable address for staff. |

---

## 1. GitHub – put the code on the main branch

The application is on branch `claude/bank-hospital-mri-system-pxsvyz` in `Gilbert2023/Radiology-Uber`.

1. On GitHub, open **Pull requests → New pull request**, base `main`, compare `claude/bank-hospital-mri-system-pxsvyz`. Create and **merge** it.
2. **Settings → Branches → Add branch protection rule** for `main`: require a pull request and require the **MRI Suite CI** check to pass. This stops untested changes reaching the hospital.
3. Keep the repository **private**. Add a second administrator under **Settings → Collaborators**.
4. CI (`.github/workflows/mri-suite-ci.yml`) runs type checks, 32 automated tests and a production build on every change. Dependabot (`.github/dependabot.yml`) opens a monthly pull request for library updates.

## 2. Supabase – database and file storage

1. Go to supabase.com → **New project**. Organisation: the hospital's. Name `tbh-mri-suite`. Region **London (eu-west-2)**. Generate a **strong database password** and store it in the hospital password manager.
2. Upgrade the organisation to **Pro**. In **Project Settings → Add-ons**, enable **Point in Time Recovery**.
3. **Project Settings → Data API**: turn the Data API **off** (or remove `public` from the exposed schemas). The app does not use it. As a second layer, the app's setup also enables row-level security on every table and removes all public API access.
4. Collect these values:
   - **Project Settings → Database → Connection string**:
     - **Transaction pooler** URI (port **6543**) – for Vercel.
     - **Session pooler** URI (port **5432**) – for running setup from your computer.
   - **Project Settings → Database → SSL Configuration → Download certificate** – the CA certificate.
   - **Project Settings → API keys**: the **Project URL** and the **service_role** secret key. This key is secret: never put it in browser code or e-mail it.

## 3. Prepare the database (once, from your computer)

```bash
git clone https://github.com/Gilbert2023/Radiology-Uber.git
cd Radiology-Uber/apps/mri-suite
npm ci
```

Create `apps/mri-suite/.env` (this file is never committed). Use the **session pooler** URL here:

```
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-eu-west-2.pooler.supabase.com:5432/postgres
DATABASE_SSL=require
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

Then run:

```bash
npm run setup:production
```

This command:
1. Creates all tables (migrations 001–003) and locks down the public API.
2. Loads reference data only: roles, the GE SIGNA Creator 1.5T scanner, examination types, implant categories and a single `admin` account. It loads **no demo patients**.
3. Creates the private storage bucket `mri-documents`.

Never run `npm run db:reset` or `npm run db:seed` against Supabase. They are for demonstration databases, and the reset refuses to run against Supabase.

## 4. Vercel – the website

1. vercel.com → hospital team → **Add New → Project** → import `Gilbert2023/Radiology-Uber`.
2. **Root Directory**: `apps/mri-suite`. Framework: Next.js (auto-detected).
3. **Environment Variables** (Production) – use the **transaction pooler** URL here:

| Name | Value |
|---|---|
| `DATABASE_URL` | `postgresql://postgres.<ref>:<password>@aws-0-eu-west-2.pooler.supabase.com:6543/postgres` |
| `DATABASE_CA_CERT` | full contents of the downloaded certificate (recommended – verifies the server)… |
| `DATABASE_SSL` | …or `require` if you skip the certificate |
| `DATABASE_POOL_MAX` | `3` |
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (mark as **Sensitive**) |
| `COOKIE_SECURE` | `true` |

4. **Deploy**. When it finishes, open the URL. `https://<your-site>/api/health` should show `{"status":"ok","db":"ok"}`.
5. **Settings → Domains**: add `mri.thebankhospital.com` and create the DNS record Vercel shows you. HTTPS is automatic.
6. **Settings → Deployment Protection**: keep Preview deployments protected, so test builds are not public.

From now on, every merge to `main` deploys automatically. You can roll back instantly in **Vercel → Deployments → ⋯ → Promote** on an earlier deployment.

## 5. First sign-in and go-live checklist

1. Sign in as `admin` / `Demo@MRI2026`. You are forced to set a new password immediately.
2. **User Management**: create a named account for every staff member and link each to their staff record. Never share accounts. Give admin rights to at least two people.
3. **System Settings**: confirm 24/7 hours and the alert thresholds. Enter the scanner serial number and installation date under **Scanners**.
4. MRI Supervisor:
   - Approve the preparation protocols.
   - Enter the real sequence parameters in the Protocol Library and approve them.
   - Set QC thresholds only from GE or departmental documents.
   - Enter contrast agents and stock.
5. Pilot with a small group for 2 weeks. Run paper backup screening forms in parallel. Then go live.

## 6. Backups – do not rely on one copy

| What | How | Frequency |
|---|---|---|
| Database | Supabase daily backups + Point-in-Time Recovery (automatic) | continuous |
| Off-site copy | `pg_dump -Fc "<session pooler URL>" > tbh-mri-YYYY-MM.dump`, saved to encrypted hospital storage | **monthly** |
| Documents | Download the `mri-documents` bucket (Supabase dashboard or CLI) to hospital storage | monthly |
| Restore test | Restore last month's dump into a scratch Supabase project and open the site against it | **every 6 months** |

The off-site copy means the hospital still has its data even if a supplier changes terms or closes during the 10 years. The app is ordinary Next.js + PostgreSQL, so it can move to any other host (see `DEPLOYMENT.md`, Docker) without rewriting.

## 7. Keeping it healthy for 10 years

| When | Task | Who |
|---|---|---|
| Daily | Glance at Command Centre alerts; PACS exceptions resolved | MRI Supervisor |
| Monthly | Review/merge Dependabot pull requests once CI is green; off-site backup; review Audit Logs & Appointment Audit Trail; remove leavers' accounts | IT + Supervisor |
| Every 6 months | Restore test; review roles & permissions; rotate the database password and service_role key (update Vercel variables, redeploy) | IT |
| Yearly | Security review; renew domain; confirm Vercel/Supabase plans, region and DPAs; update this guide | IT + DPO |
| Every ~2 years | **Node.js LTS upgrade** (Node 22 support ends April 2027 → move to Node 24, then 26…) and **Next.js major upgrade**. Do these on a branch and let CI prove them before merging. | Developer |
| As needed | New scanners, examination types, staff, hospitals – all configurable in the app; schema changes via new migration files (`db/migrations/004_…`) | Developer |

Uptime monitoring: add a free external monitor (e.g. UptimeRobot) on `/api/health`, alerting the IT mailbox.

## 8. If something goes wrong

| Problem | Fix |
|---|---|
| Site down after a deploy | Vercel → Deployments → promote the previous deployment |
| `/api/health` shows `db: unreachable` | Check Supabase status / project not paused; check `DATABASE_URL` uses port 6543 and the password is current |
| “self-signed certificate” error | Set `DATABASE_CA_CERT` correctly, or `DATABASE_SSL=require` |
| Document upload fails | Check `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`; run `npm run setup:storage`; files must be ≤ 4 MB (Vercel limit) |
| Data entered wrongly / deleted | Supabase → Database → Backups → Point-in-Time restore (to a new project first, to compare) |
