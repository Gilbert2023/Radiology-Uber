# Technical documentation

## 1. Repository inspection (starting point)

The repository (`Radiology-Uber`) contained planning documents for a separate teleradiology
marketplace concept (`docs/*.md`) and a working MR-safety learning app (`apps/mrso-academy`).
Neither contained MRI departmental-management functionality, a database, or the hospital logo.
The MRI Suite was therefore built as a new, self-contained app at `apps/mri-suite`, leaving the
existing work untouched. It follows the preferred stack (Next.js + TypeScript + Tailwind +
PostgreSQL) and the repository's monorepo convention (`apps/*`).

## 2. Architecture

```
src/
  app/(app)/<module>/page.tsx   Server-rendered pages (one folder per navigation item)
  app/(app)/<module>/actions.ts Server Actions – thin wrappers: authenticate → call service → revalidate
  app/api/...                    Route handlers: exports, document download, patient search, health, logout
  server/services/*.ts           Business logic & state machine (framework-independent, unit-tested)
  server/analytics.ts            All KPI calculations (SQL over live records) + published definitions
  server/alerts.ts               Live operational alerts (computed per request; never stale)
  server/reports.ts, render.ts   Report builders → branded PDF (PDFKit) / Excel (ExcelJS)
  server/auth.ts                 Sessions, login, lock-out, idle timeout, page guards
  lib/                           DB pool, time-zone helpers, constants, RBAC catalogue, navigation
  components/                    Design system (server components) + client components (forms, charts, calendar helpers)
db/migrations/*.sql              Forward-only SQL migrations
scripts/                         migrate, seed (reference / demo), dev-session
tests/                           Integration tests (node:test) + browser E2E smoke test (Playwright)
```

- **Rendering:** React Server Components query PostgreSQL directly via `server/*`; there is no client-side data store. Mutations use Server Actions (CSRF-protected by Next.js origin checks) that call the same service layer used by tests.
- **Transactions:** every state change runs in `tx()` with `SELECT … FOR UPDATE` row locks on the appointment/upload/batch being changed.
- **Time:** all timestamps are `timestamptz` (UTC). Display, day boundaries and operating hours use the department time zone (`Africa/Accra`) via `lib/time.ts` (DST-safe conversion, so other hospitals can change zone).
- **Operating hours:** the unit runs 24/7 (`{"open":"00:00","close":"24:00"}` every day). A 24-hour day imposes no booking-time restriction (bookings may cross midnight) and utilisation uses 24 available hours per scanner per day. Restricted hours remain configurable per weekday.
- **Multi-scanner / multi-site:** scanners, exam types, operating hours, QC parameters and roles are data; `hospitals` exists for multi-site expansion (single active hospital today).

## 3. Data model (main entities)

| Area | Tables |
|---|---|
| Identity & access | `users`, `roles`, `permissions`, `role_permissions`, `sessions`, `password_reset_tokens`, `audit_logs` (append-only via trigger) |
| Configuration | `hospitals`, `settings`, `scanners`, `exam_types`, `prep_protocols`, `integrations` |
| Patient journey | `patients`, `appointments`, `workflow_events`, `safety_screenings`, `patient_preparations`, `scan_records`, `pacs_uploads`, `pacs_upload_events` |
| Implant registry | `implant_categories`, `device_references`, `device_reference_versions`, `patient_implants`, `implant_verifications`, `implant_assessments` (per implant **per appointment**), `documents` |
| Protocols | `mri_protocols` (versioned by `lineage_id` + `version`), `protocol_sequences` |
| Contrast | `contrast_agents`, `contrast_batches`, `contrast_stock_movements`, `contrast_administrations` |
| Equipment | `qc_parameters`, `qc_sessions`, `qc_results`, `maintenance_schedules`, `maintenance_events` |
| Staff | `staff`, `staff_competencies`, `training_records`, `leave_records`, `attendance_records`, `duty_roster` |
| Safety & IPC | `incidents`, `cleaning_areas`, `cleaning_records` |
| Reporting | `report_exports` |

Key integrity guarantees in the database itself:
- `appt_no_scanner_overlap` **exclusion constraint** (GiST over `tstzrange`) – a scanner can never be double-booked, even by a race or direct SQL.
- Unique `(hospital_id, mrn)`; unique accession numbers; one screening/prep/scan/PACS record per appointment.
- Check constraints on every status vocabulary; non-negative stock; end ≥ start for scans/downtime/leave.
- Audit log immutability trigger.
- **Appointment audit trail** (`appointment_audit`, migration 003): an `AFTER INSERT OR UPDATE OR DELETE` trigger on `appointments` writes one append-only row per change with the operation, a full snapshot and a `{field: {from, to}}` diff (ignoring `updated_at`; no-op updates are skipped). The acting user is attached by `txAs(actor, …)`, which sets transaction-local `app.user_id / app.user_name / app.user_role / app.source`; changes made outside the application are still captured and shown as *Unattributed* (source “Direct database change”). Existing appointments were backfilled with a CREATED entry from their booking record. Viewing requires `appointments.audit` (Supervisor and System Administrator by default); patient names are masked for roles without `patients.view`.

## 4. Patient workflow state machine

```
BOOKED ──arrival(ID verified, same day)──► ARRIVED
ARRIVED/SCREENING/PREPARATION/CLEARED  (pre-scan; status recomputed from sub-states)
    screening_status: NOT_STARTED → PENDING → CLEAR | NOT_CLEARED
    prep_status:      NOT_STARTED → IN_PROGRESS → COMPLETE
    status = CLEARED      if screening CLEAR and prep COMPLETE
           = PREPARATION  if screening CLEAR
           = SCREENING    if screening started
CLEARED ──start scan──► SCANNING ──end scan──► SCANNED (complete) | INCOMPLETE (exception)
   end scan creates pacs_uploads(PENDING_UPLOAD)
PACS: PENDING_UPLOAD → UPLOADING → SUCCESSFULLY_UPLOADED | UPLOAD_FAILED | REQUIRES_INVESTIGATION (retries allowed)
SCANNED + upload SUCCESSFULLY_UPLOADED + staff confirmation (VERIFIED) ──► COMPLETED
Re-opening a confirmed upload returns the exam to SCANNED (exception) and is logged.
BOOKED/ARRIVED/… ──► CANCELLED (reason required);  BOOKED (after slot time) ──► NO_SHOW
```
There is no reporting stage after PACS (by design).

### MRI safety rules (enforced in `server/services/workflow.ts`)
1. Every question must be answered; YES/UNSURE on a hazard question requires details.
2. Pregnancy status is mandatory for patients aged 10–55 who are female/other/unknown sex.
3. **Routine clearance** (`safety.clear.routine`, e.g. radiographers): only when all hazard answers are NO, no implant is on record and pregnancy status is acceptable.
4. Otherwise **only `safety.clear`** (MR safety personnel / supervisor) may clear, with a documented rationale.
5. Every implant currently recorded for the patient gets an **exam-specific assessment** row when screening is saved (or when an implant is registered during an active exam). Clearance is blocked while any is PENDING, DO_NOT_SCAN or DEFER_SPECIALIST. Previous exams' assessments are never reused.
6. Assessment rules: MR Unsafe → cannot proceed. MR Conditional → must use *Proceed with conditions*, every comparison item answered, none "Not met", and the applied conditions recorded. Unknown class or unverified device → proceed only by `safety.clear` holders with ≥30-character justification (flagged as override).
7. Changing screening answers, implant identity/safety data, or an assessment after clearance **revokes** the clearance.
8. Scan start re-checks screening, preparation, outstanding implant assessments and scanner availability (defence in depth).
9. Safety is never inferred from material, category or prior assessment; device reference data is marked *User-entered (unverified)* until checked against cited manufacturer documentation.

### Other business rules
Contrast: cannot be administered before clearance; expired/insufficient batches blocked; stock decremented with a movement row; reactions/extravasation auto-create incidents.
QC: thresholds apply only when configured *with a documented source*; otherwise results are NOT_EVALUATED or operator-judged; failures require corrective action and raise alerts.
Maintenance: breakdowns take the scanner offline; only `maintenance.rts` can return it to service (with documented checks).
Roster: blocks shifts during approved leave and morning-after-night shifts; approving leave removes clashing shifts.
Booking: routine bookings within operating hours; scanner and patient overlap prevented; radiographer on leave blocked.

## 5. Roles & permissions
Fine-grained permissions (`src/lib/rbac.ts`) are seeded into the database and editable under
Administration → Roles & Permissions (changes audited; the SysAdmin role cannot remove its own
admin rights). Default roles: MRI Supervisor, MRI Radiographer, MRI Nurse, Receptionist,
Hospital Management (aggregate analytics only, no patient identifiers), System Administrator
(no clinical access), Authorised MR Safety Personnel. **There is no radiologist role.**

## 6. Security & privacy
- Passwords: bcrypt (cost 12); policy ≥10 chars, upper, lower, digit; forced change for admin-created accounts.
- Sessions: 256-bit random token in an httpOnly, SameSite=Lax cookie (Secure in production); only its SHA-256 is stored; absolute lifetime + server-side idle timeout + client inactivity sign-out with warning; revoked on password change/role change/deactivation.
- Brute force: generic error; 5 failures → 15-minute lock; failed attempts audited.
- Authorisation: every page (`requireActor`), Server Action (service-level `assertCan`) and API route checks permissions server-side; navigation only hides links.
- Audit: logins/logouts/timeouts, record views (patient, appointment, implant, incident), all changes, safety decisions, exports, permission changes, denied document/export access.
- Uploads: PDF/PNG/JPEG validated by magic bytes, size-limited, random file names, stored outside the web root (`0600`), served only through an authorised, audited route with `nosniff`.
- Exports: permission-checked, logged to `report_exports` and audit; patient-identifiable reports labelled CONFIDENTIAL.
- Headers: HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy; `Cache-Control: no-store` on authenticated pages.
- Shared monitors: Command Centre “Shared monitor mode” shows initials + last 4 MRN digits; management users never see patient names in alerts.
- SQL injection: all queries parameterised. XSS: React escaping; no `dangerouslySetInnerHTML`.

## 7. Integration strategy (prepared, not simulated)
| Integration | Prepared hook |
|---|---|
| PACS (DICOM C-FIND / DICOMweb QIDO-RS) | `pacs_uploads.method` = `MANUAL_CONFIRMATION` vs `DICOM_INTEGRATION`; a connector would query by accession number and call `updatePacsStatus`/`confirmPacsUpload` as a system actor |
| Modality Worklist | `appointments` already hold accession, patient, exam, scanner – map to MWL C-FIND responses |
| HIS / RIS | Patient and order import via HL7 v2 ADT/ORM or FHIR `Patient`/`ServiceRequest` into the existing service functions (duplicate checks apply) |
| SMS / WhatsApp / Email | Reminder list exists; a sender would record `reminder_at` exactly as the manual workflow does |
| Portals | Read-only views over appointments by patient/referrer identity |

Statuses `CONNECTED`/`FAILED` cannot be set manually – reserved for real connector health checks.
