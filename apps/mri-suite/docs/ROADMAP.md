# Implementation roadmap & checklist

Status key: ✅ implemented and tested · 🟡 implemented, needs departmental input · ⬜ outstanding

## Phase 1 – Core platform & patient workflow
- ✅ Authentication, sessions, idle timeout, lock-out, password reset (admin-issued link), password change
- ✅ Roles & permissions (7 roles, editable, audited) – no radiologist role
- ✅ Navigation (collapsible sidebar, top bar, global search, notification centre, breadcrumbs)
- ✅ Database schema + migrations + reference/demo seed
- ✅ Appointment scheduling – day (by scanner / by radiographer), week, month, click-to-book, conflicts, reschedule, cancel, no-show, reminder call log
- ✅ Patient registration with duplicate detection; patient history
- ✅ Automatic appointment audit trail (database trigger, field-level before/after, append-only, viewer + export)
- ✅ Worklist, arrival & tracking, waiting time
- ✅ MRI safety screening with enforced clearance rules
- ✅ Patient preparation with protocol-driven checklists
- 🟡 Preparation protocols are generic drafts – **department must review and approve**

## Phase 2 – Operations & departmental modules
- ✅ Command Centre (live, auto-refresh, shared-monitor privacy mode)
- ✅ Implant & Device Registry (registration, materials, conditions, verification, documents, per-exam assessments, reference database with versions, analytics)
- 🟡 Protocol Library (versioning, approval, compare) – **sequence parameters must be entered from the scanner**
- ✅ Daily examination register, scanning activity log
- ✅ PACS upload tracking (manual confirmation, KPIs, exceptions)
- ✅ Contrast media inventory & administration
- 🟡 Equipment QC – **acceptance thresholds must be configured from GE / departmental standards**
- ✅ Equipment maintenance, return to service
- ✅ Staff & duty: directory, roster, leave, attendance, training, competencies
- ✅ Incident & safety reporting
- ✅ Cleaning & infection control

## Phase 3 – Analytics & reporting
- ✅ Executive dashboard, performance, utilisation (formula displayed), waiting times, PACS, staff workload (no ranking)
- ✅ Branded PDF & Excel exports (10 report types), export log

## Phase 4 – Integrations
- 🟡 Architecture and status registry prepared; nothing simulated
- ⬜ PACS confirmation via DICOM C-FIND / DICOMweb (needs PACS vendor, AE titles, network access)
- ⬜ DICOM Modality Worklist to the SIGNA Creator
- ⬜ HIS/RIS patient & order exchange (HL7/FHIR)
- ⬜ SMS / WhatsApp Business / email gateways (credentials, consent policy)
- ⬜ Patient and referring-doctor portals

## Outstanding items & decisions needed from the department
1. ✅ Official logo installed; theme derived from the logo colours.
2. Scanner confirmed as GE SIGNA Creator 1.5T – serial number, installation date and service contract details still to be entered.
3. Approval of preparation protocols, screening questionnaire wording and pregnancy age range (10–55 used).
4. Real protocol parameters and QC thresholds with source documents.
5. ✅ 24/7 operation configured (every day 00:00–24:00). Alert thresholds still to be confirmed.
6. Hosting decision and data-protection registration (see DEPLOYMENT.md).
7. Optional: two-factor authentication, automated accessibility audit, load testing.

## Assumptions made
- Single hospital and single scanner active today; data model supports more.
- Shift lengths for workload context: morning 6.5 h, afternoon 6 h, night 11.5 h, on-call excluded.
- "Delayed" = scan started more than the late-grace threshold (15 min) after the booked slot; alerts use configurable thresholds.
- Partial images from an incomplete scan are still tracked to PACS (can be unticked).
- Examination completion is recorded automatically when staff confirm a successful upload.
