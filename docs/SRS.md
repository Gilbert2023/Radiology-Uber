# Software Requirements Specification
## Radiology Uber (Working Title)

**Document version:** 0.1 (Draft for founding-team review)
**Date:** 2026-07-28
**Author:** Founding Engineering Team
**Status:** Draft — pre-development, no code written against this spec yet

---

## 0. Document Purpose and How to Use It

This SRS is the single source of truth for what we are building in Phase 0–1 of Radiology Uber. It exists to force alignment *before* a single line of product code is written, because this is a six-sided marketplace touching regulated medical data, and rework after launch is expensive — both financially and reputationally (a wrong result delivered to a patient is not a bug ticket, it's a harm event).

It is organized as a conventional SRS (scope → users → functional requirements → non-functional requirements → data → interfaces → compliance → open questions), but written for a startup context: every section calls out **MVP** vs **Phase 2+** so engineering doesn't over-build on day one, and every regulated area calls out **who in Ghana actually governs this**, because "we'll figure out compliance later" is how healthcare startups die.

---

## 1. Introduction

### 1.1 Problem Statement

Diagnostic imaging in Ghana (and most of Sub-Saharan Africa) is broken in five specific ways today:

1. **Discovery is opaque.** Patients and even referring doctors don't know which imaging centers have a working MRI/CT *today*, what it costs, or how long the queue is. Word of mouth and phone calls are the booking system.
2. **Radiologist scarcity is the real bottleneck, not machines.** Ghana has a severe shortage of licensed radiologists relative to the number of imaging machines and image volume. Many centers — especially outside Accra/Kumasi — own scanners that sit idle or produce images that wait days-to-weeks for a formal report, because there's no radiologist on-site.
3. **Payment friction.** Imaging is often a large out-of-pocket cost, paid in cash at the center, with no price transparency upfront and no financing/installment options.
4. **Results are fragmented.** Films, CDs, or printed reports get physically handed to patients, who then carry them between providers. There is no longitudinal, portable imaging record.
5. **No accountability loop.** No ratings, no SLA on report turnaround, no structured way for a hospital or imaging center to source a stand-in radiographer or a remote radiologist for overflow/reporting capacity.

### 1.2 Product Vision

Radiology Uber is a two-sided-plus-services marketplace that:

- Lets a **patient** (or a **doctor** on their behalf) discover, price-compare, and book a diagnostic imaging appointment at a nearby **imaging center or hospital** in minutes, pay via mobile money or card, and receive a report and images digitally.
- Lets an **imaging center or hospital** with excess scanner capacity but no radiologist fill that capacity by routing studies to vetted, on-demand **radiologists** (on-site or remote/teleradiology) and staff **radiographers** on a marketplace/gig basis.
- Creates a portable, patient-owned **digital imaging record** that follows the patient across providers.

The Uber analogy is intentionally narrow: it's about **on-demand matching + transparent pricing + real-time status + digital payment**, not about physically moving anyone. We are not building patient transport in v1 (see §1.5 explicit non-goals), though "mobile imaging van to your location" is a plausible Phase 3 idea and is flagged as such.

### 1.3 Intended Audience

Founding engineers, contracted mobile/web developers, first product hires, medical advisory board, and investors doing technical diligence.

### 1.4 Scope of This Document

This SRS covers the requirements for the platform through **MVP (Phase 1)** and sketches **Phase 2/3** so architecture decisions today don't foreclose them. It does **not** contain UI mockups, database schemas, API contracts, or infrastructure choices — those are downstream artifacts (Technical Design Doc, ERD, API spec) that should be written *after* this SRS is approved.

### 1.5 Explicit Non-Goals (v1)

To keep MVP shippable, the following are **out of scope for Phase 1** and should not silently creep into sprint work:

- AI-assisted image interpretation / diagnosis (CAD). We are a marketplace and workflow layer, not a diagnostic AI company, in v1.
- Physical patient transport/logistics to appointments.
- Full EHR/EMR functionality (we hold imaging records, not a general medical chart).
- Insurance claims adjudication / NHIS direct billing integration (Phase 2 candidate — see §9).
- In-house PACS/viewer built from scratch (v1 integrates a licensed/embeddable DICOM viewer rather than building one — see §7.4).
- Multi-country support (Ghana only for v1; architecture should not hard-code Ghana assumptions where avoidable, but no other country's regulatory work happens in Phase 1).

---

## 2. Overall Description

### 2.1 Product Perspective

Radiology Uber is a new, independently built platform (not an extension of an existing hospital system), consisting of:

- **Patient mobile app** (Android-first, given Ghana's smartphone market share; iOS follows) + lightweight web booking flow for referral links and low-end-device access.
- **Provider web dashboard** for imaging centers/hospitals (staff scheduling, slot management, order queue, payouts).
- **Doctor portal/app** for referrals, order tracking, and results retrieval.
- **Radiologist/Radiographer app** (mobile + web) for accepting gig/shift work, viewing worklists, and (for radiologists) dictating/submitting reports.
- **Admin/Ops console** (internal) for KYC/credential verification, dispute resolution, marketplace health monitoring, and support.
- **Backend platform**: booking engine, matching/dispatch engine, payments, notifications, DICOM/report storage and delivery, identity & credential verification, audit/compliance layer.

It integrates with, rather than replaces, existing hospital/imaging-center systems (RIS/PACS) where those exist — see §7.5.

### 2.2 User Classes and Characteristics

| # | Role | Description | Tech comfort | Primary device |
|---|------|-------------|--------------|-----------------|
| 1 | **Patient** | Books and pays for imaging, self-referred or doctor-referred. Wide age range, variable literacy and connectivity. | Low–medium | Android phone, sometimes via a family member's phone |
| 2 | **Referring Doctor** | GP or specialist who orders imaging for a patient, needs fast turnaround and reliable report delivery. | Medium–high | Phone + desktop |
| 3 | **Radiographer / Sonographer / Imaging Technologist** | Operates imaging equipment (X-ray, CT, MRI, ultrasound, mammography). May be a permanent center employee *or* a marketplace gig worker filling shifts across centers. | Medium | Mobile app, center workstation |
| 4 | **Radiologist** | Licensed physician who interprets images and produces the diagnostic report. Can work on-site, or remotely via teleradiology for centers without in-house coverage. This is the scarce resource the whole platform is designed around. | Medium–high | Desktop with diagnostic-grade (or near-diagnostic) monitor, mobile app for worklist/notifications |
| 5 | **Imaging Center (independent, private)** | Owns/operates scanners, lists services & real-time slot availability, may lack in-house radiologists. | Medium (owner/admin), low (front-desk staff) | Web dashboard, tablet at front desk |
| 6 | **Hospital (radiology department)** | Larger institution; may have in-house radiologists but wants overflow capacity, or wants to expose slots for outpatient booking. Procurement/IT involvement likely. | Medium (dept admin), varies (clinicians) | Web dashboard, possible RIS/PACS integration |
| 7 | **Platform Admin / Ops / Support** | Internal team: credential verification, dispute resolution, fraud/quality monitoring, customer support. | High | Internal admin console |
| 8 | **Finance/Payouts Admin** | Internal team managing settlement to centers, radiologists, radiographers; reconciliation. | High | Internal admin console |

### 2.3 Operating Environment

- **Geography:** Ghana at launch (Accra, Kumasi, Takoradi prioritized; must degrade gracefully in low-connectivity peri-urban/rural areas).
- **Connectivity assumptions:** 3G/4G with intermittent drops is the *normal* case, not the edge case. Design for offline-tolerant flows (queue actions locally, sync on reconnect) rather than assuming always-on connectivity.
- **Devices:** Predominantly Android (mid/low-tier, e.g. 2–4GB RAM). iOS supported but secondary. Front-desk/imaging-center staff often on shared tablets or desktop browsers.
- **Payment rails:** Mobile Money (MTN MoMo dominant, also Vodafone Cash / Telecel Cash, AirtelTigo Money) is the primary payment method, not a secondary option. Card payments (Visa/Mastercard via a local PSP) as a second path. Cash-on-arrival as a fallback for MVP trust-building.
- **Languages:** English (official/business language) at launch; local-language support (Twi at minimum) flagged as a Phase 2 accessibility requirement given literacy variance, achieved first via voice/SMS templates rather than full UI translation.

### 2.4 Design and Implementation Constraints

- Must comply with **Ghana's Data Protection Act, 2012 (Act 843)** and be registered as a data controller with the **Data Protection Commission (DPC)**.
- Radiologists and radiographers must hold valid, verifiable licenses from **Ghana's Medical and Dental Council (MDC)** (radiologists, as licensed physicians) and the **Allied Health Professions Council (AHPC)** (radiographers/sonographers), respectively. Platform must not allow an unverified practitioner to accept a case.
- Imaging centers/hospitals must hold a valid **Ghana Health Service (GHS)** facility license/credentialing where applicable.
- DICOM image handling should follow the **DICOM standard** for interoperability with existing hospital PACS/RIS systems; report exchange should be **HL7/FHIR**-compatible where hospitals already run such systems, so we're not asking every hospital IT department to build a custom bridge for us.
- Must assume **low-bandwidth, high-latency** networks as the default operating condition (see §2.3), which constrains image compression/streaming strategy (§7.4).
- Given sensitivity of medical imaging + PII, encryption in transit and at rest is a hard requirement, not a nice-to-have (§8).

### 2.5 Assumptions and Dependencies

- We assume enough independent imaging centers are reachable and willing to onboard in year one (supply-side bootstrapping is a go-to-market risk, not purely a product risk, but it constrains which features matter first — see §9 MVP prioritization).
- We assume a workable pool of licensed radiologists (Ghana-based and/or diaspora, subject to Ghanaian licensing/telemedicine rules) willing to do remote reporting gig work.
- We depend on third-party mobile money APIs (MTN MoMo API, etc.), a PSP for card processing, an SMS gateway, and (likely) a cloud PACS/DICOM storage vendor or a self-hosted Orthanc-style server plus object storage — a build-vs-buy decision to be made in the Technical Design Doc, not here.
- We assume regulatory clarity on teleradiology (a remote radiologist reporting on a scan performed in a different facility) is achievable under current MDC guidance; this should be confirmed with legal/medical-advisory counsel before Phase 1 launch of the teleradiology matching feature, not discovered after.

---

## 3. System Features (Functional Requirements)

Each feature has a unique ID (`FR-<area>-<num>`), a priority (`MVP` / `P2` / `P3`), and acceptance-level requirements. IDs are stable identifiers for traceability into future tickets — do not renumber later, deprecate instead.

### 3.1 Identity, Onboarding & Verification

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-ID-01 | System shall support account registration for all six user classes with role-specific onboarding flows. | MVP |
| FR-ID-02 | Patients shall register via phone number + OTP (SMS), with optional email. No password-only accounts (SIM-based OTP is the dominant trusted pattern in this market). | MVP |
| FR-ID-03 | Radiologists and radiographers shall submit license/credential documents (MDC/AHPC registration number, ID, certificates) during onboarding; account remains in "Pending Verification" state and **cannot accept cases** until an Ops admin approves. | MVP |
| FR-ID-04 | System shall support a manual admin verification workflow (document review + license-number lookup against the relevant council where a public registry/API exists) before any practitioner is marked "Verified." | MVP |
| FR-ID-05 | Imaging centers/hospitals shall submit facility registration/license info and at least one accountable admin contact before listing services. | MVP |
| FR-ID-06 | System shall support periodic re-verification / license-expiry tracking, auto-suspending a practitioner whose license lapses. | P2 |
| FR-ID-07 | System shall support role-based access control (RBAC) so e.g. front-desk staff at a center can manage bookings but not payouts or credentialing. | MVP |
| FR-ID-08 | Doctors shall be able to register with a simplified verification (professional registration number check) distinct from the deeper radiologist/radiographer vetting, since doctors are referrers, not platform-employed image interpreters. | MVP |

### 3.2 Discovery & Search

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-DISC-01 | Patients shall be able to search imaging services by type (X-ray, ultrasound, CT, MRI, mammography, etc.), location/proximity, and earliest available slot. | MVP |
| FR-DISC-02 | Search results shall display, per provider: distance/travel estimate, price, next available appointment time, and an aggregate rating. | MVP |
| FR-DISC-03 | Patients shall be able to filter by price range and "has radiologist report within X hours" turnaround SLA. | P2 |
| FR-DISC-04 | System shall show real-time (not stale/manually-updated-weekly) slot availability pulled from each provider's calendar. | MVP |
| FR-DISC-05 | Doctors shall have a referral-specific search view that lets them select a study type + preferred centers and generate a referral that the patient can complete themselves. | MVP |

### 3.3 Booking & Scheduling

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-BOOK-01 | Patient shall be able to book an available slot, entering/confirming study type, and (if applicable) attach a doctor's referral. | MVP |
| FR-BOOK-02 | System shall support both patient-initiated self-referral bookings and doctor-initiated referral bookings (doctor creates the order; patient confirms time/location/payment). | MVP |
| FR-BOOK-03 | Booking confirmation shall trigger notifications (push + SMS fallback) to patient, and to the receiving center/hospital front desk. | MVP |
| FR-BOOK-04 | System shall support reschedule and cancellation flows with a configurable cancellation policy (e.g., free up to N hours before, partial charge after) enforced consistently, not ad hoc per center. | MVP |
| FR-BOOK-05 | System shall support pre-appointment instructions specific to study type (e.g., "fast 6 hours before abdominal CT", "drink water before pelvic ultrasound") surfaced automatically based on the selected study. | MVP |
| FR-BOOK-06 | System shall send automated reminders (24h and 2h before appointment) via push/SMS. | MVP |
| FR-BOOK-07 | Centers/hospitals shall be able to manage their own calendar: block slots for maintenance, set machine-specific availability (e.g., only one of two MRI machines running). | MVP |
| FR-BOOK-08 | System shall support "urgent/same-day" booking requests that are prioritized in matching where clinically flagged as urgent by a referring doctor. | P2 |

### 3.4 Matching & Dispatch (Radiographer/Radiologist Marketplace)

This is the differentiated core of the platform, not a bolt-on feature — it's what actually relieves the radiologist bottleneck described in §1.1.

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-MATCH-01 | When an imaging center has capacity (scanner + patient) but lacks an on-site radiologist to report, system shall allow the center to submit the completed study to the **teleradiology queue** for reporting by an available, appropriately-licensed remote radiologist. | MVP |
| FR-MATCH-02 | System shall match/route a pending report request to eligible radiologists based on: modality qualification (e.g., MRI-qualified), current availability/status ("online" / shift hours), current workload, and (later) sub-specialty (e.g., neuro, MSK) where declared. | MVP |
| FR-MATCH-03 | Radiologists shall be able to set availability status and accept/decline incoming report requests within a defined response SLA (e.g., accept within 15 minutes or it re-routes). | MVP |
| FR-MATCH-04 | System shall track and display, per study, a **turnaround-time SLA** (time from image-ready to report-delivered) and escalate/re-route if breached. | MVP |
| FR-MATCH-05 | System shall support centers/hospitals posting **shift-based gig requests for radiographers** (e.g., "need a sonographer, Tuesday 8am–2pm, our facility") that qualified radiographers can browse and accept, similar in structure to shift marketplaces. | MVP |
| FR-MATCH-06 | System shall support a **second-opinion / peer-review request** flow where a radiologist's report can be routed to a second radiologist for review on complex cases. | P2 |
| FR-MATCH-07 | System shall log every matching decision (who was offered, who accepted/declined, timing) for auditability and for tuning the matching algorithm later. | MVP |

### 3.5 Imaging Workflow & Reporting

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-IMG-01 | Radiographer shall be able to mark a booked study as "patient checked in" → "in progress" → "images acquired" via the app, updating patient/doctor-visible status in real time. | MVP |
| FR-IMG-02 | System shall ingest DICOM images from the imaging center's modality/PACS (or a supported upload path) and associate them with the correct patient order. | MVP |
| FR-IMG-03 | Radiologist shall be able to view images via an embedded/integrated DICOM viewer (web-based, diagnostic-appropriate for the connectivity context) sufficient to produce a report — not a full diagnostic workstation replacement in v1. | MVP |
| FR-IMG-04 | Radiologist shall be able to dictate/type a structured report (findings + impression, using standard fields per modality) and submit it against the order. | MVP |
| FR-IMG-05 | Once submitted, report shall be timestamped, digitally signed/attributed to the reporting radiologist, and locked from further edits without an explicit "addendum" flow (preserving a medico-legal record). | MVP |
| FR-IMG-06 | System shall notify referring doctor and patient when a report is ready, and deliver both the report and access to view/download images. | MVP |
| FR-IMG-07 | System shall maintain a **longitudinal imaging record per patient** across providers/visits, viewable (with consent) by any doctor the patient authorizes. | MVP |
| FR-IMG-08 | System shall support flagging of "critical/urgent findings" by the radiologist that trigger an immediate high-priority notification (not just standard queue) to the referring doctor. | MVP |
| FR-IMG-09 | System shall retain images and reports for a minimum retention period aligned with Ghanaian medical-records regulation and best practice (to be confirmed with legal/medical advisory — draft assumption: minimum 7 years for adult studies, longer for pediatric). | MVP (policy), P2 (automation) |

### 3.6 Payments & Payouts

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-PAY-01 | Patient shall see the full, all-in price (imaging fee + any platform fee, clearly itemized) before confirming booking — no surprise charges at the counter. | MVP |
| FR-PAY-02 | System shall support payment via mobile money (MTN MoMo at minimum; Vodafone Cash/AirtelTigo Money as fast-follow), card payment, and pay-at-center-on-arrival as a fallback. | MVP |
| FR-PAY-03 | System shall hold funds (or authorize/capture appropriately) and release payout to the imaging center only after the appointment is completed (protects both sides from no-shows/fraud). | MVP |
| FR-PAY-04 | System shall calculate and hold back a platform commission on each transaction, configurable per provider/contract terms. | MVP |
| FR-PAY-05 | System shall support separate payout tracking/settlement for gig radiologists and radiographers (paid per report/shift, distinct from the center's payout for facility use). | MVP |
| FR-PAY-06 | System shall generate a payout statement/reconciliation report for each provider/practitioner on a defined cycle (e.g., weekly). | MVP |
| FR-PAY-07 | System shall support refunds for cancellations per policy (§FR-BOOK-04) and for platform-caused failures (e.g., no radiologist available within SLA). | MVP |
| FR-PAY-08 | System shall support installment/"pay small small" financing for high-cost studies (MRI/CT). | P2 |
| FR-PAY-09 | System shall support NHIS (National Health Insurance Scheme) or private insurance claim submission integration. | P2/P3 |

### 3.7 Ratings, Trust & Quality

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-TRUST-01 | Patients shall be able to rate and review their experience at an imaging center after a completed visit. | MVP |
| FR-TRUST-02 | Doctors/centers shall be able to rate radiologist report quality/timeliness (internal signal, not necessarily public) to feed matching priority. | P2 |
| FR-TRUST-03 | System shall support a dispute/complaint flow (e.g., "report was late," "wrong study performed," "billing issue") routed to Ops admin with SLA. | MVP |
| FR-TRUST-04 | System shall track and surface, per center/radiologist, quality metrics (turnaround SLA adherence, cancellation rate, rating) to Ops for marketplace health monitoring, and to consumers where appropriate. | MVP (internal), P2 (consumer-facing detail) |

### 3.8 Notifications & Communication

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-NOTIF-01 | System shall send transactional notifications (booking confirmed, reminder, status update, report ready, payment receipt) via push notification with **SMS fallback** for users without reliable data/app access. | MVP |
| FR-NOTIF-02 | System shall support in-app secure messaging between patient and center (e.g., "running 10 min late") and between radiologist and referring doctor for report clarification. | P2 |
| FR-NOTIF-03 | Critical findings (§FR-IMG-08) shall use a distinct, escalating notification channel (push + SMS + optionally a required-acknowledgment flow) rather than the standard notification pipeline. | MVP |

### 3.9 Admin, Ops & Analytics

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-ADM-01 | Admin console shall support credential review/approval queue (§FR-ID-03/05). | MVP |
| FR-ADM-02 | Admin console shall provide marketplace health dashboards: supply (available radiologists/centers by region), demand (booking volume, unmet demand/failed matches), SLA adherence, GMV. | MVP |
| FR-ADM-03 | Admin console shall support dispute case management (§FR-TRUST-03) with audit trail. | MVP |
| FR-ADM-04 | Admin console shall support manual override capability (e.g., force-reassign a stuck report request) for Ops to unblock edge cases. | MVP |
| FR-ADM-05 | System shall maintain a full audit log of access to patient medical data (who viewed what image/report, when) for compliance. | MVP |

---

## 4. External Interface Requirements

### 4.1 User Interfaces

- **Patient app** (Android/iOS): search, book, pay, track status, view results/images, manage family members' bookings (a patient often books on behalf of a parent/child — the account model must support this, see §6).
- **Provider web dashboard**: calendar/slot management, order queue, staff management, payout statements.
- **Doctor app/portal**: referral creation, order tracking, results inbox, patient imaging history (with consent).
- **Radiologist/Radiographer app**: worklist, availability toggle, shift marketplace, DICOM viewer + reporting tool (radiologist), report dictation.
- **Admin console** (internal web): all Ops/Finance functions above.
- All interfaces must meet basic accessibility (legible font sizes, sufficient contrast) given a user base with wide age range and variable eyesight/literacy; SMS/voice fallback for the lowest-connectivity/lowest-literacy segment is a design requirement, not an afterthought.

### 4.2 Hardware Interfaces

- Integration with imaging modalities/PACS at partner centers for DICOM image transfer (via DICOM C-STORE, a DICOM router/gateway, or manual secure upload where a center has no PACS at all).
- No proprietary hardware required for MVP; a "digitize your existing machine" onboarding path (i.e., how do we get images out of an old standalone X-ray unit with no network PACS) needs a defined process even if it's semi-manual at first (e.g., CD/USB upload at onboarding, camera-photograph-of-film as an absolute floor case for the least digitized centers — flagged as a real operational risk, not a hypothetical).

### 4.3 Software Interfaces

| Interface | Purpose | MVP? |
|---|---|---|
| MTN MoMo API (+ other MoMo operators) | Patient payments, payouts | MVP |
| Card PSP (e.g., a Ghana/Africa-focused processor) | Card payments | MVP |
| SMS gateway | OTP, notifications fallback | MVP |
| Push notification service | App notifications | MVP |
| Cloud object storage + DICOM server (self-hosted e.g. Orthanc, or managed cloud PACS) | Image storage/retrieval | MVP |
| Web-based DICOM viewer (licensed/OSS component, e.g. OHIF or commercial SDK) | Radiologist image review | MVP |
| HL7/FHIR gateway | Interop with hospital RIS/PACS/EMR where present | P2 |
| Maps/geocoding API | Distance/proximity search, address entry | MVP |
| Identity/document verification tooling | Practitioner KYC support | MVP (can start manual, tooling is an efficiency upgrade) |
| Analytics/BI pipeline | Admin dashboards, product analytics | MVP (lightweight), P2 (full pipeline) |

### 4.4 Communications Interfaces

All client-server communication over TLS 1.2+. Webhooks from payment providers must be signature-verified. Real-time status updates (booking status, report-ready) via push/websocket where connectivity allows, with polling/SMS fallback where it doesn't.

---

## 5. Non-Functional Requirements

### 5.1 Performance

- Search results shall return in under 2 seconds on a typical 3G connection for 95% of queries.
- Booking confirmation shall complete end-to-end (submit → confirmed) in under 5 seconds under normal load.
- Image upload/ingestion pipeline must handle large files (an MRI series can be hundreds of MB) without blocking the UI — background/chunked upload with resumability is required, not optional, given network conditions in §2.3.
- The platform must define and monitor **report turnaround SLA** as a first-class system metric (not just a UX nicety) since it's the core value proposition versus the status quo.

### 5.2 Scalability

- Architecture should support horizontal scaling of the booking/matching services independently from the (heavier, storage-bound) imaging pipeline.
- Initial target: support concurrent operation across multiple cities in Ghana without re-architecture; explicit multi-country/multi-region support is a Phase 2+ concern but the data model should not hard-code single-country assumptions where the cost of avoiding that is low (e.g., store currency and country code per transaction rather than assuming GHS/Ghana everywhere).

### 5.3 Availability & Reliability

- Core booking and payment paths: target 99.5%+ uptime for MVP (not 99.99% — that's premature for a pre-PMF startup, but degraded/offline handling matters more than five-nines given network reality).
- Report delivery and image storage must be durable — this is medical data; data loss is not an acceptable failure mode under any circumstances. Backups and redundant storage are a hard requirement from day one, not a "we'll add it later."
- Graceful degradation: if the matching engine is down, existing bookings and previously-delivered reports must remain accessible.

### 5.4 Security

- Encryption in transit (TLS) and at rest for all PII and medical data.
- RBAC enforced at the API layer, not just hidden in UI (a front-desk account must be *unable* to call an admin-only endpoint, not merely have the button hidden).
- MFA/OTP for all practitioner and admin accounts at minimum (patients can rely on OTP-per-login given SIM-based trust model, but sensitive actions like viewing another patient's record must require explicit authorization).
- Full audit logging of access to medical images/reports (§FR-ADM-05), immutable/tamper-evident.
- Regular access review: verified-practitioner status must be re-checked, and offboarded practitioners/staff must have access revoked promptly (defined SLA, e.g. within 1 hour of offboarding action).
- Security review (dependency scanning, basic penetration testing) required before handling real patient data in production, not just before "public launch" — a private pilot with real patients is still real patient data.

### 5.5 Privacy & Data Protection

- Compliant with **Ghana Data Protection Act 2012 (Act 843)**: registration with the Data Protection Commission, lawful basis for processing health data (explicit consent), data subject rights (access, correction, and — within medical-record-retention constraints — deletion requests).
- Patients must explicitly consent to: (a) platform storing their imaging/report data, (b) sharing that data with a specific doctor they authorize, (c) any secondary use (e.g., de-identified data for quality improvement) — opt-in, not opt-out, for (c).
- Data minimization: radiographers/radiologists see only what's needed for their task (e.g., a radiologist doesn't need the patient's payment history).
- Cross-border data storage: if using an international cloud provider, confirm data residency/transfer requirements under Ghanaian law don't block that choice; flagged as a legal-review item before infrastructure is finalized.

### 5.6 Usability & Accessibility

- Must be usable by a patient with low digital literacy and by a radiographer moving between multiple centers on a shift-gig basis with minimal training — onboarding flows should be testable with real, non-technical users before launch, not just internally.
- SMS/voice-fallback channels are an accessibility requirement, not a "nice UX touch," given the target market's device/connectivity distribution (§2.3).

### 5.7 Compliance & Regulatory

- Practitioner licensing verification against MDC (radiologists/doctors) and AHPC (radiographers) — §2.4, §FR-ID-03.
- Facility credentialing alignment with Ghana Health Service requirements.
- Data protection: Act 843 (§5.5).
- Telemedicine/teleradiology: confirm current MDC guidance/position on remote diagnostic reporting before FR-MATCH-01 goes live in production with real patients — this is flagged explicitly as a **pre-launch legal gate**, not a background task.
- Medical record retention requirements (§FR-IMG-09) — confirm exact statutory period with legal/medical advisory rather than relying on the draft assumption in this document.
- Consumer protection / pricing transparency norms relevant to Ghana's e-commerce and healthcare advertising regulations.

### 5.8 Maintainability & Observability

- All services must emit structured logs and key business metrics (bookings/hour, match success rate, SLA breaches, payment failures) to a central observability stack from day one — debugging a two-sided marketplace without funnel visibility is not viable.
- Feature flagging capability expected, given the multi-role rollout (e.g., enabling teleradiology matching for a new region before enabling patient self-booking there).

---

## 6. Data Requirements (Conceptual, Not Schema-Level)

This section names the core entities and key relationships the data model must support. It intentionally stops short of an ERD/schema — that belongs in the Technical Design Doc — but the SRS should make clear what the model *must* be able to represent, since some of these are easy to under-design (e.g., family booking) if not called out here.

**Core entities:**
- `User` (base identity) → specialized profiles: `PatientProfile`, `DoctorProfile`, `RadiographerProfile`, `RadiologistProfile`, `CenterAdminProfile`, `HospitalAdminProfile`, `PlatformAdminProfile`.
- `Patient` records must support **dependents/family members** — a patient account can book on behalf of a child, elderly parent, etc., with the booking correctly attributed to the dependent's medical record, not merged into the account owner's.
- `Facility` (Imaging Center or Hospital) → has `Services` (modality + price + duration) → has `Slots`/calendar → has `Staff` (radiographers, possibly in-house radiologists).
- `Order`/`Booking`: links Patient (+ optional referring Doctor) + Facility + Service + Slot + Status lifecycle (requested → confirmed → checked-in → in-progress → images-acquired → report-pending → report-ready → complete / cancelled).
- `Study`/`ImagingRecord`: the DICOM image set(s) associated with an Order, versionable if re-scanned.
- `Report`: linked to a Study, authored by a Radiologist, versioned (original + addenda), digitally signed/attributed, with a critical-finding flag.
- `MatchRequest`: represents a report-request or shift-request dispatched to eligible Radiologists/Radiographers, with offer/accept/decline/timeout history (§FR-MATCH-07).
- `Payment`/`Payout`: transaction records distinct from, but linked to, Orders; separate payout ledgers for Facilities vs. gig Radiologists/Radiographers vs. platform commission.
- `ConsentRecord`: explicit record of what a Patient consented to and when (§5.5), auditable.
- `AuditLog`: immutable record of data access events (§FR-ADM-05).
- `Rating`/`Dispute`: linked to Orders, with resolution status/history.

**Key data-model requirements to flag now** (because retrofitting them is painful):
- A `Report` must be immutable once signed, with addenda as a separate linked record — never an in-place edit (medico-legal requirement, §FR-IMG-05).
- Every entity touching patient medical data needs a consistent consent/authorization check baked into the access layer, not bolted on per-endpoint.
- The model must support a practitioner (radiologist/radiographer) working across **multiple facilities**, since the gig/marketplace model depends on that — do not model staff as belonging to exactly one facility.

---

## 7. System Architecture Considerations (High-Level, Non-Prescriptive)

This SRS does not mandate a specific stack — that's the Technical Design Doc's job — but flags architectural properties the requirements above imply:

### 7.1 Service Boundaries (Suggested Areas, Not a Final Design)
Identity/Credentialing · Search & Discovery · Booking & Scheduling · Matching/Dispatch · Imaging Pipeline (ingest/store/view) · Reporting · Payments/Payouts · Notifications · Admin/Ops.
These map reasonably to independently-scalable and independently-ownable services, but a monolith-first approach for MVP speed is a legitimate choice — the *boundaries* above should exist in the code's module structure even before (if ever) they become separate deployables.

### 7.2 Event-Driven Backbone
Given how many state transitions cascade across roles (booking confirmed → notify center → radiographer workflow; images acquired → matching engine → radiologist notified; report signed → notify doctor + patient), an event/message-driven core (not just synchronous REST calls everywhere) will reduce coupling significantly. This is a strong recommendation for the Technical Design Doc to formalize, not a requirement this document mandates in detail.

### 7.3 Offline Tolerance
Given §2.3, client apps (especially provider/radiographer apps used inside facilities with poor Wi-Fi) should queue state-changing actions locally and sync, rather than fail hard on connectivity loss.

### 7.4 Imaging Pipeline
DICOM images are large and sensitive. v1 should **integrate an existing DICOM server/viewer component** (e.g., self-hosted Orthanc + an OSS viewer like OHIF, or a managed cloud-PACS vendor) rather than building DICOM handling from scratch — this is explicitly called out because "just build a viewer" is a multi-month distraction from the actual differentiator (matching/marketplace), and DICOM correctness/compliance is a solved problem elsewhere.

### 7.5 Interoperability with Existing Hospital Systems
Larger hospital partners will likely already run a RIS/PACS/EMR. The platform must be able to plug into those (HL7/FHIR, DICOM) rather than forcing a hospital to abandon existing infrastructure — for hospitals this is a partnership/integration play, distinct from the "figure it out ourselves" onboarding path acceptable for smaller independent imaging centers.

---

## 8. Security Requirements Summary

(Consolidating §5.4/§5.5 into a checklist form for engineering reference.)

- [ ] TLS everywhere; no plaintext transport of PII/PHI.
- [ ] Encryption at rest for images, reports, and PII stores.
- [ ] RBAC enforced server-side for every role in §2.2.
- [ ] OTP/MFA on all accounts; step-up auth for sensitive actions.
- [ ] Immutable audit log for all medical-data access.
- [ ] Signed/verified webhooks from payment providers.
- [ ] Secrets management (no credentials in code/config committed to the repo).
- [ ] Practitioner credential verification gate before any case-handling capability is unlocked (§FR-ID-03/04).
- [ ] Defined incident-response process for a data breach, including DPC notification obligations under Act 843.
- [ ] Third-party security review before handling real patient data (§5.4).

---

## 9. MVP Prioritization & Phasing

Everything tagged **MVP** above is what "Phase 1" means. To make the sequencing concrete:

**Phase 1 (MVP) — prove the core loop in one city (likely Accra):**
- Patient search/book/pay for a study at a partner imaging center.
- Center manages slots, checks patient in, marks study complete.
- If the center lacks a radiologist: route to teleradiology queue → radiologist reports remotely.
- Report + images delivered digitally to patient and referring doctor (if any).
- Payments (MoMo + pay-at-center fallback), basic payouts.
- Admin console for credentialing, dispute handling, and marketplace health visibility.
- This phase's success is not "the app works" — it's "a patient got a scan and a report faster/cheaper/more transparently than the status quo, and a center filled otherwise-idle capacity."

**Phase 2 — deepen the marketplace, expand trust & payment flexibility:**
- Radiographer shift-gig marketplace at scale, second-opinion/peer-review flow, richer trust/rating signals, installment payments, NHIS/insurance integration exploration, HL7/FHIR hospital integrations, multi-language support.

**Phase 3 — expansion:**
- Additional Ghanaian cities/regions at depth, then evaluate other African markets; possible mobile/portable imaging unit dispatch (closer to the literal "Uber" analogy); AI-assisted triage/worklist prioritization (not diagnosis) as an efficiency layer for radiologists, evaluated carefully given §1.5.

**Explicit sequencing rationale:** the teleradiology matching feature (FR-MATCH-01 through 04) is tagged MVP, not P2, deliberately — it's the actual wedge that differentiates this from "just a booking app," and it's the thing that gets *centers* (the harder side to acquire) to onboard, because it solves their real operating problem (idle scanner capacity due to no radiologist), not just a patient-facing convenience.

---

## 10. Open Questions Requiring Founder/Advisory Input Before Build Starts

Flagging these explicitly rather than silently assuming answers, because getting them wrong is expensive to unwind later:

1. **Legal status of teleradiology under current MDC rules** — confirmed permissible, and under what conditions (e.g., must the reporting radiologist be Ghana-licensed even if physically abroad)? This gates FR-MATCH-01.
2. **Data residency** — is storing patient medical images on an international cloud provider (vs. in-country) acceptable under Act 843 and any sector-specific health-data guidance? Gates infrastructure choice.
3. **Launch city and initial supply strategy** — how many imaging centers/radiologists realistically committed pre-launch? This affects whether matching-engine sophistication (FR-MATCH-02) is even needed at MVP scale, or whether Ops can do it manually for the first N months (a legitimate "do things that don't scale" MVP shortcut worth deciding explicitly).
4. **NHIS integration timeline** — is this a Phase 2 priority for market credibility, or genuinely later? Affects payments architecture decisions now vs. later.
5. **Medical record retention period** — confirm exact statutory requirement (§FR-IMG-09 draft assumption of 7 years needs legal confirmation).
6. **Liability/insurance model** — when a radiologist misses a critical finding, or a center causes a scheduling failure, what is the platform's liability posture and what insurance/indemnification structure do we need before going live? This is a business/legal decision that constrains ToS design, flagged here because engineering (audit logging, critical-finding-flag flow FR-IMG-08, dispute flow FR-TRUST-03) needs to know the answer to build the right safeguards.

---

## 11. Glossary

| Term | Meaning |
|---|---|
| **DICOM** | Digital Imaging and Communications in Medicine — the standard format/protocol for medical images. |
| **PACS** | Picture Archiving and Communication System — stores/manages medical images. |
| **RIS** | Radiology Information System — manages radiology workflow/scheduling/reporting at a facility. |
| **Teleradiology** | A radiologist interpreting images remotely from where they were acquired. |
| **HL7/FHIR** | Standards for exchanging healthcare information between systems. |
| **MDC** | Medical and Dental Council (Ghana) — licenses physicians, including radiologists. |
| **AHPC** | Allied Health Professions Council (Ghana) — licenses radiographers/sonographers and other allied health professionals. |
| **GHS** | Ghana Health Service. |
| **DPC** | Data Protection Commission (Ghana), enforcing Act 843. |
| **NHIS** | National Health Insurance Scheme (Ghana). |
| **MoMo** | Mobile Money (e.g., MTN MoMo). |
| **SLA** | Service Level Agreement — here, primarily report-turnaround-time commitments. |
| **GMV** | Gross Merchandise Value — total value of transactions flowing through the marketplace. |
| **KYC** | Know Your Customer — identity/credential verification process. |

---

## 12. Approval

This document requires sign-off from: Founder/CEO, Head of Product/Engineering, and Medical Advisory Lead before Technical Design Doc work begins, given the number of items in §10 that are legal/regulatory gates rather than pure product decisions.

| Reviewer | Role | Status |
|---|---|---|
| — | Founder/CEO | Pending |
| — | Head of Engineering | Pending |
| — | Medical/Regulatory Advisor | Pending |
