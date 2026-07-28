# UX Design Specification
## Radiology Uber (Working Title) — Every Screen, Every App

**Document version:** 0.1 (Draft for founding-team review)
**Date:** 2026-07-28
**Author:** Senior UX Design (founding team)
**Companion documents:** `docs/SRS.md` (requirements), `docs/PRD.md` (personas, business goals), `docs/DATABASE_DESIGN.md` (data model), `docs/ARCHITECTURE.md` (client platforms per app)
**Scope note:** Screen-by-screen UX specification — layout, content, states, and interaction rationale. No visual mockups, no code, no component libraries specified beyond what's already fixed in `docs/ARCHITECTURE.md` (React Native for the two mobile apps, React/Next.js for the four web surfaces).

---

## 0. Cross-Cutting Design Principles

Stated once, applied everywhere below, so each screen description doesn't have to re-justify the same choices.

1. **Design for the lock-screen notification, not just the open app.** Push/SMS notifications (booking confirmed, report ready, shift offered, critical finding) are a primary entry point, not a side channel — every screen that can be reached from a notification is designed to make sense as a *landing* screen, not just a screen navigated to in-context.
2. **Every screen has an explicit loading state, empty state, and error state — designed, not defaulted to a spinner or a blank page.** Given the connectivity reality established in `docs/SRS.md` §2.3, "the network is fine" is the exception state to design for, not the assumption.
3. **Trust signals are load-bearing UI, not decoration.** Verification badges (facility license, practitioner credential), price transparency, and rating visibility appear at the point of decision (search results, booking confirmation), not buried in a details page — this directly answers the trust-anxiety line in every PRD persona (§2 there).
4. **Low-literacy, low-vision, and low-end-device tolerant by default:** minimum 16px body text, high-contrast color choices, icons paired with text labels (never icon-only for a primary action), and every critical action confirmable via a large, unambiguous tap target.
5. **SMS/voice fallback is a first-class UI state, not an app-only assumption.** Any screen whose primary value is a notification (tracking, report-ready) has a corresponding "what the SMS version says" consideration noted, since a meaningful fraction of moments (dead battery, no data bundle) are handled outside the app entirely.
6. **Role-appropriate device assumptions drive layout, not just responsive breakpoints.** The patient and radiographer apps are designed mobile-first (one-handed, on the move); the radiologist portal, imaging-center/hospital dashboards, and admin panel are designed desktop-first (dense data, keyboard/mouse), consistent with `docs/ARCHITECTURE.md` §4's platform choices per persona.
7. **Immutability and irreversible actions get a deliberate extra step.** Signing a radiology report, cancelling a booking past the free-cancellation window, or suspending a practitioner's credential all require an explicit confirmation step with the consequence spelled out in plain language — never a single accidental tap away.

---

# PART A — Patient App

Mobile-first (React Native), one-handed usability, offline-tolerant (`docs/ARCHITECTURE.md` §4.1). Designed around Persona 1 ("Ama," PRD §3) and Persona 2's referral hand-off ("Dr. Mensah" creating a referral the patient completes).

## A1. Login

**Purpose:** Get a new or returning user authenticated in the fewest, least-intimidating steps possible, without requiring a password (SRS FR-ID-02).

**Layout:**
- Top: app logo/wordmark, a one-line tagline ("Book imaging near you, in minutes").
- Center: a single phone-number input field (country code pre-set to +233, editable), large numeric keypad-triggering input.
- Primary button: "Send code," full-width, high-contrast.
- Below: small-print language toggle (English / Twi — Twi grayed out with a "coming soon" tag if not yet localized) and a link to Terms/Privacy.
- Second screen (OTP step): 6 boxed digit inputs, auto-advancing, with a visible countdown ("Resend code in 0:45") and a "Didn't get it? Resend via SMS" link that becomes active after the countdown.

**Interactions & states:**
- Invalid/incomplete phone number: inline error under the field, button stays disabled rather than allowing a failed submit.
- OTP auto-read: on Android, auto-fill the code from SMS without the user copy-pasting (a small but real friction reduction for this specific user base).
- New number → proceeds to a minimal 2-field profile completion (full name, date of birth) before landing on Home; returning number → straight to Home.
- Failure/timeout state: a plain-language retry message ("We couldn't verify that code. Try again or request a new one") — never a raw error code.

**Design rationale:** No password field anywhere in this flow, matching SRS §2.3's SIM-based trust model — asking a first-time user in a low-trust category (a new health app) to invent and remember a password is friction with no corresponding benefit here.

---

## A2. Home

**Purpose:** The daily-use anchor screen — surfaces what the patient needs *right now* (an upcoming appointment, a ready report) before anything promotional, and is the primary entry point into Search.

**Layout (top to bottom):**
- Header: greeting ("Hi, Ama"), a profile/avatar icon (top-right, → Profile), a family-switcher chip if the account has dependents ("Booking for: Myself ▾").
- **"Up next" card** (only shown if a booking exists in requested/confirmed/checked_in state): facility name, study type, date/time, a status pill (matches Tracking screen's status language), tap → Tracking screen.
- **"Report ready" banner** (only shown if a report has landed since last visit, high-visibility color, dismissible only by viewing it): tap → Reports screen, specific report.
- **Primary CTA:** a prominent "Find imaging near you" search bar/button, always visible even with cards above it — this is the screen's main job even on a day with no active booking.
- **Quick modality shortcuts:** a horizontal scroll of common study types (X-ray, Ultrasound, CT, MRI) as tappable chips that pre-fill Search's filter.
- **Recent activity strip:** last 2–3 completed bookings, small, low-visual-weight, tap → that booking's report/detail.

**States:**
- First-time user, no bookings yet: "Up next" and "recent activity" sections are replaced by a friendly empty state illustration + "Book your first scan" CTA — the screen never looks broken or sparse.
- Offline: cached last-known state shown with a small persistent banner ("You're offline — showing your last update"), not a blocking error.

**Design rationale:** Ama's stated job-to-be-done (PRD §3) is urgency-driven ("let me book this for my mother in five minutes") — Home is deliberately not a marketing/browse-first landing page; it gets out of the way of both "check on what I already booked" and "start a new booking" as fast as possible.

---

## A3. Search

**Purpose:** Let the patient find, compare, and select where to book (SRS FR-DISC-01–04) — the screen where price/turnaround/trust signals matter most, per PRD §8's competitive positioning against price-opaque phone-call booking.

**Layout:**
- Top: search bar (pre-filled from Home's modality chip if that's how the user arrived) + a location indicator ("Near: East Legon, Accra ▾", tappable to change).
- Filter row (horizontally scrollable chips): modality, price range, "soonest available," distance, rating — tapping opens a bottom-sheet filter panel for finer control (price slider, specific date).
- **Toggle: List / Map view** — list is the default (faster to scan on a small screen and on slow connections); map is a secondary, opt-in view for users who think spatially about "what's near me."
- **Result card (repeated):** facility name + verification badge (a small, unmissable checkmark icon tied to `facilities.verification_status = 'verified'`), distance, price (large, prominent — price transparency is a stated trust requirement, FR-PAY-01), next available slot time, star rating with review count, and — where available — a "Reports usually ready in ~X hrs" turnaround chip (FR-DISC-03).
- Tapping a result → Booking screen for that facility/service.

**States:**
- Zero results: not a dead end — shows the nearest available alternative modality/location with an explicit "No slots matching your filters nearby. Here's the closest option" message, since a silent empty state is exactly the marketplace-thin-supply failure flagged in PRD risk R1 and should never look like the *app* is broken.
- Loading: skeleton result cards, not a spinner, so the screen's shape is visible immediately even on a slow connection.

**Design rationale:** Price and turnaround are surfaced on the result card itself, not one tap deeper — this is deliberate, because the entire point of the product versus the status-quo phone-call-and-hope method (PRD §8.3) is that this information should never require a conversation to obtain.

---

## A4. Booking

**Purpose:** Convert a selected search result into a confirmed, paid (or pay-later) appointment — a short wizard, not a single dense form, since it's asking for several distinct decisions (who, when, any prep instructions) that are each easy to get wrong if crammed together.

**Layout — presented as a 4-step flow within one screen (progress dots at top):**

1. **Who is this for?** Radio-style list: "Myself," each existing dependent by name, and an "Add a dependent" option (opens a lightweight 3-field form: name, DOB, relationship) — directly implements the family-booking requirement from `docs/DATABASE_DESIGN.md` §2.4.
2. **When?** A calendar/slot picker showing only genuinely available slots (never a slot that could still fail on submit — reflects the real-time availability backing in `facility_service_slots`), grouped by day, with machine/equipment context suppressed from the patient's view (that's a provider-side concern, not patient-facing).
3. **Before you arrive:** auto-populated prep instructions specific to the selected study (e.g., "Fast for 6 hours before this scan") pulled from the service's `pre_appointment_instructions` (FR-BOOK-05) — shown as a clear, can't-miss checklist, not buried in fine print.
4. **Review & confirm:** a summary card (facility, study, date/time, beneficiary, total price broken into service fee + any platform fee — full transparency, FR-PAY-01) and the cancellation policy stated in plain language before the final "Confirm booking" button, which proceeds to Payment.

**States:**
- Slot becomes unavailable between selection and confirm (a real race condition, `docs/ARCHITECTURE.md` §5.5): a non-blaming inline message ("That time was just taken — here are the next options") re-presents step 2 rather than a generic error.
- Referral-originated booking: steps 1–3 pre-filled from the doctor's referral (SRS FR-BOOK-02), with a visible "Referred by Dr. Mensah" tag so the patient understands why fields are already filled.

**Design rationale:** Splitting into steps rather than one long form reduces the chance of an anxious, unfamiliar user (Ama's persona explicitly notes "trust anxiety") abandoning midway — each step asks exactly one question.

---

## A5. Payment

**Purpose:** Convert the confirmed booking into a paid transaction with the least possible friction, defaulting to the payment method this market actually trusts (SRS §2.3, mobile money-first).

**Layout:**
- Order summary strip at top (collapsed by default, expandable) — never lets the user lose sight of *what* they're paying for while focused on *how*.
- **Payment method selector**, MoMo listed first and visually primary (network logo icons — MTN, Vodafone/Telecel, AirtelTigo — auto-detected from the entered number where possible), Card as a secondary tab, "Pay at the center" as a clearly-available third option, not hidden — preserving the trust-building fallback called out in PRD risk R4.
- MoMo flow: phone number confirmation (pre-filled from account) → "Approve on your phone" waiting state with a visible spinner and plain instructions ("Check your phone for a prompt from [Network]") → success/failure resolves automatically via webhook.
- Card flow: hands off to the PSP's hosted, tokenized checkout (`docs/ARCHITECTURE.md` §9.1) — the app never renders its own card-number field, both for PCI-scope reasons and so the patient recognizes a familiar, trusted payment UI rather than an unfamiliar custom form.
- "Pay at the center" flow: no payment UI at all — a direct confirmation screen stating the amount due on arrival and that the slot is held.

**States:**
- MoMo timeout (a real, common failure mode): after a reasonable wait, offer "Still waiting? Try again or choose another method" rather than an indefinite spinner.
- Success: an unambiguous confirmation screen (not just a toast) with the booking reference, before auto-advancing to Tracking.
- Failure: a specific, non-technical reason where the PSP provides one ("Payment declined — insufficient balance"), with an immediate retry path, never a dead end that loses the held slot without warning.

**Design rationale:** Defaulting the payment-method selector to MoMo (rather than a generic "choose a method" with equal visual weight) reflects that this is the expected, trusted default for this market — putting card payment first would be optimizing for a Western-app convention that doesn't match this user base.

---

## A6. Tracking

**Purpose:** Answer "where does my appointment stand right now" without a phone call — the digital replacement for the anxious, uninformative waiting the status quo produces (PRD §1.1).

**Layout:**
- A vertical status timeline (not a percentage bar — discrete, named stages are clearer for this kind of process): **Confirmed → Checked in → In progress → Images acquired → Report pending → Report ready**, mirroring `bookings.status` (`docs/DATABASE_DESIGN.md` §4.2) in patient-friendly language, with the current stage highlighted and a timestamp on each completed stage.
- Facility card: name, address, a "Get directions" button (opens Maps), phone number (tap to call).
- Context-sensitive helper text per stage — e.g., at "Report pending," a plain-language line: "Your radiologist is reviewing your images. Most reports are ready within [SLA] hours" — turning an abstract wait into a concrete, trust-building expectation (directly supports the SLA-transparency requirement, SRS FR-DISC-03/FR-MATCH-04).
- Secondary actions (visible but not primary): "Reschedule," "Cancel" (only enabled pre-check-in, per the cancellation policy shown in Booking step 4), "Contact support."
- If a critical finding has been flagged (FR-IMG-08): the entire screen's tone changes — a clear, calm but unmissable banner ("Your doctor has been notified about an important finding — please check for a call or message") rather than leaving the patient to interpret a routine-looking status update for something urgent.

**States:**
- No active booking: this screen isn't reachable independently — Home's "Up next" card is the only entry point, so there's no empty state to design (a deliberate simplification).
- Push notification deep-link: tapping a "your images have been captured" notification lands directly on this screen at the current stage, already scrolled/focused there.

**Design rationale:** A named-stage timeline rather than a spinner or vague "in progress" message is the single highest-leverage UX choice in the whole patient app for the trust problem PRD identifies — it's the concrete expression of "more transparent than the status quo."

---

## A7. Reports

**Purpose:** Deliver the actual clinical output — the report and images — digitally, and let it persist as a longitudinal record across providers (FR-IMG-06/07).

**Layout:**
- A reverse-chronological list of past studies, each row showing: study type, facility, date, and a small status tag ("Ready" / "Report pending").
- Tapping a "Ready" entry opens the **Report Detail** view:
  - Header: study type, date, facility, reporting radiologist's name.
  - **Impression** shown first and most prominently (the clinically actionable summary), with the fuller **Findings** text below it, collapsed by default with a "Show full findings" expander — most patients want the headline, not the full clinical narrative, and a doctor who needs the full text can expand it.
  - Image thumbnail strip → tap opens a lightweight image viewer (pan/zoom on key frames — not a full DICOM viewer; that stays on the radiologist's web app per `docs/ARCHITECTURE.md` §4.4/§4.1) with a "View full study" option that hands off to a web viewer link for anyone wanting more.
  - Actions: **Share with a doctor** (generates a secure, consent-gated link or forwards within-platform to a doctor account — implements the `consent_records` data-sharing flow, `docs/DATABASE_DESIGN.md` §9.1) and **Download PDF**.
  - If flagged critical: a persistent, non-dismissible banner at the top of this specific report reiterating the urgency and a "Call my doctor" quick action.

**States:**
- Dependent's reports: filterable/switchable via the same family selector used in Booking, so a guardian can review a dependent's history without confusion about whose record they're viewing.
- No reports yet: empty state pointing back to Search/Booking, not a bare "no data" message.

**Design rationale:** Leading with the Impression rather than raw Findings respects that most patients are not clinically trained to parse a full radiology narrative — the headline conclusion is what answers "am I okay," and the detail is available on demand for those who want or need it (including the patient's own doctor).

---

## A8. Profile

**Purpose:** Account management, family/dependents, consent, and settings — the "everything else" screen, but each section here is a real requirement, not filler.

**Layout (sectioned list):**
- Account: name, phone number (verified, non-editable without a re-verification flow), email (optional, editable).
- **Family members:** list of dependents with edit/remove, matching Booking step 1's data.
- **Payment methods:** saved MoMo number(s)/cards (tokenized reference only, never raw card data client-side — consistent with `docs/ARCHITECTURE.md` §9.1).
- **Privacy & consent:** a clear, plain-language list of what's been consented to (data storage, sharing with which doctors, any secondary use) with per-item toggles/revoke controls — a direct, patient-facing implementation of `consent_records` (`docs/DATABASE_DESIGN.md` §9.1) rather than a legal document nobody reads.
- **Notification preferences:** push vs. SMS preference where the user has a choice (critical alerts are never optional/mutable, per SRS FR-NOTIF-03 — this is stated in the UI, not hidden).
- Language setting, Help/Support (link to dispute/complaint flow, FR-TRUST-03), Terms/Privacy Policy, Log out.

**Design rationale:** Surfacing consent as an active, editable list (not a one-time signature buried at signup) is a deliberate trust-building choice consistent with SRS §5.5's "opt-in, not opt-out" requirement for secondary use — most apps hide this; here it's treated as a feature, not a compliance afterthought.

---

# PART B — Radiographer App

Mobile-first (React Native, shares patient app's shell per `docs/ARCHITECTURE.md` §4.4), designed around Persona 5 ("Efua," PRD §3) — a licensed technologist working shifts across multiple facilities.

## B1. Login

**Purpose:** Authenticate a credentialed professional, distinct from the patient's password-less flow.

**Layout:** Phone/email + password fields, "Forgot password" link, then a mandatory second factor (SMS OTP) screen — matching `docs/ARCHITECTURE.md` §6.2's MFA requirement for practitioner accounts.

**States:** An account with `verification_status = 'pending'` or `'rejected'` logs in successfully but lands on a **restricted-access Home** (see B2) rather than being blocked at login — the person is real and authenticated, just not yet cleared to work, and the UI should say so plainly rather than presenting a confusing generic error.

**Design rationale:** Distinguishing "can't log in" from "logged in but not yet verified to work" avoids a support-ticket-generating dead end for a newly-registered radiographer waiting on document review.

---

## B2. Home / Today's Worklist

**Purpose:** The shift-start screen — what's on today, and am I available for more.

**Layout:**
- **Availability toggle** at the top, large and unambiguous (Online/Offline), directly controlling `radiographer_profiles.availability_status` — this is the single most important control on the screen, since it's what makes this person visible to the shift marketplace.
- **Verification banner** if not yet verified: a calm, informative card explaining what's pending ("Your AHPC license is under review — you'll be notified once approved") with no other functionality blocked around it except case/shift acceptance.
- **Today's confirmed shifts/assignments:** cards showing facility name, time window, and a "Start" action that becomes enabled at the shift's actual start time.
- **License expiry warning** (if `license_expiry_date` is approaching): a dismissible-but-recurring banner well before expiry, not a surprise lockout on the day it lapses.

**Design rationale:** Putting the availability toggle at the very top, above even today's assigned work, reflects that for a gig-model worker this is a daily, deliberate business decision ("am I working today"), not a passive setting buried in a menu.

---

## B3. Shift Marketplace

**Purpose:** Browse and claim open shift-gig postings from facilities needing coverage (FR-MATCH-05) — Efua's stated job-to-be-done in PRD §3.

**Layout:**
- A list of open shift postings, each card: facility name + distance, modality required (matched against the radiographer's own qualified modalities — only compatible shifts are shown, never a mismatch the person can't legally accept), date/time window, and pay rate.
- Filter/sort: by distance, by date, by pay.
- Tapping a card → detail sheet with full facility info and a single, prominent **"Claim this shift"** button.
- **My upcoming shifts** tab alongside "Available," showing what's already been claimed.

**States:**
- A shift claimed by someone else between viewing and tapping (same race-condition class as booking a slot, `docs/ARCHITECTURE.md` §5.5): immediate, non-blaming feedback ("This shift was just claimed — here are similar ones") rather than a hard error.
- Empty state (no open shifts matching qualifications/area): honest, not padded with irrelevant results — "No shifts near you right now. We'll notify you when one opens."

**Design rationale:** Only ever surfacing modality-qualified shifts (rather than showing everything and relying on the radiographer to self-filter by eligibility) prevents a credentialing mismatch from ever reaching the acceptance step at all — a safety property expressed as a UX simplification.

---

## B4. Study Workflow (Check-in → Capture → Complete)

**Purpose:** The in-facility working screen — moves a specific booking through its operational lifecycle (FR-IMG-01) as the radiographer actually performs the study.

**Layout:**
- Patient identification card at top: name, DOB, study type, any referral clinical notes — enough to confirm "right patient, right study" before proceeding (a basic safety check deliberately surfaced, not assumed).
- A large, sequential action button that changes label/state as the study progresses: **"Check in patient" → "Start study" → "Mark images acquired."** One button, one clear next step at a time, rather than a form with multiple fields to fill in — this screen is used with gloved/busy hands in a clinical setting, so minimizing taps and decisions matters more than density.
- A secondary "Flag an issue" link (patient no-show, equipment problem) that routes to a short reason form rather than silently leaving a booking stuck.
- On "Mark images acquired," a confirmation that the study has been queued (either to an in-house radiologist or the teleradiology matching queue, invisible distinction to the radiographer — that routing decision, FR-MATCH-01, happens system-side based on `facilities.has_onsite_radiologist`).

**Design rationale:** Deliberately linear and single-action-at-a-time, because this screen is used in the middle of a physical clinical workflow, not at a desk — every extra decision point is a real cost to someone operating a scanner.

---

## B5. Earnings & Payouts

**Purpose:** Transparent, trustworthy visibility into what's owed and what's been paid (FR-PAY-05/06) — this is a primary reason a gig worker keeps using the platform (PRD §1 G4/persona job-to-be-done).

**Layout:**
- Summary card: current pending balance, next payout date.
- List of completed shifts/studies with per-item pay amount, reconciled against `payout_line_items` (`docs/DATABASE_DESIGN.md` §7.5).
- Past payout history, each expandable to see its line-item breakdown — "why was I paid this amount" must always be answerable from this screen alone, per the architecture's reconciliation design intent.

**Design rationale:** A gig worker with no institutional employer relationship has no other source of truth for their earnings than this screen — it is treated with the same transparency rigor as the patient's price display, not as an afterthought admin page.

---

## B6. Profile & Credentials

**Purpose:** Manage identity, licensing documents, and qualified modalities.

**Layout:** Personal info, AHPC license number and expiry (read-only once verified, with a "request update" flow for renewals), qualified-modality tags (editable, triggers re-review if changed), uploaded credential documents with their review status visible per document (pending/verified/rejected, with rejection reason shown plainly if applicable — matches `practitioner_credential_documents`, `docs/DATABASE_DESIGN.md` §2.10), facilities currently worked at, notification settings, log out.

**Design rationale:** Showing per-document review status (not just one overall badge) lets a radiographer understand exactly what's still pending if only part of their submission has been reviewed — avoids a vague "still pending" state with no actionable information.

---

# PART C — Radiologist Portal

Web-first (React, embeds the OHIF viewer per `docs/ARCHITECTURE.md` §4.4/§11), designed around Persona 4 ("Dr. Boateng," PRD §3) — a licensed radiologist doing structured gig reporting work around an existing job.

## C1. Login

**Purpose:** Same practitioner-grade auth as the radiographer app (password + MFA), web-optimized (keyboard-friendly, larger form).

**Design rationale:** Identical reasoning to B1; not repeated in full — see B1.

---

## C2. Worklist Dashboard

**Purpose:** The radiologist's home screen — a queue of work, ordered by urgency, with the availability control that makes the whole matching engine function.

**Layout:**
- **Availability toggle** (Online/Busy/Offline) prominent at the top, identical role to B2's — this radiologist is the scarce resource the entire product is built around (PRD §1 G4), and this control is the mechanism by which they're offered work at all.
- **Active offers panel:** any pending match offers awaiting this radiologist's accept/decline, each with a visible countdown to the response deadline (FR-MATCH-03) — time-boxed and honest about urgency, since an unaddressed offer times out and re-routes.
- **My queue:** accepted-but-not-yet-reported studies, sorted with urgent/flagged-priority cases visually distinguished (a red/amber urgency indicator) at the top regardless of arrival order — this is the queue-ordering-not-diagnosis assistive layer described conceptually in `docs/ARCHITECTURE.md` §13.3, manually flagged at MVP (by referring-doctor urgency marking, FR-BOOK-08) rather than model-driven yet.
- Each queue item: patient age/sex (not full identity beyond what's clinically necessary at a glance), modality, facility, time since images acquired, SLA countdown.
- Subspecialty tags shown per case where relevant, matching the radiologist's own declared subspecialties (`radiologist_subspecialties`).

**Design rationale:** SLA countdowns are shown to the radiologist, not hidden — this is a deliberate transparency choice mirroring the patient-facing Tracking screen: the same "make the turnaround promise visible and real" principle applies on both sides of the marketplace.

---

## C3. Case Viewer & Reporting

**Purpose:** The actual value-producing screen — review images and produce a structured report (FR-IMG-03/04).

**Layout:**
- **Left/main pane:** the embedded OHIF DICOM viewer (full image manipulation — window/level, zoom, series navigation, measurement tools) occupying the majority of screen real estate, since this is a desktop-first, image-review-primary workflow.
- **Right pane, structured report form:** modality-appropriate fields (Findings, Impression at minimum; structured sub-fields for common study types where useful), a prominent **"Flag as critical finding"** toggle (FR-IMG-08) presented as a deliberate, separate control — never inferred automatically from report text — so the radiologist makes an explicit clinical judgment call each time, not an accidental keyword trigger.
- Patient/clinical-context sidebar (collapsible): referring doctor's notes, prior studies for the same patient if consented/available (FR-IMG-07's longitudinal record, surfaced here specifically because prior-study context is often clinically relevant to a new read).
- Bottom bar: **Save draft** (secondary) and **Submit report** (primary, triggers the confirmation step in C4) — draft state (`reports.status = 'draft'`) lets a radiologist step away mid-case without losing work or prematurely locking anything.

**Design rationale:** Splitting critical-finding flagging into its own explicit toggle rather than deriving it from report text is a safety-by-design choice — the escalation notification pipeline (FR-NOTIF-03) depends entirely on this one bit being set correctly, so it's made into a deliberate action rather than a passive side effect of prose.

---

## C4. Report Submission & Signing

**Purpose:** The irreversible-action confirmation step (per Cross-Cutting Principle 7) before a report becomes immutable (FR-IMG-05, enforced at the database level too — `docs/DATABASE_DESIGN.md` §5.2).

**Layout:** A modal/screen summarizing what's about to happen in plain terms: "You're about to submit and sign this report. Once submitted, it cannot be edited — only amended with an addendum. [Findings/Impression preview]." Two clearly weighted buttons: "Go back and edit" (default/safe) and "Submit & sign" (requires deliberate action, e.g., a secondary confirmation tap for critical-finding cases specifically, given their consequence).

**Design rationale:** This screen exists purely because the underlying data model treats a signed report as medico-legally permanent — the UI has to make that permanence emotionally and cognitively real to the user at the exact moment it becomes true, not just document it in terms-of-service text.

---

## C5. Case Offer (Notification-Landing Screen)

**Purpose:** The screen a radiologist lands on from a push notification when a new case/shift is offered — needs to work as a cold-landing screen per Cross-Cutting Principle 1.

**Layout:** Facility, modality, urgency flag, and the response countdown, front and center, with **Accept** / **Decline** as the two large primary actions — no navigation chrome competing for attention, since the entire point of this screen is a fast, low-friction yes/no decision within a real time limit (FR-MATCH-03).

**Design rationale:** A radiologist doing this as supplemental gig work (Persona 4's stated context — full-time hospital job plus evening/weekend bandwidth) is often deciding from a phone in a spare moment; the screen has to be answerable in seconds, not require drilling into a dashboard first.

---

## C6. Earnings & Payouts

**Purpose:** Same role as B5, radiologist-side — per-report pay transparency (FR-PAY-05), reconciled against `payout_line_items`. Layout mirrors B5's structure (summary, itemized history, expandable payout detail) with "per report" rather than "per shift" as the line-item unit.

---

## C7. Profile & Credentials

**Purpose:** Same role as B6, radiologist-side — MDC license number/expiry, declared subspecialties (editable list feeding into matching, FR-MATCH-02), uploaded credential documents with per-document status, and account settings.

**Design rationale (both C6/C7):** Deliberately structured identically to the radiographer app's equivalent screens (B5/B6) — these two practitioner roles have functionally identical needs here, and reusing the same information architecture reduces both design and engineering cost without losing anything role-specific, since the specifics (license type, pay unit) are just data, not different structure.

---

# PART D — Imaging Center Dashboard

Web (React/Next.js, desktop-first per `docs/ARCHITECTURE.md` §4.3), designed around Persona 3 ("Nana," PRD §3) — an independent center owner whose central pain is idle scanner capacity and whose front-desk staff need a simple day-to-day operational tool distinct from her own owner-level view.

## D1. Login

**Purpose:** Practitioner/admin-grade auth (password + MFA), with role-aware landing: a front-desk staff account and a center-admin (owner) account see different default views after login, per `facility_staff.staff_role` (`docs/DATABASE_DESIGN.md` §3.3) — front-desk lands on D3 (Order Queue), the owner lands on D2 (Overview).

---

## D2. Home / Overview Dashboard

**Purpose:** The owner's at-a-glance view of how the business is doing — today's operational status plus the KPIs that matter to *this* persona specifically: is my capacity being used, and is the teleradiology feature actually solving my idle-scanner problem (PRD §1 G2).

**Layout:**
- Top KPI row: today's bookings count, today's revenue, current slot-utilization rate (a direct answer to "is my machine idle right now"), and — prominently, not buried — **studies currently awaiting a radiologist report**, with an SLA-adherence indicator.
- A simple utilization chart (by modality/machine, matching `facility_equipment`) showing booked vs. open slots for the week — this is the visual the idle-capacity value proposition (PRD §9 risk R5 mitigation: "lead with the idle-capacity pitch") is built to make obvious at a glance.
- Recent ratings/reviews snippet, with a link to the fuller trust/dispute view.
- Quick links to the day's Order Queue and any pending teleradiology submissions.

**Design rationale:** Surfacing "studies awaiting a radiologist" and utilization *before* raw revenue reflects that a center that lacks confidence its idle capacity is actually being filled (or that reports are turning around reliably) won't stay engaged regardless of revenue numbers — this is the retention-risk metric (PRD §9 R5/R7) made visible to the person who can act on it.

---

## D3. Calendar & Slot Management

**Purpose:** Manage the facility's bookable capacity (FR-BOOK-07) — the screen that directly maintains `facility_service_slots` and `facility_equipment`.

**Layout:**
- A calendar grid (day/week view toggle), rows per equipment/machine (e.g., "MRI Machine 1," "MRI Machine 2"), columns per time slot, each cell colored by state: open, booked, blocked.
- Click an open cell to manually block it (maintenance, staff unavailability) with a required reason; click a booked cell to see the patient/study summary (without needing to leave for the Order Queue).
- A per-machine toggle for "operational / down for maintenance" (`facility_equipment.is_operational`) that immediately removes that machine's future slots from patient-facing search — a direct, visible lever for the exact "one of two MRI machines is down" scenario the data model was built to represent.
- Service catalog quick-access: price/duration per study type, editable inline.

**Design rationale:** Representing machines as separate rows (not just "MRI capacity" as one pooled number) mirrors the real operational truth this persona lives with daily and prevents the classic double-booking failure a simplified calendar would produce.

---

## D4. Order Queue

**Purpose:** The front-desk's primary working screen — move each booking through its lifecycle (check-in → in progress → images acquired) in real time, matching the same status vocabulary the patient sees on Tracking (A6), kept consistent across both apps deliberately.

**Layout:**
- A list/table of today's bookings, sortable by time, each row: patient name, study type, status (as a colored pill matching the same stage vocabulary as A6), and a single primary action button appropriate to its current stage (mirrors B4's radiographer-side single-action-at-a-time pattern, but here viewed across an entire day's queue rather than one booking at a time).
- Search/filter bar for finding a specific booking quickly (by name or reference code) — front-desk staff needs to locate a walk-in or a phone-in query fast.
- A "flag issue" action per row for no-shows or problems, feeding the same dispute/exception path as B4.

**Design rationale:** Reusing the identical status vocabulary and color coding as the patient's own Tracking screen (A6) is a deliberate cross-app consistency choice — a front-desk staff member explaining a delay to a patient in person, and the patient later checking their own app, should never see two different descriptions of the same state.

---

## D5. Teleradiology Queue

**Purpose:** The screen most directly tied to the platform's core wedge (PRD §1 G2) — where a center without an on-site radiologist actually experiences the value proposition (FR-MATCH-01).

**Layout:**
- A list of completed studies awaiting a report, each showing: how long it's been waiting, current status (routing / offered to a radiologist / accepted / report pending), and the SLA countdown.
- For a facility with `has_onsite_radiologist = false`, this is likely the single most-visited screen after the Order Queue — designed with the same operational urgency as D4, not as a secondary admin page.
- A manual "escalate" action if a center owner wants to flag a study as more urgent than default (feeds `match_requests.is_urgent`).
- Completed reports appear here too, with a direct link to the full report/patient chain, closing the loop visibly.

**Design rationale:** This screen exists specifically so the center owner's experience of "does teleradiology actually solve my problem" is a lived, daily, visible reality — not an abstract feature description; PRD's success metric for G2 ("teleradiology queue fulfillment rate," §10) is precisely what this screen's contents represent back to the person whose trust in the feature the business depends on.

---

## D6. Services & Pricing Catalog

**Purpose:** Manage the bookable service catalog (`facility_services`) independent of day-to-day scheduling.

**Layout:** A simple table — service name, modality, price, duration, pre-appointment instructions (editable rich text), active/inactive toggle — with an "Add service" flow for onboarding a new study type. Price changes show a plain warning that they apply only to future bookings, never retroactively (matching the price-snapshot behavior in `docs/DATABASE_DESIGN.md` §4.2), so an owner isn't surprised by that behavior after the fact.

---

## D7. Staff Management

**Purpose:** Manage who works at this facility and in what capacity (`facility_staff`), including gig radiographers alongside permanent employees.

**Layout:** A staff list with role tags (front-desk, radiographer, radiologist, center-admin), employment type (employee/gig), and active/inactive status; an "invite staff" flow (by phone/email) for adding someone, and a "post a shift" shortcut linking directly into the same shift-marketplace mechanism radiographers see in B3, so filling a gap in coverage is a same-screen action, not a separate disconnected tool.

---

## D8. Payouts & Financials

**Purpose:** The facility-side view of settlement (FR-PAY-06) — what's owed, what's been paid, reconciled per booking.

**Layout:** Mirrors the earnings screens in B5/C6 structurally (summary balance, itemized history tied to bookings via `payout_line_items`), with an added commission-transparency line per transaction ("Booking total: X — Platform commission: Y — Your payout: Z") so the take-rate is never opaque to the provider — directly supporting the trust half of the channel-conflict risk (PRD R5).

---

## D9. Facility Profile & Settings

**Purpose:** Facility-level identity and configuration — name, address (feeds geocoding, `docs/ARCHITECTURE.md` §10), license/verification documents and status, contact info, notification preferences, and the `has_onsite_radiologist` toggle that directly governs whether D5's teleradiology routing is even active for this facility.

**Design rationale:** Making `has_onsite_radiologist` a visible, owner-controlled setting (rather than an inferred/hidden system fact) respects that this is a real, changing business circumstance (an on-site radiologist could join or leave) the owner needs to actively manage, not something the platform silently assumes.

---

# PART E — Hospital Dashboard

Web (React/Next.js), designed around Persona 6 ("Mr. Owusu," PRD §3) — a risk-averse, procurement/compliance-driven department admin at an institution that likely already has its own RIS/PACS/EMR and is engaging the platform for overflow capacity and outpatient booking exposure (`docs/ARCHITECTURE.md` §12), not as a full operational replacement.

Shares its structural bones with the Imaging Center Dashboard (Part D) — most screens below are described only where they meaningfully differ; where a screen is functionally identical, it says so rather than repeating the description.

## E1. Login

Identical to D1 in mechanics; typically provisioned by an institutional admin rather than self-signup, reflecting the more procurement-driven onboarding motion this persona represents (PRD §8).

---

## E2. Home / Department Overview

**Purpose:** Same role as D2, but the KPIs foreground *integration health* alongside operational volume, since this persona's stated worry is being forced onto a disconnected new system (PRD §3 persona quote).

**Layout differences from D2:** an added **"Integration status" panel** — HL7/FHIR feed connectivity to the hospital's existing RIS (`docs/ARCHITECTURE.md` §12), last successful sync time, and any sync errors surfaced plainly (not buried in a technical log) — because for this persona, "is this actually talking to our existing system" is as important a daily-health signal as booking volume itself.

---

## E3. Overflow Capacity & Outpatient Booking Management

**Purpose:** The hospital-specific counterpart to D3 — rather than exposing a whole department's calendar, this screen lets the admin deliberately carve out *which slots* become visible to patient-facing search (the "expose only overflow slots" requirement, `docs/ARCHITECTURE.md` §12/PRD §4 user story).

**Layout:** A calendar similar to D3's, but with an explicit **"Available for platform booking"** toggle per block of slots — defaulting to *off*, requiring deliberate opt-in per time block, rather than assuming an entire department's schedule should be platform-visible. This inversion of D3's default (a center owner wants maximum visibility; a hospital admin wants controlled, deliberate visibility) is the single most important design difference between Parts D and E, and reflects the genuinely different institutional risk posture between the two personas.

---

## E4. Order Queue / Worklist

Functionally identical to D4, with one addition: a visual indicator per booking showing whether it originated from the platform (self-referred/doctor-referred patient) or was already in the hospital's own RIS and is merely being displayed here for a unified staff view — important so hospital staff are never confused about which system is the source of truth for a given order.

---

## E5. Teleradiology / Reporting Overflow Requests

Functionally identical to D5 in concept — a hospital may still want overflow *reporting* capacity even with in-house radiologists (e.g., a backlog during a busy period), so the screen serves the same request/offer/report visibility, just framed as "overflow" rather than "we have none," matching this persona's likely partial (not total) reliance on the teleradiology marketplace.

---

## E6. Staff & Department Management

Functionally identical to D7, extended with a lightweight department/unit grouping (e.g., "Radiology — CT Suite," "Radiology — Ultrasound") since a hospital's staff list is typically larger and more structured than an independent center's.

---

## E7. Reports & Analytics

**Purpose:** A screen not present in Part D at all — reflects that an institutional partner (procurement/compliance-driven, PRD persona) expects and needs periodic, exportable reporting to justify and monitor the partnership internally, distinct from an independent owner's simpler at-a-glance dashboard (D2).

**Layout:** Configurable date-range reports — volume, turnaround SLA adherence, revenue/commission summary — with an export (CSV/PDF) action, since this data plausibly needs to travel into an internal hospital report or a procurement review outside the platform entirely.

---

## E8. Facility & Integration Settings

**Purpose:** Extends D9 with the institution-specific integration configuration — HL7/FHIR endpoint details, credentials/certificates for the interface-engine connection (`docs/ARCHITECTURE.md` §12), and a test-connection action — a screen that essentially doesn't exist for an independent center (which has no RIS to integrate with) and is central for a hospital partner.

---

# PART F — Admin Panel

Internal, web-only (React/Next.js), used by Ops, Finance, and Support staff (`docs/DATABASE_DESIGN.md` §2.11) — the one "app" in this whole set with no external-facing trust-building concerns, and instead an explicit design bias toward density, speed, and auditability for power users who use it all day.

## F1. Login

Password + mandatory MFA, no exceptions (highest-privilege accounts in the system) — otherwise structurally identical to D1/C1.

---

## F2. Marketplace Health Dashboard (Home)

**Purpose:** The single screen that answers "is the marketplace actually working" — a direct visual expression of PRD §10's North Star metric and input metrics, not a generic admin landing page.

**Layout:**
- Top-line North Star metric: completed, paid bookings this week where the report was delivered within SLA — shown as a trend, not just a single number.
- Supporting KPI tiles: search-to-booking conversion, unmet-demand rate, teleradiology fulfillment rate, active verified radiologists/radiographers, active onboarded centers, payment completion rate — each tied to a named PRD §10 input metric, laid out so an Ops lead can scan the whole marketplace's health in one screen without navigating anywhere.
- Guardrail metrics given deliberately distinct, alert-style visual treatment (not blended in with the growth metrics above): critical-finding notification latency, dispute rate, any audit-log anomaly flags — these are things that must never quietly degrade while other numbers go up, and the layout enforces that they can't be missed even by someone focused on growth numbers.
- Region/city filter, since PRD G3 explicitly gates expansion decisions on per-city liquidity, not aggregate national numbers.

**Design rationale:** This dashboard is designed backward from the metrics PRD §10 already defined, not designed first and then loosely mapped to metrics after the fact — the screen exists to make the business's actual stated success criteria impossible to ignore day-to-day.

---

## F3. Credentialing Queue

**Purpose:** The gate that makes every practitioner/facility verification requirement in the SRS real (FR-ID-03/04, FR-ADM-01) — nothing about "verified" is meaningful without this screen's daily use.

**Layout:**
- A queue list of pending `practitioner_credential_documents` and facility verification submissions, oldest-first by default (fairness/SLA on the applicant's side too).
- Detail view per submission: document viewer (license certificate, ID) side-by-side with the submitted registration number, a "verify against council" note/checklist (manual lookup process at MVP, per `docs/ARCHITECTURE.md`'s scope), and two actions — **Approve** / **Reject with reason** — reject requiring a mandatory, applicant-visible reason (never a silent rejection).
- A separate tab for re-verification/expiring-license cases (FR-ID-06), so routine renewals don't get lost in the same queue as first-time reviews which need more scrutiny.

**Design rationale:** No case in this queue can be bulk-approved or skipped without an explicit reviewer action per item — this is the one screen in the entire product where speed is deliberately *not* the optimization target; correctness is, given what's downstream of a wrongly-approved credential.

---

## F4. Booking & Order Oversight

**Purpose:** A support/Ops search-and-inspect tool — find any booking across the whole platform (by reference, patient name/phone, or facility) to answer a support question or investigate an issue, without needing direct database access.

**Layout:** A search bar plus filters (status, date range, facility, region), results as a table, each row opening a full detail view: the complete `booking_status_history` timeline, linked payment(s), linked study/report if applicable, and a manual override action (e.g., force-reassign a stuck teleradiology request, FR-ADM-04) — gated behind a confirmation step per Cross-Cutting Principle 7, since a manual override bypasses normal state-machine logic and should be a deliberate, logged action, not a casual one.

---

## F5. Matching Engine Monitor

**Purpose:** Operational visibility specifically into the teleradiology/shift matching engine's health — distinct from F2's business-level KPIs, this is the operations-level "is a request stuck right now" view (FR-MATCH-04/07).

**Layout:** A live list of open `match_requests`, sorted by proximity to SLA breach, each showing offer history (who's been offered, accepted/declined/timed out — the full `match_offers` audit trail) — an Ops lead can see, for a request approaching breach, exactly why it hasn't been picked up (e.g., three declines in a row) and manually intervene (re-route, escalate, contact a specific radiologist directly) before it actually breaches, rather than only finding out after the fact.

---

## F6. Dispute Management

**Purpose:** The resolution workflow behind FR-TRUST-03/FR-ADM-03 — turns "a patient complained" into a tracked, accountable process.

**Layout:** A queue (open/investigating first, matching the partial-index priority already designed at the data layer, `docs/DATABASE_DESIGN.md` §8.2) with category tags (late report, wrong study, billing, clinical concern), assignable to a specific admin, and a detail view showing the full `dispute_events` thread (comments, status changes) alongside the linked booking's full history from F4 — an admin resolving a dispute should never need to separately go look up the booking; it's presented inline.

**Design rationale:** Category tagging (rather than a free-text-only complaint) lets Ops spot patterns (e.g., one facility generating a disproportionate share of "late report" disputes) that feed back into the trust/quality metrics on F2 — the dispute screen isn't just a ticket system, it's an input to marketplace-health monitoring.

---

## F7. Payments & Payouts Console

**Purpose:** Finance admin's working screen — reconciliation, refunds, and payout batch oversight (FR-PAY-06/07).

**Layout:** Tabs for: **Payments** (searchable transaction list with PSP status, linked to `payment_events` raw logs for investigating a specific failure), **Refunds** (initiate/approve, requiring a reason, per `docs/DATABASE_DESIGN.md` §7.3), and **Payouts** (batch generation/review before release, per-facility/per-practitioner breakdown, matching `payouts`/`payout_line_items`) — with a reconciliation summary surfacing any discrepancy flags from the scheduled reconciliation job (`docs/ARCHITECTURE.md` §9.3) at the top, since that's the thing Finance needs to act on first each cycle, not something to discover by manually cross-checking numbers.

---

## F8. Audit Log Viewer

**Purpose:** Direct, read-only access to `audit_logs` (FR-ADM-05) — who accessed what medical data, when.

**Layout:** A filterable table (by actor, resource type, date range) — deliberately simple and fast (matching the BRIN-indexed, high-volume nature of the underlying table, `docs/DATABASE_DESIGN.md` §9.2) rather than a richly visual dashboard; this screen's job is precise lookup during a compliance review or incident investigation, not day-to-day monitoring, so information density and searchability are prioritized over polish.

---

## F9. User & Role Management

**Purpose:** Manage `user_roles` and account status platform-wide — suspending an account, correcting a role grant, or investigating a specific user's full account history across every domain (bookings, payments, disputes) from one place.

**Layout:** Search by phone/email/name → a user detail view aggregating: roles held, linked profiles (patient/doctor/radiologist/etc.), account status with a suspend/reactivate action (requiring a reason, logged), and quick links into that user's bookings/disputes/credential-review history elsewhere in the panel — the "360-degree view of one person" screen.

---

## F10. Settings & Feature Flags

**Purpose:** Platform-level configuration — the operational lever behind the phased-rollout capability in `docs/ARCHITECTURE.md` §14 (e.g., enabling teleradiology matching in a new region before enabling patient self-booking there).

**Layout:** A simple list of named feature flags with per-region/per-facility-type scoping controls, toggle switches, and a change-history log per flag (who changed what, when) — since a feature flag change is itself an operationally significant action on a live marketplace and deserves the same auditability as any other consequential admin action in this panel.

---

## Appendix: Cross-App Consistency Commitments

Restated explicitly because it's easy for six separately-designed apps to drift apart without a deliberate check:

- **Status vocabulary** (booking lifecycle stages) is identical, in the same order, with the same color coding, across the Patient app's Tracking screen (A6), the Radiographer app's Study Workflow (B4), and both dashboards' Order Queues (D4/E4) — the same real-world event should never be described two different ways depending on which app is showing it.
- **Earnings/payout screen structure** is deliberately shared between the Radiographer app (B5), Radiologist portal (C6), and both dashboards' financial screens (D8) — same information architecture (summary → itemized history → expandable detail), varying only in the unit of work being paid for.
- **Verification/trust badges** use the same visual language everywhere they appear (patient Search results, Imaging Center/Hospital dashboards' own status, Admin's Credentialing Queue) so "verified" means the same visual thing platform-wide.
- **Irreversible-action confirmation** (Cross-Cutting Principle 7) uses the same two-button pattern (safe default on the left/first, consequential action requiring deliberate emphasis on the right/second) everywhere it appears: report signing (C4), booking cancellation past the free window (A6), account suspension (F9), and manual matching overrides (F4).
