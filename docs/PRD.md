# Product Requirements Document (PRD)
## Radiology Uber (Working Title)

**Document version:** 0.1 (Draft for founding-team review)
**Date:** 2026-07-28
**Author:** Founding Product Team
**Companion document:** `docs/SRS.md` (system-level functional/non-functional requirements — this PRD is the "why" and "for whom"; the SRS is the "what, precisely")

---

## 1. Business Goals

A startup PRD should state what the *business* needs to be true in 12–18 months, not just what the app should do. Ranked by sequence, not by importance — each unlocks the next.

| Goal | Why it matters | How we'll know (see §10) |
|---|---|---|
| **G1 — Prove the core transaction loop works** | A patient can discover, book, pay for, and receive results from an imaging study faster/more transparently than the status quo — in one city, with real money and real patients. | Completed, paid bookings/week; report turnaround vs. baseline. |
| **G2 — Prove the supply-side wedge (teleradiology) is what gets centers to onboard** | Our thesis is that idle-scanner-capacity-due-to-no-radiologist is the real pain, not "centers want a booking widget." If centers only onboard for the booking layer and never use teleradiology, the moat is weaker than assumed and the roadmap needs to change. | % of onboarded centers actively routing studies to the teleradiology queue; report SLA adherence. |
| **G3 — Reach marketplace liquidity in Accra before expanding geographically** | A two-sided (arguably four-sided) marketplace with thin supply in a new city fails silently — patients open the app, see no slots, churn, and never come back. Depth in one city beats breadth across three. | Search-to-booking conversion; % of searches with zero available results ("unmet demand rate"). |
| **G4 — Build a defensible, licensed-professional supply network** | Radiologists/radiographers are the scarce resource. Whoever aggregates and retains a trusted, verified pool of them first has a real moat (credentialing + reputation + earnings history are hard to replicate quickly). | Active verified radiologist count; radiologist retention/repeat-shift rate. |
| **G5 — Reach a sustainable take-rate economics model** | We need proof that commission + practitioner-marketplace fees cover the cost of payments, infra, DICOM storage, and support before we can raise a growth round or expand cities. | Contribution margin per completed booking (see §7). |
| **G6 — Establish trust with medical/regulatory stakeholders** | Because harm from a missed/late/wrong report is not a normal "bug," regulatory and clinical credibility (MDC/AHPC relationships, hospital partnerships) is itself a business asset, not just a compliance checkbox. | Number of institutional (hospital) partners signed; zero unresolved critical-safety incidents. |

**Non-goal for this phase:** maximizing revenue or margin. At this stage the business goal is proving the loop and the wedge (G1–G2) with acceptable, not optimized, economics.

---

## 2. Target Users

Radiology Uber serves **demand-side** users (who need imaging done) and **supply-side** users (who provide the capacity to do it). Both sides must be designed for with equal rigor — this is not a consumer app with a thin B2B admin panel bolted on.

### 2.1 Demand side
- **Patients** booking for themselves or a dependent (child, elderly parent).
- **Referring doctors** (GPs, specialists, hospital clinicians) ordering imaging on behalf of patients.

### 2.2 Supply side
- **Imaging centers** (independent, privately owned diagnostic centers) with underused scanner capacity and/or no in-house radiologist.
- **Hospitals** (radiology departments) with existing infrastructure looking for overflow reporting capacity or a channel for outpatient bookings.
- **Radiologists** — the scarce licensed resource, working on-site and/or remote (teleradiology gig).
- **Radiographers/sonographers** — machine operators, working as staff and/or shift-gig across multiple facilities.

### 2.3 Who we are *not* targeting at launch
Rural, no-smartphone, no-mobile-money populations are real and important, but are a Phase 3+ inclusion problem (served eventually via SMS/USSD-only flows and possibly agent-assisted booking), not an MVP target segment — designing for them at MVP would slow the core loop without enough volume to validate G1–G2 first.

---

## 3. User Personas

Personas are written to be *specific enough to argue with* — vague personas produce vague product decisions.

### Persona 1 — "Ama," the Worried Booker (Patient/Demand)
- 34, works in Accra admin/customer-service job, moderate income, Android phone (mid-tier), active MoMo user.
- Her mother (63) needs an abdominal ultrasound; her GP gave a paper referral slip with no guidance on where to go or what it costs.
- Currently: calls 2–3 clinics, gets inconsistent prices, drives her mother across town, waits hours, gets a printed report a week later that she has to physically bring to the next doctor visit.
- **Job to be done:** "Let me book this for my mother in five minutes, know exactly what it costs before I commit, and get the actual result without another trip."
- **Trust anxiety:** is this a real, licensed place? Is my mother's data safe? Will payment actually go through and be refundable if we need to reschedule?

### Persona 2 — "Dr. Mensah," the Referring GP (Demand)
- 41, runs/works at a private outpatient clinic in Kumasi, sees ~30 patients/day, tech-comfortable but time-poor.
- Frustrated that he refers patients for imaging and often never sees the report — patients don't return it, or it takes so long the clinical moment has passed.
- **Job to be done:** "Let me send a referral in 30 seconds from my phone, and get the report pushed back to me automatically, especially if something is urgent."

### Persona 3 — "Nana," the Imaging Center Owner (Supply)
- 47, owns a diagnostic center in East Legon with a CT and two ultrasound machines; profitable but under capacity, especially the CT, which sits idle many afternoons.
- Has one visiting radiologist who comes twice a week; everything else waits or gets driven to a colleague's office for informal reads.
- **Job to be done:** "Fill my idle machine time with paying patients, and get a reliable, fast radiologist read without hiring one full-time I can't yet afford to keep busy."
- **Trust anxiety:** will the platform's patients actually show up and pay? Will a remote radiologist's report quality reflect on my center's reputation?

### Persona 4 — "Dr. Boateng," the Gig Radiologist (Supply)
- 38, MDC-licensed radiologist, based in Accra, works full-time at a hospital but has evening/weekend bandwidth and wants supplemental income.
- Frustrated by informal WhatsApp-group-based "can someone read this for me" networks — no structure, inconsistent pay, no record of work done.
- **Job to be done:** "Let me pick up report requests on my own schedule, get paid reliably and quickly, and build a track record I can point to."
- **Trust anxiety:** is this legally sound (teleradiology status)? Will I be exposed to liability without adequate indemnification/insurance clarity? Is the case volume/pay worth my time?

### Persona 5 — "Efua," the Shift Radiographer (Supply)
- 29, AHPC-licensed sonographer, currently employed part-time at two clinics, wants more predictable extra shifts without cold-calling clinics she knows.
- **Job to be done:** "Show me open shifts near me that match my skills, let me claim them instantly, and pay me on time."

### Persona 6 — "Mr. Owusu," the Hospital Radiology Admin (Supply, Institutional)
- 52, manages scheduling/operations for a mid-size hospital's radiology department; risk-averse, procurement-and-compliance-driven, cares about integration with existing systems (RIS/PACS) and institutional liability.
- **Job to be done:** "Give my department overflow reporting capacity and/or outpatient booking volume without forcing my team onto a whole new system that doesn't talk to what we already have."

---

## 4. User Stories

Grouped by persona/role, written in standard "As a ___, I want ___, so that ___" form, each mapped to the relevant SRS functional requirement ID(s) for traceability. Priority follows MoSCoW (Must/Should/Could) for MVP scope — matches SRS §9 phasing.

### Patient (Ama)
- **Must:** As a patient, I want to search imaging services by type and location and see real-time price and next-available-slot, so I can decide where to go without phone calls. *(FR-DISC-01–04)*
- **Must:** As a patient, I want to book and pay via MoMo in one flow, so I don't need cash on arrival. *(FR-BOOK-01, FR-PAY-01–02)*
- **Must:** As a patient, I want to book on behalf of my mother using my own account, so I don't need to create a separate account for her. *(Data model §6 of SRS)*
- **Must:** As a patient, I want automated pre-appointment instructions (e.g., fasting) and reminders, so I don't arrive unprepared or forget. *(FR-BOOK-05–06)*
- **Must:** As a patient, I want to receive my report and images digitally as soon as they're ready, so I don't have to make another trip. *(FR-IMG-06)*
- **Should:** As a patient, I want to see a center's rating and typical report turnaround before booking, so I can weigh speed against price. *(FR-DISC-03, FR-TRUST-04)*
- **Could:** As a patient, I want to pay in installments for an expensive MRI, so cost isn't a barrier. *(FR-PAY-08)*

### Referring Doctor (Dr. Mensah)
- **Must:** As a doctor, I want to create a referral in under a minute specifying study type and preferred centers, so I don't lose clinical time. *(FR-DISC-05, FR-BOOK-02)*
- **Must:** As a doctor, I want to be notified automatically when my patient's report is ready, so I don't rely on the patient bringing it back. *(FR-IMG-06)*
- **Must:** As a doctor, I want to be alerted immediately if a radiologist flags a critical finding, so I can act without delay. *(FR-IMG-08, FR-NOTIF-03)*
- **Should:** As a doctor, I want to see a patient's past imaging history (with their consent), so I have longitudinal context. *(FR-IMG-07)*

### Imaging Center Owner (Nana)
- **Must:** As a center owner, I want to list my services, prices, and real-time machine availability, so patients can book directly into my open slots. *(FR-BOOK-07)*
- **Must:** As a center owner, I want to route a completed study to a remote radiologist when I have no one on-site, so my scanner isn't generating unread images. *(FR-MATCH-01)*
- **Must:** As a center owner, I want guaranteed payout only after a completed visit, so I'm protected from no-shows. *(FR-PAY-03)*
- **Should:** As a center owner, I want to post an open radiographer shift when my regular staff is unavailable, so I don't have to cancel bookings. *(FR-MATCH-05)*
- **Should:** As a center owner, I want a payout/reconciliation statement each week, so I can manage my own bookkeeping. *(FR-PAY-06)*

### Gig Radiologist (Dr. Boateng)
- **Must:** As a radiologist, I want to toggle my availability and receive report requests matching my qualifications, so I control my own schedule. *(FR-MATCH-02–03)*
- **Must:** As a radiologist, I want a usable web-based viewer sufficient to read the study and submit a structured report, so I can work from wherever I am. *(FR-IMG-03–04)*
- **Must:** As a radiologist, I want my submitted report locked and attributed to me with a clear addendum process for corrections, so my professional record is protected. *(FR-IMG-05)*
- **Must:** As a radiologist, I want to be paid reliably per report on a predictable cycle, so this is worth my time as a side income stream. *(FR-PAY-05)*
- **Should:** As a radiologist, I want to route a complex case to a peer for a second opinion, so I'm not solely liable on hard cases. *(FR-MATCH-06)*

### Shift Radiographer (Efua)
- **Must:** As a radiographer, I want to browse and instantly claim open shifts near me matching my license/skills, so I can fill my own schedule flexibly. *(FR-MATCH-05)*
- **Must:** As a radiographer, I want my license verified once and trusted across every facility I work at through the platform, so I don't re-do paperwork per center. *(FR-ID-03–04)*

### Hospital Radiology Admin (Mr. Owusu)
- **Should:** As a hospital admin, I want the platform to integrate with our existing RIS/PACS rather than replace it, so my department doesn't need a system migration to participate. *(§7.5 of SRS)*
- **Should:** As a hospital admin, I want to expose only overflow slots/capacity to the platform, so our institutional patients and workflows are unaffected. *(FR-BOOK-07)*

### Platform Admin / Ops
- **Must:** As an Ops admin, I want a credentialing queue to verify practitioner licenses before they can accept cases, so we never expose patients to unverified providers. *(FR-ID-03–04, FR-ADM-01)*
- **Must:** As an Ops admin, I want a dashboard of SLA adherence, unmet demand, and marketplace liquidity by region, so I can tell if the marketplace is actually working, not just "has an app." *(FR-ADM-02)*
- **Must:** As an Ops admin, I want a dispute-resolution workflow with audit trail, so complaints (late report, wrong study, billing issue) have a clear, accountable path to resolution. *(FR-TRUST-03, FR-ADM-03)*

---

## 5. MVP Features

Directly aligned with SRS §9 Phase 1 scope. Restated here in **product** terms (what ships, and the outcome it's meant to produce), not requirement-ID terms.

1. **Search & real-time booking** — patients find a nearby center/study/price/slot and book in-app, including booking for a dependent.
2. **Mobile money payment (+ pay-at-center fallback)** — MoMo-first checkout with transparent, all-in pricing shown before commit.
3. **Doctor referral flow** — a doctor creates a referral the patient completes; report auto-routes back to the doctor.
4. **Center/hospital slot & order management dashboard** — providers manage calendars, check patients in, mark studies complete.
5. **Teleradiology matching queue** — the wedge feature: a center without an on-site radiologist routes a completed study to an available, verified remote radiologist, with SLA tracking and re-routing on breach.
6. **Digital report delivery + longitudinal imaging record** — patient and doctor get the report/images digitally; patient's imaging history persists across providers (with consent).
7. **Critical-finding escalation** — a distinct, high-priority notification path when a radiologist flags an urgent finding.
8. **Practitioner credentialing (manual-admin-gated MVP)** — radiologists/radiographers can't accept cases until Ops verifies MDC/AHPC license documents.
9. **Payments/payouts core** — commission capture, held-until-completion payout logic, per-practitioner payout tracking distinct from facility payout.
10. **Ratings & dispute flow** — patients rate completed visits; a basic complaint-to-resolution pipeline exists from day one (trust cannot be an afterthought in health).
11. **Admin/Ops console** — credentialing queue, dispute queue, and a marketplace-health dashboard (liquidity, SLA adherence, GMV) so the team can see whether G1–G3 (§1) are actually happening, not guess.
12. **Notifications with SMS fallback** — booking confirmations, reminders, report-ready, and critical-finding alerts all degrade gracefully to SMS.

**Explicitly deferred out of MVP** (see §6): radiographer shift marketplace at scale (a manual/Ops-brokered version may exist informally before it's a polished self-serve feature), peer-review/second-opinion flow, installment payments, NHIS/insurance billing, HL7/FHIR hospital integration, multi-language UI, AI-assisted triage, multi-city expansion.

---

## 6. Future Features (Phase 2 / Phase 3)

### Phase 2 — deepen the marketplace and trust layer
- Self-serve **radiographer shift-gig marketplace** at scale (beyond MVP's manual/Ops-brokered version).
- **Second-opinion/peer-review** routing for complex radiologist cases.
- **Installment/financing** for high-cost studies (MRI/CT).
- **NHIS and private insurance** claims exploration and integration.
- **HL7/FHIR integration** with hospital RIS/PACS/EMR systems for institutional partners.
- **Local-language support** (Twi at minimum) via voice/SMS templates, then broader UI localization.
- **Consumer-facing quality signals**: report turnaround SLA and rating detail visible in search/filter (SRS FR-DISC-03, FR-TRUST-04).
- **In-app secure messaging** between patient↔center and radiologist↔doctor.

### Phase 3 — expansion and platform maturity
- Additional Ghanaian regions/cities at depth, then evaluate other African markets (Nigeria, Kenya, Côte d'Ivoire as plausible next markets given radiologist-shortage dynamics and mobile money maturity — not committed, flagged as a future evaluation).
- **Mobile/portable imaging unit dispatch** (X-ray/ultrasound to a location) — the feature that most literally matches the "Uber" analogy; deliberately deferred because it's operationally heavy (equipment, transport, licensing) relative to its incremental value once the core marketplace works.
- **AI-assisted worklist prioritization/triage** for radiologists (flagging likely-urgent studies for faster human review) — explicitly *not* AI diagnosis/CAD (see SRS §1.5); framed as an efficiency layer for the scarce radiologist resource, evaluated carefully given regulatory and liability sensitivity.
- **SMS/USSD-only booking path** for the rural/no-smartphone segment excluded from MVP (§2.3).
- Loyalty/subscription tier for frequent bookers (e.g., families managing recurring imaging for chronic conditions).

---

## 7. Revenue Model

Uber-style multi-sided take-rate economics, adapted to what's actually monetizable in a regulated medical marketplace (we cannot, for instance, dynamically surge-price emergency imaging the way Uber surge-prices a ride — that's a regulatory and ethical non-starter).

### 7.1 Primary revenue streams

| Stream | Mechanism | Notes |
|---|---|---|
| **Booking commission** | % fee on each completed imaging booking, charged to the imaging center/hospital (standard marketplace take-rate, similar in spirit to Uber's driver-side commission). | Primary MVP revenue line. Rate should start conservative (e.g., single-digit-to-low-teens %) to win center trust while proving G1–G3; increasing take rate later is easier than winning back centers burned by an aggressive early rate. |
| **Teleradiology facilitation fee** | A fee (either a flat per-report fee or a % of the reporting fee) taken on each report routed through the platform's matching queue, distinct from the booking commission. | This is arguably the *higher-margin, more defensible* revenue line, since it monetizes the actual scarce-resource matching (the wedge), not just calendar/payment plumbing a center could technically replicate. |
| **Radiographer shift facilitation fee** | Similar small facilitation fee on shift-gig placements (Phase 2 at scale). | Smaller line item initially; grows with Phase 2 marketplace depth. |
| **Payment processing spread** | Small margin on payment flow (where commercially viable given MoMo/PSP fee structures) — treated as a pass-through/breakeven line, not a profit center, at MVP. | Must not be presented to users as a hidden fee — SRS FR-PAY-01 requires all-in transparent pricing. |

### 7.2 Secondary/future revenue streams (Phase 2+)
- **Institutional SaaS/integration fee** for hospitals wanting deeper RIS/PACS integration and dedicated support (a B2B software line layered on top of the marketplace take-rate).
- **Featured placement** for centers in search results (must be handled carefully — cannot compromise the price/turnaround transparency that is core to user trust; more analogous to a "sponsored" label than pay-to-rank).
- **Financing partner referral fee** if installment payments (§6) are provided via a third-party lender rather than platform-held credit risk.
- **De-identified, aggregate market insights** (e.g., regional imaging demand trends) sold to health-sector stakeholders — strictly opt-in/consented and de-identified per SRS §5.5; flagged as ethically sensitive and requiring explicit legal/ethics review before ever pursuing, not assumed as a default revenue line.

### 7.3 Unit economics discipline
Per G5 (§1), before any city/feature expansion we need visibility into **contribution margin per completed booking** — commission revenue + teleradiology fee, minus payment processing cost, minus SMS/notification cost, minus proportional customer support/dispute-handling cost, minus proportional credentialing/Ops cost. This should be tracked from the first real transaction, not estimated retroactively.

---

## 8. Competitor Analysis

Think in three tiers: (a) direct/adjacent digital-health booking competitors regionally, (b) global analogues whose model we're borrowing from, (c) the real incumbent — the informal status quo.

### 8.1 Tier A — Direct/adjacent players (Ghana & Africa health-tech)
| Competitor type | What they do | Where we differ |
|---|---|---|
| **General telemedicine/appointment apps** (e.g., platforms offering GP teleconsultation and clinic-appointment booking in Ghana/Nigeria) | Book a doctor consult, sometimes basic diagnostics booking. | They're consult-first, not imaging/radiology-specialist. None solve the radiologist-supply bottleneck; imaging is usually just a referral link-out, not an integrated marketplace with teleradiology matching. |
| **Individual imaging center apps/websites** | Some larger private diagnostic centers (e.g., large private hospital groups) have their own booking portal. | Single-provider, no price comparison, no cross-center radiologist marketplace, no portability of patient records across providers. |
| **Informal teleradiology networks (WhatsApp groups, personal relationships between center owners and radiologists)** | This is the *actual* current competitor for the reporting-matching function — a center owner calls or WhatsApps a radiologist they know. | No structure, no SLA, no payment protection, no credentialing verification, no audit trail, no discoverability for a center without an existing personal network. This is exactly the informal-to-structured transition Uber made for taxi-hailing — our closest true analogue. |

### 8.2 Tier B — Global model analogues (not direct competitors, but instructive)
| Company | What we borrow | What doesn't transfer directly |
|---|---|---|
| **Uber/Bolt** | On-demand matching, transparent pricing shown upfront, two-sided liquidity/rating discipline, take-rate model. | No surge pricing (ethically/regulatorily inappropriate for medical care); supply-side here requires licensing verification Uber's driver onboarding never needed. |
| **Nomad Health / Trusted Health (US gig healthcare staffing marketplaces)** | Credential-gated marketplace for licensed clinical professionals doing shift/gig work — closest analogue to our radiographer/radiologist supply side. | Built for a market with mature digital licensing-verification infrastructure and insurance norms; Ghana requires more manual verification process at MVP (SRS FR-ID-04). |
| **Teladoc / Radiology Partners (teleradiology-at-scale in the US)** | Proof that teleradiology as a structured, SLA'd service is a real, fundable business model, not a novel idea. | Operates in a market with abundant radiologist supply relative to Ghana; our differentiation is solving genuine *scarcity*, not just convenience. |
| **Practo / 1mg (India)** | Multi-sided health marketplace (bookings + diagnostics + pharmacy) proving the model works in a price-sensitive, mobile-first, informally-organized healthcare market structurally similar to Ghana's. | India's diagnostics chains (large national lab networks) are more consolidated than Ghana's fragmented imaging-center landscape — our supply-acquisition motion looks more like many small B2B sales relationships than a few big chain partnerships. |

### 8.3 Tier C — The real incumbent: the status quo
The actual competitor most patients and centers are choosing today is **doing nothing differently** — phone calls, walk-ins, cash, physical films, and informal radiologist favors. This means the bar to beat is not a slicker app than a rival startup; it's proving the *habit change* is worth it (faster, cheaper-or-equal, more transparent, more reliable) for both a patient who's never used a health app and a center owner who's run their business the same way for years. Our GTM and onboarding design should treat this as the primary competitive threat, not underestimate it because it doesn't show up as a named rival.

---

## 9. Risks

Framed the way an experienced PM should: risk, why it matters, leading indicator to watch, and mitigation stance (not just "we'll monitor it").

| # | Risk | Why it matters | Leading indicator | Mitigation stance |
|---|---|---|---|---|
| R1 | **Supply-side cold start** — not enough imaging centers or radiologists onboarded to make the app useful in any given search. | A marketplace with thin supply looks broken to the first users who try it, and word-of-mouth works against you as hard as it works for you. | Search results with zero/low availability ("unmet demand rate," §10). | Concentrate launch in one city/district; consider direct/manual matching (Ops-brokered) before the self-serve matching engine is fully trusted; don't open patient-facing marketing until supply density crosses a minimum threshold. |
| R2 | **Regulatory uncertainty on teleradiology** — if MDC guidance doesn't clearly permit remote reporting as we've designed it, the core wedge feature is legally exposed. | This is the differentiated feature (§1 G2); if it can't ship as designed, the business model materially changes. | Legal/advisory confirmation status (SRS §10, open question 1). | Treat as a pre-launch gate, not a background task; have a fallback design (e.g., always require an in-country, always-licensed-in-Ghana radiologist even for "remote" reads) ready if the broadest interpretation isn't confirmed. |
| R3 | **A missed or delayed critical finding causes patient harm.** | This isn't a normal product bug — it's the single highest reputational and human-safety risk in the entire product. | SLA-breach rate on critical-flagged studies; any dispute tagged "clinical harm." | Critical-finding flow (SRS FR-IMG-08) must be over-engineered for reliability relative to every other notification path; liability/insurance posture must be resolved before launch (SRS open question 6), not after an incident. |
| R4 | **Trust deficit on payments** — patients distrust paying upfront to an app for a medical service they haven't received yet, especially early on with no track record. | Payment friction directly kills conversion at the exact moment we need to prove G1. | Cart abandonment rate at payment step; % choosing pay-at-center fallback (a proxy for trust level). | Keep pay-at-center as a real fallback option through early cohorts rather than forcing prepayment; be transparent about refund policy; consider an initial "trust-building" cohort (e.g., partner clinics we personally vouch for) before wide marketing. |
| R5 | **Center/hospital channel conflict** — a center may worry the platform reduces their pricing power, commoditizes them next to cheaper competitors, or exposes them to a radiologist marketplace that reduces their negotiating leverage with radiologists they currently rely on informally. | If centers perceive net harm rather than net capacity-utilization gain, supply-side onboarding (R1) gets much harder. | Center churn/inactivity rate post-onboarding; qualitative onboarding call feedback. | Lead sales conversations with the idle-capacity/teleradiology value prop (fills otherwise-wasted machine time), not the "more patient volume" pitch alone, since the former is a clearer, less threatening win. |
| R6 | **Data breach / privacy incident.** | Medical imaging + PII is exactly the kind of data whose breach is both a legal (Act 843) and existential-trust event. | Any unresolved item on the SRS §8 security checklist at launch. | Treat the SRS §8 checklist as a hard launch gate; third-party security review before any real patient data is processed, including pilots. |
| R7 | **Practitioner supply churn** — gig radiologists/radiographers who don't find volume/pay attractive enough stop engaging, and the platform can't fulfill matched requests. | The teleradiology queue (the wedge) is worthless if there aren't enough responsive radiologists behind it. | Radiologist response-to-offer rate and repeat-engagement rate (§10). | Track and optimize practitioner-side economics and experience with the same rigor as patient-side; treat "is this worth a radiologist's time" as a first-class product question, not an afterthought to patient UX. |
| R8 | **Connectivity/device assumptions don't hold in practice** — real-world 3G drop-out, low-end devices, and low digital literacy cause booking abandonment or support burden higher than modeled. | Could invalidate usability assumptions baked into SRS §2.3/§5.6. | App crash/error rate on low-end devices; support-ticket volume per booking. | Test on genuinely low-end devices/networks pre-launch, not just office Wi-Fi and flagship phones; keep SMS fallback paths as real, tested flows, not theoretical ones. |
| R9 | **Regulatory/compliance scope creep risk** — health data regulation, medical council rules, or facility licensing requirements are stricter or slower-moving than assumed, delaying launch. | Could push timeline well past what founders/investors expect. | Status of SRS §10 open questions; DPC registration timeline. | Start legal/regulatory engagement in parallel with product build, not sequentially after building — these tracks should run concurrently from week one. |

---

## 10. Success Metrics

Structured as a **North Star Metric**, a small set of **input metrics** that drive it (the things the team actually has weekly control over), and **guardrail metrics** (things that must not silently degrade while we push the North Star).

### 10.1 North Star Metric
**Completed, paid imaging bookings per week where the report was delivered within the platform's stated turnaround SLA.**
This single metric captures demand (bookings happened), supply health (a provider + radiologist fulfilled it), and the core value proposition (turnaround, our differentiator vs. status quo) — not just raw booking volume, which could hide a broken supply side.

### 10.2 Input metrics (leading indicators the team can act on weekly)
- **Search-to-booking conversion rate** (funnel health, demand side).
- **Unmet demand rate**: % of searches returning no available slot matching the patient's need (supply-density health).
- **Teleradiology queue fulfillment rate**: % of routed studies matched to a radiologist within SLA, and **radiologist offer-acceptance rate** (supply-side wedge health, directly tied to Business Goal G2).
- **Active verified radiologists/radiographers** (supply pool depth, tied to G4) and their **repeat-engagement rate** (are they coming back for more work, or churning after one gig).
- **Active onboarded centers/hospitals** and their **post-onboarding activity rate** (did they actually start using it, not just sign up).
- **Payment completion rate** and **% choosing pay-at-center fallback** (trust proxy, tied to R4).
- **Report turnaround time (p50/p90)**, tracked against the SLA promised at booking.

### 10.3 Guardrail metrics (must not degrade)
- **Critical-finding notification latency** (time from radiologist flag to doctor/patient notification) — must stay near-zero regardless of what else is being optimized.
- **Dispute rate** and **dispute resolution time**.
- **Any data-access-audit anomaly** (SRS FR-ADM-05) — unexplained access patterns to patient records are a guardrail, not a KPI to "improve" upward.
- **Provider/practitioner churn rate** — growth in bookings that comes from burning through supply (over-scheduling providers, under-paying practitioners) rather than sustainable capacity is a false signal.

### 10.4 Business-level milestones (tied to §1 goals, checked quarterly rather than weekly)
- G1: sustained week-over-week growth in the North Star metric within the launch city for two consecutive quarters.
- G2: teleradiology queue fulfillment rate and center adoption of it cross a threshold indicating it's a genuine habit, not a novelty (e.g., majority of no-radiologist centers routing the majority of their eligible studies through it).
- G3: unmet-demand rate in the launch city falls below a target threshold before any new-city launch decision is even discussed.
- G5: positive contribution margin per completed booking (§7.3) achieved before scale-up spend increases.
- G6: at least one institutional hospital partner live in production, and zero unresolved critical-safety incidents.

---

## 11. Approval

Requires sign-off from Founder/CEO, Head of Product/Engineering, and Medical Advisory Lead — same gating group as the SRS (`docs/SRS.md` §12), since MVP feature scope (§5) and revenue model (§7) both depend on regulatory questions still open in SRS §10.

| Reviewer | Role | Status |
|---|---|---|
| — | Founder/CEO | Pending |
| — | Head of Product/Engineering | Pending |
| — | Medical/Regulatory Advisor | Pending |
