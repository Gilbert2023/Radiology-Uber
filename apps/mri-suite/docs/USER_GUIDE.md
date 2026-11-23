# User guide

Sign in with your username and password. You are signed out automatically after a period of
inactivity (default 30 minutes; a warning appears 1 minute before). Use the key icon (top right)
to change your password. The bell shows live alerts; the search box finds patients, accession
numbers, staff, implants and incidents (limited to what your role may see).

Status colours are consistent everywhere: Confirmed (blue), Arrived (cyan), Waiting (amber),
Safety pending (orange), In preparation (violet), Cleared (green), Scanning (indigo), Awaiting
PACS (sky), Completed (dark green), Incomplete (rose), Cancelled (grey), No-show, Delayed (red).

## Receptionist
1. **Patient Registration** – search first; register only if not found. Duplicate MRNs are blocked and similar name + date of birth are flagged.
2. **Appointment Scheduling** – *New MRI appointment*, or click an empty slot in the Day view. Choosing the examination fills duration, region and contrast defaults. Conflicts and out-of-hours routine bookings are rejected with an explanation. Use *Edit* or *Quick reschedule* on the appointment page; cancellations need a reason.
3. **Reminder calls** – the calendar's right panel lists tomorrow's patients; log the outcome of each call (SMS is not connected).
4. **Patient Arrival** – confirm two identifiers, tick *ID verified*, *Record arrival*. The patient then appears on the worklist and waiting time starts. Mark no-shows after the slot time.

## MRI Radiographer
- **Worklist / Command Centre** – each row shows the next step. Open the patient to work through the stages.
- **Safety screening** – answer every question (details required for Yes/Unsure), record pregnancy status where requested, save. If all answers are negative and no implant is on record you may *Clear for MRI*; otherwise refer to MR safety personnel. *Not cleared* blocks scanning.
- **Implants** – if declared, use *Register implant/device* from the screening section. Record only documented information; leave the class *Unknown* if not documented.
- **Scanning** – *Start scan* (only possible when cleared and prepared, and the scanner is available). *End scan* records completion, repeats, additional sequences and modifications; an incomplete exam needs a reason.
- **PACS** – update the upload status as you send images (failures need a reason and corrective action). After checking images are visible in PACS, *Confirm images in PACS* – this completes the examination. Failed/pending uploads stay on the PACS exceptions list until resolved.
- Also: QC recording, cleaning checklists, maintenance/breakdown logging, incident reporting.

## MRI Nurse
- **Patient Preparation** – tick each preparation item; for contrast examinations record eGFR and date and the cannula (gauge, site, by whom). *Mark preparation complete* lists anything outstanding.
- **Contrast administration** (on the patient page) – choose an in-date batch, dose, route, time and administering staff. Reactions or extravasation automatically raise an incident. Stock is deducted automatically.
- **Contrast Media** – receive stock (batch, expiry, quantity), adjust/dispose with a reason; low-stock and expiry alerts appear automatically.

## Authorised MR Safety Personnel
- **MRI Safety Screening** queue shows screenings awaiting a decision and pending implant assessments.
- For each device, record an **exam-specific assessment**: for MR Conditional devices compare every labelled condition with the scanner/examination; record conditions to apply. Unknown or unverified devices can only proceed with a documented risk–benefit justification. MR Unsafe devices cannot proceed.
- **Implant Registry** – verification worklist, escalations, conditional/unsafe/unknown lists; record verifications (checklist + document source/title/revision/reference) and upload implant cards or manufacturer documents (PDF/PNG/JPEG).
- **Implant database** – reference entries are *user-entered* until you mark them *manufacturer-verified* against cited documentation; edits create new versions.

## MRI Supervisor
Everything above plus: Executive Dashboard, analytics, reports, QC and cleaning verification,
return-to-service authorisation, protocol and preparation-protocol approval, leave approval,
duty roster, staff records, incident investigation and closure.
- **Protocol Library** – seeded protocols are draft templates (sequence names only). Enter parameters from the scanner, submit, approve. Editing an approved protocol creates a new draft version; compare versions side by side.
- **Reports** – PDF and Excel exports for the month or any period; every export is logged.

## Hospital Management
Executive Dashboard, analytics and report exports with aggregate data only (no patient identifiers).

## System Administrator
User accounts (create, deactivate, unlock, revoke sessions, issue one-time reset links), roles &
permissions, system settings (operating hours, thresholds, scanners, examination types,
integration status) and the audit log. No clinical access by default.
