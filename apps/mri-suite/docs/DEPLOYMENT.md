# Deployment

## Recommended architecture

```
Staff browsers ──HTTPS──► Reverse proxy (Nginx/Caddy, TLS 1.2+, HSTS)
                               │
                               ▼
                      Next.js app (Node 22, `npm start`, ≥2 instances behind the proxy)
                               │  TLS
                               ▼
                      PostgreSQL 16 (managed or dedicated VM, encrypted volume)
                      Upload volume (UPLOAD_DIR, encrypted, backed up)
```

Host on hospital-controlled infrastructure or a cloud region compliant with the Ghana
Data Protection Act, 2012 (Act 843) and register processing with the Data Protection Commission
as required. Keep the application on the hospital network/VPN unless remote access is approved.

## Option A – Docker Compose

`docker-compose.yml` and `Dockerfile` are provided in this folder.

```bash
cp .env.example .env    # set strong POSTGRES_PASSWORD / DATABASE_URL, COOKIE_SECURE=true
docker compose up -d --build
docker compose exec app npm run db:migrate
docker compose exec app npx tsx scripts/seed.ts --reference-only
```
Put a TLS-terminating reverse proxy in front of port 3000.

## Option B – Node on a VM
```bash
npm ci && npm run build
NODE_ENV=production npm run db:migrate
NODE_ENV=production npm start      # run under systemd/pm2 with restart-on-failure
```

## Security hardening checklist
- [ ] HTTPS only; `COOKIE_SECURE=true`; HSTS (header already sent by the app).
- [ ] `DATABASE_URL` with `sslmode=require`; database not exposed to the internet.
- [ ] Database and upload volumes encrypted at rest (LUKS / cloud KMS).
- [ ] Strong unique passwords; remove or disable all demo accounts; never load demo data in production.
- [ ] Restrict `admin.*` permissions to IT staff; review Roles & Permissions with the MRI Supervisor.
- [ ] Monitor `/api/health`; ship application logs to central logging.
- [ ] Review the audit log (Administration → Audit Logs) and report-export log monthly.

## Backups & disaster recovery
- Nightly `pg_dump -Fc` (retain 30 daily / 12 monthly), encrypted, stored off-site; plus WAL archiving or managed point-in-time recovery for RPO ≤ 15 min.
- Back up `UPLOAD_DIR` with the same schedule (documents are referenced by `documents.stored_name`).
- Quarterly restore test into a staging environment; document RTO (target ≤ 4 h).
- Downtime procedure: print the day's appointment list and register (Reports page) at the start of each day; record paper safety screening forms during outages and enter them retrospectively (audit log records entry time).

## Upgrades
1. Back up database and uploads. 2. Deploy new build. 3. `npm run db:migrate`. 4. Smoke test (`node tests/e2e/smoke.mjs` against staging with demo data).
