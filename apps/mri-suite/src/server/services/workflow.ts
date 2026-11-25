// Patient journey: booking → arrival → safety screening → preparation → scanning → PACS → completion.
// Every state transition is validated here, executed in a transaction and recorded in
// workflow_events + audit_logs.
import { z } from "zod";
import type { PoolClient } from "pg";
import { q, one, txAs, type Db } from "@/lib/db";
import { SCREENING_QUESTIONS, PACS_TRANSITIONS } from "@/lib/constants";
import { zonedToUtc, localDate, weekday, fmtTime, ageFromDob, fromLocalInput } from "@/lib/time";
import { type Actor, assertCan, assertAny, can } from "../actor";
import { audit } from "../audit";
import { DomainError, NotFoundError, ForbiddenError } from "../errors";
import { getSettings, is24h } from "../settings";
import { parse, optStr, reqStr, bool, optNum, optInt, uuid, optUuid, dateStr, optDate, timeStr, triBool } from "../validation";

type Appt = Record<string, any>;

async function lockAppt(db: Db, id: string): Promise<Appt> {
  const a = await one(`SELECT * FROM appointments WHERE id = $1 FOR UPDATE`, [id], db);
  if (!a) throw new NotFoundError("Appointment");
  return a;
}

async function event(db: Db, apptId: string, from: string | null, to: string, ev: string, actor: Actor | null, note?: string | null) {
  await q(`INSERT INTO workflow_events (appointment_id, from_status, to_status, event, note, user_id) VALUES ($1,$2,$3,$4,$5,$6)`,
    [apptId, from, to, ev, note ?? null, actor?.userId ?? null], db);
}

async function setStatus(db: Db, a: Appt, to: string, ev: string, actor: Actor, note?: string | null, extraSql = "", extraParams: unknown[] = []) {
  await q(`UPDATE appointments SET status = $2, updated_at = now() ${extraSql} WHERE id = $1`, [a.id, to, ...extraParams], db);
  await event(db, a.id, a.status, to, ev, actor, note);
  a.status = to;
}

/** Recalculate pre-scan workflow status from screening + preparation states. */
export async function recomputeStatus(db: Db, apptId: string, actor: Actor) {
  const a = await one(`SELECT * FROM appointments WHERE id = $1`, [apptId], db);
  if (!a || !["ARRIVED", "SCREENING", "PREPARATION", "CLEARED"].includes(a.status)) return;
  let next = a.status;
  if (a.screening_status === "CLEAR" && a.prep_status === "COMPLETE") next = "CLEARED";
  else if (a.screening_status === "CLEAR") next = "PREPARATION";
  else if (a.screening_status !== "NOT_STARTED") next = "SCREENING";
  else next = "ARRIVED";
  if (next !== a.status) {
    const ev = next === "CLEARED" ? "CLEARED_FOR_SCANNING" : `STATUS_${next}`;
    await setStatus(db, a, next, ev, actor);
  }
}

// ---------------------------------------------------------------------------
// Stage 1 – Appointment booking
// ---------------------------------------------------------------------------
const apptSchema = z.object({
  patientId: uuid,
  examTypeId: uuid,
  clinicalIndication: reqStr("Clinical indication"),
  referringDoctor: reqStr("Referring doctor", 200),
  referringDepartment: reqStr("Referring department", 200),
  patientType: z.enum(["OUTPATIENT", "INPATIENT", "EMERGENCY"]).default("OUTPATIENT"),
  contrast: bool,
  priority: z.enum(["ROUTINE", "URGENT", "EMERGENCY"]),
  preferredDate: optDate,
  date: dateStr,
  time: timeStr,
  durationMin: optInt,
  scannerId: uuid,
  radiographerId: optUuid,
  bodyRegion: optStr,
  notes: optStr,
});
export type AppointmentInput = z.input<typeof apptSchema>;

async function checkSlot(db: Db, opts: { scannerId: string; patientId: string; start: Date; end: Date; excludeId?: string; radiographerId?: string | null; priority: string; date: string }) {
  const settings = await getSettings(db);
  const scanner = await one(`SELECT * FROM scanners WHERE id = $1`, [opts.scannerId], db);
  if (!scanner || !scanner.is_active) throw new DomainError("Selected scanner is not active.");
  if (opts.priority === "ROUTINE") {
    const hours = settings.operatingHours[String(weekday(opts.date))];
    if (is24h(hours)) { /* 24-hour day: any time is within operating hours */ }
    else if (!hours) throw new DomainError("The department is closed on this day. Routine bookings must fall within operating hours (Urgent/Emergency may be booked outside hours).");
    else if (opts.start < zonedToUtc(opts.date, hours.open) || opts.end > zonedToUtc(opts.date, hours.close))
      throw new DomainError(`Routine bookings must be within operating hours (${hours.open}–${hours.close}).`);
  }
  const clash = await one(
    `SELECT a.accession_no, a.scheduled_start, a.scheduled_end FROM appointments a
     WHERE a.scanner_id = $1 AND a.status NOT IN ('CANCELLED','NO_SHOW') AND ($4::uuid IS NULL OR a.id <> $4)
       AND tstzrange(a.scheduled_start, a.scheduled_end, '[)') && tstzrange($2, $3, '[)') LIMIT 1`,
    [opts.scannerId, opts.start, opts.end, opts.excludeId ?? null], db);
  if (clash) throw new DomainError(`Scheduling conflict: ${scanner.name} is already booked ${fmtTime(clash.scheduled_start)}–${fmtTime(clash.scheduled_end)} (${clash.accession_no}).`, "CONFLICT");
  const patientClash = await one(
    `SELECT a.accession_no FROM appointments a WHERE a.patient_id = $1 AND a.status NOT IN ('CANCELLED','NO_SHOW','COMPLETED','INCOMPLETE')
       AND ($4::uuid IS NULL OR a.id <> $4) AND tstzrange(a.scheduled_start, a.scheduled_end, '[)') && tstzrange($2, $3, '[)') LIMIT 1`,
    [opts.patientId, opts.start, opts.end, opts.excludeId ?? null], db);
  if (patientClash) throw new DomainError(`This patient already has an overlapping appointment (${patientClash.accession_no}).`, "CONFLICT");
  if (opts.radiographerId) {
    const leave = await one(`SELECT 1 FROM leave_records WHERE staff_id = $1 AND status = 'APPROVED' AND $2::date BETWEEN start_date AND end_date`, [opts.radiographerId, opts.date], db);
    if (leave) throw new DomainError("The selected radiographer is on approved leave on this date.");
  }
}

function mapPgConflict(e: any): never {
  if (e?.code === "23P01") throw new DomainError("Scheduling conflict: the scanner is already booked for an overlapping time.", "CONFLICT");
  throw e;
}

export async function createAppointment(actor: Actor, input: AppointmentInput) {
  assertCan(actor, "appointments.manage");
  const d = parse(apptSchema, input);
  return txAs(actor, async (db) => {
    const patient = await one(`SELECT id FROM patients WHERE id = $1`, [d.patientId], db);
    if (!patient) throw new NotFoundError("Patient");
    const exam = await one(`SELECT * FROM exam_types WHERE id = $1 AND is_active`, [d.examTypeId], db);
    if (!exam) throw new DomainError("Selected examination is not available.");
    const duration = d.durationMin ?? exam.default_duration_min;
    if (duration < 5 || duration > 240) throw new DomainError("Duration must be between 5 and 240 minutes.");
    const start = zonedToUtc(d.date, d.time);
    const end = new Date(start.getTime() + duration * 60000);
    await checkSlot(db, { scannerId: d.scannerId, patientId: d.patientId, start, end, radiographerId: d.radiographerId, priority: d.priority, date: d.date });
    const seq = (await one<{ n: number }>(`SELECT nextval('accession_seq') AS n`, [], db))!.n;
    const accession = `MR${d.date.slice(2, 4)}${String(seq).padStart(6, "0")}`;
    const row = await one(
      `INSERT INTO appointments (hospital_id, accession_no, patient_id, exam_type_id, body_region, clinical_indication, referring_doctor,
         referring_department, patient_type, contrast, priority, preferred_date, scheduled_start, scheduled_end, scanner_id, radiographer_id, notes, booked_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
      [actor.hospitalId, accession, d.patientId, d.examTypeId, d.bodyRegion || exam.body_region, d.clinicalIndication, d.referringDoctor,
        d.referringDepartment, d.patientType, d.contrast, d.priority, d.preferredDate, start, end, d.scannerId, d.radiographerId, d.notes, actor.userId], db,
    ).catch(mapPgConflict);
    await event(db, row!.id, null, "BOOKED", "BOOKED", actor);
    await audit(db, actor, "appointment.create", "appointment", row!.id, { accession, start, scanner: d.scannerId });
    return row!;
  });
}

export async function updateAppointment(actor: Actor, id: string, input: AppointmentInput, reason?: string | null) {
  assertCan(actor, "appointments.manage");
  const d = parse(apptSchema, input);
  return txAs(actor, async (db) => {
    const a = await lockAppt(db, id);
    if (["SCANNING", "SCANNED", "COMPLETED", "INCOMPLETE", "CANCELLED", "NO_SHOW"].includes(a.status))
      throw new DomainError(`Appointment cannot be edited in status ${a.status}.`);
    const exam = await one(`SELECT * FROM exam_types WHERE id = $1`, [d.examTypeId], db);
    if (!exam) throw new DomainError("Selected examination is not available.");
    const duration = d.durationMin ?? exam.default_duration_min;
    const start = zonedToUtc(d.date, d.time);
    const end = new Date(start.getTime() + duration * 60000);
    const timeChanged = start.getTime() !== new Date(a.scheduled_start).getTime() || end.getTime() !== new Date(a.scheduled_end).getTime() || d.scannerId !== a.scanner_id;
    if (timeChanged && a.status !== "BOOKED") throw new DomainError("Time or scanner can only be changed before the patient arrives.");
    if (d.patientId !== a.patient_id) throw new DomainError("The patient on an appointment cannot be changed – cancel and rebook instead.");
    if (timeChanged) await checkSlot(db, { scannerId: d.scannerId, patientId: a.patient_id, start, end, excludeId: id, radiographerId: d.radiographerId, priority: d.priority, date: d.date });
    await q(
      `UPDATE appointments SET exam_type_id=$2, body_region=$3, clinical_indication=$4, referring_doctor=$5, referring_department=$6, patient_type=$7,
         contrast=$8, priority=$9, preferred_date=$10, scheduled_start=$11, scheduled_end=$12, scanner_id=$13, radiographer_id=$14, notes=$15,
         reschedule_count = reschedule_count + $16, updated_at = now() WHERE id = $1`,
      [id, d.examTypeId, d.bodyRegion || exam.body_region, d.clinicalIndication, d.referringDoctor, d.referringDepartment, d.patientType, d.contrast,
        d.priority, d.preferredDate, start, end, d.scannerId, d.radiographerId, d.notes, timeChanged ? 1 : 0], db,
    ).catch(mapPgConflict);
    if (timeChanged) await event(db, id, a.status, a.status, "RESCHEDULED", actor, reason ?? `Moved from ${new Date(a.scheduled_start).toISOString()}`);
    await audit(db, actor, timeChanged ? "appointment.reschedule" : "appointment.update", "appointment", id, { from: a.scheduled_start, to: start, reason });
  });
}

/** Drag-free quick reschedule used from the calendar. */
export async function rescheduleAppointment(actor: Actor, id: string, input: { date: string; time: string; scannerId?: string; reason?: string }) {
  const a = await one(`SELECT * FROM appointments WHERE id = $1`, [id]);
  if (!a) throw new NotFoundError("Appointment");
  const duration = Math.round((new Date(a.scheduled_end).getTime() - new Date(a.scheduled_start).getTime()) / 60000);
  return updateAppointment(actor, id, {
    patientId: a.patient_id, examTypeId: a.exam_type_id, clinicalIndication: a.clinical_indication, referringDoctor: a.referring_doctor,
    referringDepartment: a.referring_department, patientType: a.patient_type, contrast: a.contrast, priority: a.priority,
    preferredDate: a.preferred_date, date: input.date, time: input.time, durationMin: duration, scannerId: input.scannerId || a.scanner_id,
    radiographerId: a.radiographer_id, bodyRegion: a.body_region, notes: a.notes,
  } as any, input.reason || null);
}

export async function cancelAppointment(actor: Actor, id: string, reason: string) {
  assertCan(actor, "appointments.manage");
  if (!reason || reason.trim().length < 3) throw new DomainError("A cancellation reason is required.");
  return txAs(actor, async (db) => {
    const a = await lockAppt(db, id);
    if (!["BOOKED", "ARRIVED", "SCREENING", "PREPARATION", "CLEARED"].includes(a.status))
      throw new DomainError(`Cannot cancel an appointment in status ${a.status}.`);
    await setStatus(db, a, "CANCELLED", "CANCELLED", actor, reason, ", cancelled_at = now(), cancel_reason = $3", [reason.trim()]);
    await audit(db, actor, "appointment.cancel", "appointment", id, { reason });
  });
}

export async function markNoShow(actor: Actor, id: string) {
  assertAny(actor, "appointments.manage", "arrival.record");
  return txAs(actor, async (db) => {
    const a = await lockAppt(db, id);
    if (a.status !== "BOOKED") throw new DomainError("Only booked (not arrived) appointments can be marked as no-show.");
    if (new Date(a.scheduled_start) > new Date()) throw new DomainError("A no-show can only be recorded after the appointment time.");
    await setStatus(db, a, "NO_SHOW", "NO_SHOW", actor, null, ", no_show_at = now()");
    await audit(db, actor, "appointment.no_show", "appointment", id);
  });
}

export async function recordReminder(actor: Actor, id: string, note: string | null) {
  assertCan(actor, "appointments.reminders");
  await txAs(actor, async (db) => {
    const a = await lockAppt(db, id);
    if (a.status !== "BOOKED") throw new DomainError("Reminders can only be recorded for booked appointments.");
    await q(`UPDATE appointments SET reminder_at = now(), reminder_by = $2, reminder_note = $3 WHERE id = $1`, [id, actor.userId, note], db);
    await event(db, id, a.status, a.status, "REMINDER_RECORDED", actor, note);
    await audit(db, actor, "appointment.reminder", "appointment", id, { note });
  });
}

// ---------------------------------------------------------------------------
// Stage 2 – Arrival
// ---------------------------------------------------------------------------
export async function recordArrival(actor: Actor, id: string, input: { identityVerified: unknown; identityMethod: unknown; arrivedAt?: unknown }) {
  assertCan(actor, "arrival.record");
  const d = parse(z.object({ identityVerified: bool, identityMethod: reqStr("Identity verification method", 200), arrivedAt: optStr }), input);
  if (!d.identityVerified) throw new DomainError("Patient identity must be verified (two identifiers) before arrival can be recorded.");
  return txAs(actor, async (db) => {
    const a = await lockAppt(db, id);
    if (a.status !== "BOOKED") throw new DomainError(`Arrival cannot be recorded – appointment status is ${a.status}.`);
    const arrivedAt = d.arrivedAt ? fromLocalInput(d.arrivedAt) : new Date();
    if (!arrivedAt || arrivedAt > new Date(Date.now() + 60000)) throw new DomainError("Arrival time cannot be in the future.");
    if (localDate(a.scheduled_start) !== localDate(arrivedAt))
      throw new DomainError("This appointment is booked for a different day. Reschedule it to today before recording arrival.");
    await setStatus(db, a, "ARRIVED", "ARRIVED", actor, d.identityMethod,
      ", arrived_at = $3, arrival_received_by = $4, identity_verified = true, identity_method = $5", [arrivedAt, actor.userId, d.identityMethod]);
    await audit(db, actor, "appointment.arrival", "appointment", id, { identityMethod: d.identityMethod });
  });
}

// ---------------------------------------------------------------------------
// Stage 3 – MRI safety screening
// ---------------------------------------------------------------------------
const answerEnum = z.enum(["YES", "NO", "UNSURE"]);
const screeningSchema = z.object({
  answers: z.record(z.string(), z.object({ answer: answerEnum.nullable().optional(), details: z.string().max(2000).nullable().optional() })),
  pregnancyStatus: z.preprocess((v) => (v === "" || v === undefined ? null : v), z.enum(["NOT_APPLICABLE", "NOT_PREGNANT", "POSSIBLY_PREGNANT", "PREGNANT", "UNKNOWN"]).nullable()),
  weightKg: optNum,
  additionalInvestigation: optStr,
  notes: optStr,
});

export function pregnancyRelevant(sex: string, dob: string, at = new Date()) {
  const age = ageFromDob(dob, at);
  return (sex === "FEMALE" || sex === "OTHER" || sex === "UNKNOWN") && age >= 10 && age <= 55;
}

export async function saveScreening(actor: Actor, apptId: string, input: z.input<typeof screeningSchema>) {
  assertCan(actor, "screening.record");
  const d = parse(screeningSchema, input);
  for (const k of Object.keys(d.answers)) if (!SCREENING_QUESTIONS.some((qq) => qq.key === k)) throw new DomainError(`Unknown screening question ${k}`);
  for (const qq of SCREENING_QUESTIONS) {
    const ans = d.answers[qq.key];
    if (ans?.answer && ans.answer !== "NO" && qq.hazard && !ans.details?.trim())
      throw new DomainError(`Details are required for a "${ans.answer}" answer: ${qq.label}`);
  }
  return txAs(actor, async (db) => {
    const a = await lockAppt(db, apptId);
    if (!["ARRIVED", "SCREENING", "PREPARATION", "CLEARED"].includes(a.status))
      throw new DomainError("Screening can only be recorded after arrival and before scanning starts.");
    const existing = await one(`SELECT * FROM safety_screenings WHERE appointment_id = $1`, [apptId], db);
    const answersJson = JSON.stringify(d.answers);
    if (existing) {
      const changed = JSON.stringify(existing.answers) !== answersJson || existing.pregnancy_status !== d.pregnancyStatus;
      const revoke = existing.status !== "PENDING" && changed;
      await q(
        `UPDATE safety_screenings SET answers=$2, pregnancy_status=$3, weight_kg=$4, additional_investigation=$5, notes=$6, screened_by=$7, screened_at=now(), updated_at=now()
           ${revoke ? ", status='PENDING', decision_by=NULL, decision_at=NULL, decision_notes=NULL" : ""} WHERE id=$1`,
        [existing.id, answersJson, d.pregnancyStatus, d.weightKg, d.additionalInvestigation, d.notes, actor.userId], db);
      if (revoke) {
        await q(`UPDATE appointments SET screening_status='PENDING', updated_at=now() WHERE id=$1`, [apptId], db);
        await event(db, apptId, a.status, a.status, "SCREENING_DECISION_REVOKED", actor, "Screening answers changed after a decision – re-review required");
      }
    } else {
      await q(
        `INSERT INTO safety_screenings (appointment_id, patient_id, answers, pregnancy_status, weight_kg, additional_investigation, notes, screened_by, screened_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now())`,
        [apptId, a.patient_id, answersJson, d.pregnancyStatus, d.weightKg, d.additionalInvestigation, d.notes, actor.userId], db);
      await q(`UPDATE appointments SET screening_status='PENDING', updated_at=now() WHERE id=$1`, [apptId], db);
      await event(db, apptId, a.status, a.status, "SCREENING_RECORDED", actor);
    }
    if (d.weightKg) await q(`UPDATE patients SET weight_kg=$2 WHERE id=$1`, [a.patient_id, d.weightKg], db);
    // Every implant currently recorded for the patient needs an assessment for THIS examination.
    await q(
      `INSERT INTO implant_assessments (implant_id, appointment_id, scanner_id)
       SELECT id, $1, $2 FROM patient_implants WHERE patient_id = $3 AND is_present ON CONFLICT DO NOTHING`,
      [apptId, a.scanner_id, a.patient_id], db);
    await recomputeStatus(db, apptId, actor);
    await audit(db, actor, existing ? "screening.update" : "screening.create", "appointment", apptId);
  });
}

export interface ClearanceEvaluation {
  allAnswered: boolean;
  unanswered: string[];
  hazards: { key: string; label: string; answer: string; details?: string | null }[];
  implantDeclared: boolean;
  pregnancyRelevant: boolean;
  pregnancyIssue: string | null;
  implants: { id: string; device_name: string; safety_class: string; verification_status: string; decision: string | null }[];
  unresolvedImplants: string[];
  routineEligible: boolean;
  blockers: string[];
  warnings: string[];
}

/** Pure evaluation of whether a screening can be cleared (used by UI and enforced on decision). */
export async function evaluateClearance(db: Db | undefined, apptId: string): Promise<ClearanceEvaluation> {
  const s = await one(
    `SELECT s.*, p.sex, p.dob::text AS dob FROM safety_screenings s JOIN patients p ON p.id = s.patient_id WHERE s.appointment_id = $1`, [apptId], db);
  const implants = await q(
    `SELECT pi.id, pi.device_name, pi.safety_class, pi.verification_status, ia.decision
       FROM appointments a JOIN patient_implants pi ON pi.patient_id = a.patient_id AND pi.is_present
       LEFT JOIN implant_assessments ia ON ia.implant_id = pi.id AND ia.appointment_id = a.id
      WHERE a.id = $1 ORDER BY pi.created_at`, [apptId], db);
  const ev: ClearanceEvaluation = {
    allAnswered: false, unanswered: [], hazards: [], implantDeclared: false, pregnancyRelevant: false, pregnancyIssue: null,
    implants: implants as any, unresolvedImplants: [], routineEligible: false, blockers: [], warnings: [],
  };
  if (!s) { ev.blockers.push("Safety screening has not been recorded."); return ev; }
  const answers = s.answers || {};
  for (const qq of SCREENING_QUESTIONS) {
    const a = answers[qq.key]?.answer;
    if (!a) ev.unanswered.push(qq.label);
    else if (a !== "NO" && qq.hazard) {
      ev.hazards.push({ key: qq.key, label: qq.label, answer: a, details: answers[qq.key]?.details });
      if (qq.implant) ev.implantDeclared = true;
    }
  }
  ev.allAnswered = ev.unanswered.length === 0;
  if (!ev.allAnswered) ev.blockers.push(`${ev.unanswered.length} screening question(s) unanswered.`);
  ev.pregnancyRelevant = pregnancyRelevant(s.sex, s.dob);
  if (ev.pregnancyRelevant) {
    if (!s.pregnancy_status) { ev.pregnancyIssue = "Pregnancy status not recorded"; ev.blockers.push("Pregnancy status must be recorded for this patient."); }
    else if (["PREGNANT", "POSSIBLY_PREGNANT", "UNKNOWN"].includes(s.pregnancy_status)) {
      ev.pregnancyIssue = `Pregnancy status: ${s.pregnancy_status.replace(/_/g, " ").toLowerCase()}`;
      ev.warnings.push("Pregnancy is possible/confirmed – requires authorised MR safety decision with documented justification.");
    }
  }
  if (ev.implantDeclared && implants.length === 0)
    ev.blockers.push("An implant/device/foreign body was declared but no implant record exists – register it in the Implant Registry.");
  for (const im of implants) {
    if (!im.decision || im.decision === "PENDING") ev.unresolvedImplants.push(`${im.device_name}: exam-specific assessment pending`);
    else if (im.decision === "DO_NOT_SCAN") ev.unresolvedImplants.push(`${im.device_name}: assessed as DO NOT SCAN`);
    else if (im.decision === "DEFER_SPECIALIST") ev.unresolvedImplants.push(`${im.device_name}: deferred for specialist review`);
    if (im.safety_class === "UNKNOWN") ev.warnings.push(`${im.device_name}: MRI safety classification unknown.`);
    if (im.verification_status !== "VERIFIED") ev.warnings.push(`${im.device_name}: device verification is ${im.verification_status.replace(/_/g, " ").toLowerCase()}.`);
  }
  if (ev.unresolvedImplants.length) ev.blockers.push(...ev.unresolvedImplants);
  ev.routineEligible = ev.allAnswered && ev.hazards.length === 0 && implants.length === 0 && !ev.pregnancyIssue;
  return ev;
}

export async function decideScreening(actor: Actor, apptId: string, input: { decision: unknown; notes: unknown }) {
  const d = parse(z.object({ decision: z.enum(["CLEAR", "NOT_CLEARED"]), notes: optStr }), input);
  return txAs(actor, async (db) => {
    const a = await lockAppt(db, apptId);
    if (!["ARRIVED", "SCREENING", "PREPARATION", "CLEARED"].includes(a.status)) throw new DomainError("Screening decisions can only be made before scanning.");
    const s = await one(`SELECT * FROM safety_screenings WHERE appointment_id = $1 FOR UPDATE`, [apptId], db);
    if (!s) throw new DomainError("Record the safety screening before making a decision.");
    if (d.decision === "NOT_CLEARED") {
      assertAny(actor, "screening.record", "safety.clear");
      if (!d.notes || d.notes.length < 5) throw new DomainError("Document the reason the patient is not cleared.");
    } else {
      const ev = await evaluateClearance(db, apptId);
      if (ev.blockers.length) throw new DomainError(`Cannot clear: ${ev.blockers.join(" ")}`, "SAFETY_BLOCK");
      if (ev.routineEligible) {
        assertAny(actor, "safety.clear.routine", "safety.clear");
      } else {
        if (!can(actor, "safety.clear")) throw new ForbiddenError("This screening has positive findings or implants. Final clearance must be made by authorised MR safety personnel.");
        if (!d.notes || d.notes.length < 10) throw new DomainError("A documented clearance rationale (at least 10 characters) is required when findings are present.");
      }
    }
    await q(`UPDATE safety_screenings SET status=$2, decision_by=$3, decision_at=now(), decision_notes=$4, updated_at=now() WHERE id=$1`,
      [s.id, d.decision, actor.userId, d.notes], db);
    await q(`UPDATE appointments SET screening_status=$2, updated_at=now() WHERE id=$1`, [apptId, d.decision], db);
    await event(db, apptId, a.status, a.status, d.decision === "CLEAR" ? "SAFETY_CLEARED" : "SAFETY_NOT_CLEARED", actor, d.notes);
    await recomputeStatus(db, apptId, actor);
    await audit(db, actor, `screening.decision.${d.decision.toLowerCase()}`, "appointment", apptId, { notes: d.notes });
  });
}

// ---------------------------------------------------------------------------
// Exam-specific implant assessment (by authorised MR safety personnel)
// ---------------------------------------------------------------------------
export const COMPARISON_ITEMS = [
  { key: "field_strength", label: "Scanner field strength within labelled conditions" },
  { key: "spatial_gradient", label: "Spatial field gradient at device location within limit" },
  { key: "sar_b1", label: "SAR / B1+rms limits can be applied on the scanner" },
  { key: "slew_rate", label: "Gradient slew-rate restrictions can be met" },
  { key: "region_positioning", label: "Anatomical region / positioning / coil configuration permitted" },
  { key: "waiting_period", label: "Post-implantation waiting period satisfied" },
  { key: "device_mode", label: "Device programmed to MRI mode / programming arranged" },
  { key: "monitoring", label: "Required monitoring arranged" },
] as const;

const assessSchema = z.object({
  decision: z.enum(["PENDING", "PROCEED", "PROCEED_WITH_CONDITIONS", "DO_NOT_SCAN", "DEFER_SPECIALIST"]),
  comparison: z.record(z.string(), z.enum(["MET", "NOT_MET", "NOT_APPLICABLE", ""]).optional()).default({}),
  conditionsApplied: optStr,
  notes: optStr,
});

export async function assessImplant(actor: Actor, assessmentId: string, input: z.input<typeof assessSchema>) {
  assertCan(actor, "implants.assess");
  const d = parse(assessSchema, input);
  return txAs(actor, async (db) => {
    const row = await one(
      `SELECT ia.*, pi.safety_class, pi.verification_status, pi.device_name, a.status AS appt_status, a.screening_status
         FROM implant_assessments ia JOIN patient_implants pi ON pi.id = ia.implant_id JOIN appointments a ON a.id = ia.appointment_id
        WHERE ia.id = $1 FOR UPDATE OF ia`, [assessmentId], db);
    if (!row) throw new NotFoundError("Assessment");
    if (!["ARRIVED", "SCREENING", "PREPARATION", "CLEARED", "BOOKED"].includes(row.appt_status)) throw new DomainError("This examination is no longer awaiting a safety decision.");
    const proceed = d.decision === "PROCEED" || d.decision === "PROCEED_WITH_CONDITIONS";
    const cmp = d.comparison || {};
    const override = proceed && (row.safety_class === "UNKNOWN" || row.verification_status !== "VERIFIED");
    if (proceed) {
      if (row.safety_class === "MR_UNSAFE") throw new DomainError("Device is classified MR Unsafe – the patient cannot proceed with this device in place.", "SAFETY_BLOCK");
      if (row.safety_class === "MR_CONDITIONAL") {
        if (d.decision !== "PROCEED_WITH_CONDITIONS") throw new DomainError("MR Conditional devices require 'Proceed with conditions'.");
        const missing = COMPARISON_ITEMS.filter((c) => !cmp[c.key]);
        if (missing.length) throw new DomainError(`Compare every condition with the intended scanner/examination (${missing.length} item(s) not answered).`);
        const notMet = COMPARISON_ITEMS.filter((c) => cmp[c.key] === "NOT_MET");
        if (notMet.length) throw new DomainError(`Device/examination mismatch: ${notMet.map((n) => n.label).join("; ")}. Do not proceed.`, "SAFETY_BLOCK");
        if (!d.conditionsApplied) throw new DomainError("Record the scan conditions to be applied (e.g. SAR mode, sequence restrictions).");
      }
      if (override) {
        if (!d.notes || d.notes.trim().length < 30)
          throw new DomainError("Device identity/classification is not verified. A documented risk–benefit justification (≥30 characters) by authorised MR safety personnel is required to proceed.");
        if (!can(actor, "safety.clear")) throw new ForbiddenError("Only authorised MR safety personnel can proceed with an unverified or unknown device.");
      }
    }
    if (["DO_NOT_SCAN", "DEFER_SPECIALIST"].includes(d.decision) && !d.notes) throw new DomainError("Record the reason for this decision.");
    await q(
      `UPDATE implant_assessments SET decision=$2, comparison=$3, conditions_compared=$4, conditions_applied=$5, notes=$6, assessed_by=$7, assessed_at=now() WHERE id=$1`,
      [assessmentId, d.decision, JSON.stringify({ ...cmp, override }), Object.keys(cmp).length > 0, d.conditionsApplied, d.notes, actor.userId], db);
    // A non-proceed decision after clearance revokes that clearance.
    if (!proceed && row.screening_status === "CLEAR") {
      await q(`UPDATE safety_screenings SET status='PENDING', decision_by=NULL, decision_at=NULL WHERE appointment_id=$1`, [row.appointment_id], db);
      await q(`UPDATE appointments SET screening_status='PENDING' WHERE id=$1`, [row.appointment_id], db);
      await event(db, row.appointment_id, row.appt_status, row.appt_status, "SCREENING_DECISION_REVOKED", actor, `Implant assessment changed: ${row.device_name}`);
      await recomputeStatus(db, row.appointment_id, actor);
    }
    await event(db, row.appointment_id, row.appt_status, row.appt_status, "IMPLANT_ASSESSED", actor, `${row.device_name}: ${d.decision}`);
    await audit(db, actor, "implant.assessment", "implant_assessment", assessmentId, { decision: d.decision, override });
  });
}

// ---------------------------------------------------------------------------
// Stage 4 – Preparation
// ---------------------------------------------------------------------------
const prepSchema = z.object({
  checklist: z.record(z.string(), bool).default({}),
  fastingConfirmed: triBool,
  egfrValue: optNum,
  egfrDate: optDate,
  previousImaging: optStr,
  medicationNotes: optStr,
  oralContrastGiven: triBool,
  oralContrastDetails: optStr,
  ivCannula: triBool,
  cannulaGauge: optStr,
  cannulaSite: optStr,
  cannulatedBy: optUuid,
  metalRemoved: triBool,
  gownChanged: triBool,
  specialConsiderations: optStr,
  complete: bool,
});

export async function savePreparation(actor: Actor, apptId: string, input: z.input<typeof prepSchema>) {
  assertCan(actor, "prep.manage");
  const d = parse(prepSchema, input);
  return txAs(actor, async (db) => {
    const a = await lockAppt(db, apptId);
    if (!["ARRIVED", "SCREENING", "PREPARATION", "CLEARED"].includes(a.status))
      throw new DomainError("Preparation can only be recorded after arrival and before scanning.");
    const exam = await one(`SELECT e.*, p.id AS prep_id, p.fasting_hours, p.requires_egfr, p.oral_contrast, p.iv_cannula AS prep_iv, p.checklist AS prep_checklist, p.status AS prep_protocol_status
                              FROM exam_types e LEFT JOIN prep_protocols p ON p.id = e.prep_protocol_id WHERE e.id = $1`, [a.exam_type_id], db);
    if (d.complete) {
      const missing: string[] = [];
      if (d.metalRemoved !== true) missing.push("removal of metallic objects");
      if (d.gownChanged !== true) missing.push("change into MRI-safe clothing");
      if (exam?.fasting_hours && d.fastingConfirmed !== true) missing.push(`fasting (${exam.fasting_hours} h) confirmation`);
      if ((a.contrast && exam?.requires_egfr) && (d.egfrValue === null || !d.egfrDate)) missing.push("eGFR value and date (contrast examination)");
      if ((a.contrast || exam?.prep_iv) && d.ivCannula !== true) missing.push("IV cannulation");
      if (d.ivCannula && (!d.cannulaGauge || !d.cannulaSite)) missing.push("cannula gauge and site");
      if (exam?.oral_contrast && d.oralContrastGiven !== true) missing.push("oral contrast administration");
      for (const item of (exam?.prep_checklist ?? []) as { key: string; label: string }[]) if (!d.checklist[item.key]) missing.push(item.label);
      if (missing.length) throw new DomainError(`Preparation incomplete – outstanding: ${missing.join(", ")}.`);
    }
    const values = [apptId, exam?.prep_id ?? null, JSON.stringify(d.checklist), d.fastingConfirmed, d.egfrValue, d.egfrDate, d.previousImaging, d.medicationNotes,
      d.oralContrastGiven, d.oralContrastDetails, d.ivCannula, d.cannulaGauge, d.cannulaSite, d.cannulatedBy, d.metalRemoved, d.gownChanged,
      d.specialConsiderations, d.complete ? "COMPLETE" : "IN_PROGRESS", d.complete ? actor.userId : null, actor.userId];
    await q(
      `INSERT INTO patient_preparations (appointment_id, prep_protocol_id, checklist, fasting_confirmed, egfr_value, egfr_date, previous_imaging, medication_notes,
          oral_contrast_given, oral_contrast_details, iv_cannula, cannula_gauge, cannula_site, cannulated_by, metal_removed, gown_changed, special_considerations,
          status, completed_by, completed_at, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19, CASE WHEN $18 = 'COMPLETE' THEN now() END, $20)
       ON CONFLICT (appointment_id) DO UPDATE SET prep_protocol_id=EXCLUDED.prep_protocol_id, checklist=EXCLUDED.checklist, fasting_confirmed=EXCLUDED.fasting_confirmed,
          egfr_value=EXCLUDED.egfr_value, egfr_date=EXCLUDED.egfr_date, previous_imaging=EXCLUDED.previous_imaging, medication_notes=EXCLUDED.medication_notes,
          oral_contrast_given=EXCLUDED.oral_contrast_given, oral_contrast_details=EXCLUDED.oral_contrast_details, iv_cannula=EXCLUDED.iv_cannula,
          cannula_gauge=EXCLUDED.cannula_gauge, cannula_site=EXCLUDED.cannula_site, cannulated_by=EXCLUDED.cannulated_by, metal_removed=EXCLUDED.metal_removed,
          gown_changed=EXCLUDED.gown_changed, special_considerations=EXCLUDED.special_considerations, status=EXCLUDED.status,
          completed_by=EXCLUDED.completed_by, completed_at=EXCLUDED.completed_at, updated_by=EXCLUDED.updated_by, updated_at=now()`,
      values, db);
    const newPrep = d.complete ? "COMPLETE" : "IN_PROGRESS";
    if (newPrep !== a.prep_status) {
      await q(`UPDATE appointments SET prep_status=$2, updated_at=now() WHERE id=$1`, [apptId, newPrep], db);
      await event(db, apptId, a.status, a.status, d.complete ? "PREPARATION_COMPLETE" : "PREPARATION_STARTED", actor);
    }
    await recomputeStatus(db, apptId, actor);
    await audit(db, actor, "preparation.save", "appointment", apptId, { complete: d.complete });
  });
}

// ---------------------------------------------------------------------------
// Stage 5 – Scanning
// ---------------------------------------------------------------------------
export async function startScan(actor: Actor, apptId: string, input: { radiographerId?: unknown; protocolId?: unknown }) {
  assertCan(actor, "scanning.perform");
  const d = parse(z.object({ radiographerId: optUuid, protocolId: optUuid }), input);
  return txAs(actor, async (db) => {
    const a = await lockAppt(db, apptId);
    if (a.status !== "CLEARED") {
      if (a.screening_status !== "CLEAR") throw new DomainError("Scanning is blocked: MRI safety screening is not CLEAR.", "SAFETY_BLOCK");
      if (a.prep_status !== "COMPLETE") throw new DomainError("Scanning is blocked: patient preparation is not complete.", "SAFETY_BLOCK");
      throw new DomainError(`Scanning cannot start from status ${a.status}.`);
    }
    // Defence in depth: re-check the safety evaluation at the moment of scanning.
    const ev = await evaluateClearance(db, apptId);
    if (ev.unresolvedImplants.length) throw new DomainError(`Scanning is blocked: ${ev.unresolvedImplants.join("; ")}`, "SAFETY_BLOCK");
    const scanner = await one(`SELECT * FROM scanners WHERE id = $1 FOR UPDATE`, [a.scanner_id], db);
    if (scanner.status !== "AVAILABLE") throw new DomainError(`${scanner.name} is currently ${scanner.status.replace(/_/g, " ").toLowerCase()}.`);
    const busy = await one(`SELECT accession_no FROM appointments WHERE scanner_id = $1 AND status = 'SCANNING' AND id <> $2`, [a.scanner_id, apptId], db);
    if (busy) throw new DomainError(`Another examination (${busy.accession_no}) is still in progress on this scanner.`);
    const radiographerId = d.radiographerId || a.radiographer_id || actor.staffId;
    if (!radiographerId) throw new DomainError("Select the radiographer performing the scan.");
    await q(`INSERT INTO scan_records (appointment_id, scanner_id, radiographer_id, protocol_id, started_at, contrast_used, started_by)
             VALUES ($1,$2,$3,$4,now(),$5,$6)`, [apptId, a.scanner_id, radiographerId, d.protocolId, a.contrast, actor.userId], db);
    await q(`UPDATE scanners SET status='IN_USE' WHERE id=$1`, [a.scanner_id], db);
    await setStatus(db, a, "SCANNING", "SCAN_STARTED", actor, null, ", radiographer_id = $3", [radiographerId]);
    await audit(db, actor, "scan.start", "appointment", apptId, { radiographerId });
  });
}

const endScanSchema = z.object({
  completionStatus: z.enum(["COMPLETE", "INCOMPLETE"]),
  incompleteReason: optStr,
  imagesAcquired: z.preprocess((v) => (v === undefined || v === "" ? true : v === true || v === "on" || v === "true"), z.boolean()),
  additionalSequences: optStr,
  protocolModifications: optStr,
  repeatSequences: optInt,
  notes: optStr,
});

export async function endScan(actor: Actor, apptId: string, input: z.input<typeof endScanSchema>) {
  assertCan(actor, "scanning.perform");
  const d = parse(endScanSchema, input);
  if (d.completionStatus === "INCOMPLETE" && !d.incompleteReason) throw new DomainError("A reason is required for an incomplete examination.");
  return txAs(actor, async (db) => {
    const a = await lockAppt(db, apptId);
    if (a.status !== "SCANNING") throw new DomainError("This examination is not currently being scanned.");
    const scan = await one(`UPDATE scan_records SET ended_at=now(), completion_status=$2, incomplete_reason=$3, additional_sequences=$4,
        protocol_modifications=$5, repeat_sequences=$6, notes=$7, ended_by=$8 WHERE appointment_id=$1 RETURNING *`,
      [apptId, d.completionStatus, d.incompleteReason, d.additionalSequences, d.protocolModifications, d.repeatSequences ?? 0, d.notes, actor.userId], db);
    await q(`UPDATE scanners SET status='AVAILABLE' WHERE id=$1 AND status='IN_USE'`, [a.scanner_id], db);
    const to = d.completionStatus === "COMPLETE" ? "SCANNED" : "INCOMPLETE";
    await setStatus(db, a, to, d.completionStatus === "COMPLETE" ? "SCAN_COMPLETED" : "SCAN_INCOMPLETE", actor, d.incompleteReason);
    if (d.completionStatus === "COMPLETE" || d.imagesAcquired) {
      const up = await one(`INSERT INTO pacs_uploads (appointment_id, scan_record_id) VALUES ($1,$2) RETURNING id`, [apptId, scan!.id], db);
      await q(`INSERT INTO pacs_upload_events (upload_id, to_status, note, user_id) VALUES ($1,'PENDING_UPLOAD','Created on scan completion',$2)`, [up!.id, actor.userId], db);
    }
    await audit(db, actor, "scan.end", "appointment", apptId, { completion: d.completionStatus, reason: d.incompleteReason });
    const contrastRecorded = await one(`SELECT 1 FROM contrast_administrations WHERE appointment_id=$1`, [apptId], db);
    return { warning: a.contrast && !contrastRecorded ? "This is a contrast examination but no contrast administration has been recorded." : null };
  });
}

export async function updateScanDetails(actor: Actor, apptId: string, input: { additionalSequences?: unknown; protocolModifications?: unknown; repeatSequences?: unknown; notes?: unknown }) {
  assertCan(actor, "scanning.perform");
  const d = parse(z.object({ additionalSequences: optStr, protocolModifications: optStr, repeatSequences: optInt, notes: optStr }), input);
  await txAs(actor, async (db) => {
    const r = await one(`UPDATE scan_records SET additional_sequences=$2, protocol_modifications=$3, repeat_sequences=COALESCE($4,0), notes=$5 WHERE appointment_id=$1 RETURNING id`,
      [apptId, d.additionalSequences, d.protocolModifications, d.repeatSequences, d.notes], db);
    if (!r) throw new NotFoundError("Scan record");
    await audit(db, actor, "scan.update", "appointment", apptId, d);
  });
}

// ---------------------------------------------------------------------------
// Stage 6/7 – PACS upload tracking & completion (manual confirmation)
// ---------------------------------------------------------------------------
const pacsSchema = z.object({
  status: z.enum(["PENDING_UPLOAD", "UPLOADING", "SUCCESSFULLY_UPLOADED", "UPLOAD_FAILED", "REQUIRES_INVESTIGATION"]),
  at: optStr,
  imageCount: optInt,
  seriesCount: optInt,
  failureReason: optStr,
  correctiveAction: optStr,
  note: optStr,
});

export async function updatePacsStatus(actor: Actor, uploadId: string, input: z.input<typeof pacsSchema>) {
  assertCan(actor, "pacs.manage");
  const d = parse(pacsSchema, input);
  return txAs(actor, async (db) => {
    const u = await one(`SELECT * FROM pacs_uploads WHERE id=$1 FOR UPDATE`, [uploadId], db);
    if (!u) throw new NotFoundError("PACS upload record");
    if (u.status === d.status) throw new DomainError("Status is unchanged.");
    if (!PACS_TRANSITIONS[u.status]?.includes(d.status)) throw new DomainError(`Invalid PACS status change: ${u.status} → ${d.status}.`);
    if (d.status === "UPLOAD_FAILED" && !d.failureReason) throw new DomainError("Record the failure reason.");
    if (d.status === "REQUIRES_INVESTIGATION" && !d.note && !d.failureReason) throw new DomainError("Describe what requires investigation.");
    const at = d.at ? fromLocalInput(d.at) : new Date();
    if (!at || at > new Date(Date.now() + 60000)) throw new DomainError("Time cannot be in the future.");
    const scan = await one(`SELECT ended_at FROM scan_records WHERE id=$1`, [u.scan_record_id], db);
    if (scan?.ended_at && at < new Date(scan.ended_at) && ["UPLOADING", "SUCCESSFULLY_UPLOADED"].includes(d.status))
      throw new DomainError("Upload time cannot be before the scan ended.");
    const sets: string[] = ["status=$2", "updated_at=now()"];
    const params: unknown[] = [uploadId, d.status];
    const add = (sql: string, v: unknown) => { params.push(v); sets.push(sql.replace("?", `$${params.length}`)); };
    if (d.status === "UPLOADING") { add("initiated_at=?", at); sets.push("attempts=attempts+1"); }
    if (d.status === "SUCCESSFULLY_UPLOADED") {
      add("completed_at=?", at);
      if (!u.initiated_at) { add("initiated_at=?", at); sets.push("attempts=attempts+1"); }
      sets.push("verification_status='UNVERIFIED'", "confirmed_by=NULL", "confirmed_at=NULL", "failure_reason=NULL");
    }
    if (d.status === "UPLOAD_FAILED") { add("failure_reason=?", d.failureReason); if (!u.initiated_at) { add("initiated_at=?", at); sets.push("attempts=attempts+1"); } }
    if (d.status === "REQUIRES_INVESTIGATION" && d.failureReason) add("failure_reason=?", d.failureReason);
    if (d.correctiveAction) add("corrective_action=?", d.correctiveAction);
    if (d.imageCount !== null) add("image_count=?", d.imageCount);
    if (d.seriesCount !== null) add("series_count=?", d.seriesCount);
    if (u.status === "SUCCESSFULLY_UPLOADED") sets.push("verification_status='UNVERIFIED'", "confirmed_by=NULL", "confirmed_at=NULL", "completed_at=NULL");
    await q(`UPDATE pacs_uploads SET ${sets.join(", ")} WHERE id=$1`, params, db);
    await q(`INSERT INTO pacs_upload_events (upload_id, from_status, to_status, note, user_id, at) VALUES ($1,$2,$3,$4,$5,$6)`,
      [uploadId, u.status, d.status, d.note || d.failureReason || d.correctiveAction, actor.userId, at], db);
    // Moving away from a confirmed success re-opens the examination as an exception.
    const a = await lockAppt(db, u.appointment_id);
    if (a.status === "COMPLETED") await setStatus(db, a, "SCANNED", "COMPLETION_REVOKED", actor, `PACS status changed to ${d.status}`, ", completed_at = NULL");
    await event(db, u.appointment_id, a.status, a.status, `PACS_${d.status}`, actor, d.failureReason || d.note);
    await audit(db, actor, "pacs.status", "pacs_upload", uploadId, { from: u.status, to: d.status, reason: d.failureReason });
  });
}

/** Staff confirm (verify) a successful upload → examination COMPLETED. */
export async function confirmPacsUpload(actor: Actor, uploadId: string, note?: string | null) {
  assertCan(actor, "pacs.verify");
  return txAs(actor, async (db) => {
    const u = await one(`SELECT * FROM pacs_uploads WHERE id=$1 FOR UPDATE`, [uploadId], db);
    if (!u) throw new NotFoundError("PACS upload record");
    if (u.status !== "SUCCESSFULLY_UPLOADED") throw new DomainError("Only a successful upload can be confirmed. Record the upload as successful first.");
    if (u.verification_status === "VERIFIED") throw new DomainError("This upload has already been confirmed.");
    await q(`UPDATE pacs_uploads SET verification_status='VERIFIED', confirmed_by=$2, confirmed_at=now(), updated_at=now() WHERE id=$1`, [uploadId, actor.userId], db);
    await q(`INSERT INTO pacs_upload_events (upload_id, from_status, to_status, note, user_id) VALUES ($1,$2,$2,$3,$4)`,
      [uploadId, u.status, `Verified in PACS by staff${note ? `: ${note}` : ""}`, actor.userId], db);
    const a = await lockAppt(db, u.appointment_id);
    let completed = false;
    if (a.status === "SCANNED") {
      await setStatus(db, a, "COMPLETED", "EXAMINATION_COMPLETED", actor, "Scan complete and PACS upload confirmed", ", completed_at = now()");
      completed = true;
    }
    await audit(db, actor, "pacs.confirm", "pacs_upload", uploadId, { completed });
    return { completed };
  });
}

export async function getJourney(apptId: string) {
  const appt = await one(
    `SELECT a.*, p.full_name, p.mrn, p.dob::text AS dob, p.sex, p.phone, p.weight_kg AS patient_weight, e.name AS exam_name, e.code AS exam_code,
            s.name AS scanner_name, s.field_strength_t, s.model AS scanner_model, st.full_name AS radiographer_name,
            ub.full_name AS booked_by_name, ua.full_name AS arrival_by_name
       FROM appointments a JOIN patients p ON p.id = a.patient_id JOIN exam_types e ON e.id = a.exam_type_id
       JOIN scanners s ON s.id = a.scanner_id LEFT JOIN staff st ON st.id = a.radiographer_id
       LEFT JOIN users ub ON ub.id = a.booked_by LEFT JOIN users ua ON ua.id = a.arrival_received_by
      WHERE a.id = $1`, [apptId]);
  if (!appt) return null;
  const [screening, prep, scan, pacs, events, assessments, contrast] = await Promise.all([
    one(`SELECT s.*, u1.full_name AS screened_by_name, u2.full_name AS decision_by_name FROM safety_screenings s
           LEFT JOIN users u1 ON u1.id = s.screened_by LEFT JOIN users u2 ON u2.id = s.decision_by WHERE s.appointment_id = $1`, [apptId]),
    one(`SELECT pp.*, u.full_name AS completed_by_name, st.full_name AS cannulated_by_name FROM patient_preparations pp
           LEFT JOIN users u ON u.id = pp.completed_by LEFT JOIN staff st ON st.id = pp.cannulated_by WHERE pp.appointment_id = $1`, [apptId]),
    one(`SELECT sr.*, st.full_name AS radiographer_name, mp.name AS protocol_name FROM scan_records sr JOIN staff st ON st.id = sr.radiographer_id
           LEFT JOIN mri_protocols mp ON mp.id = sr.protocol_id WHERE sr.appointment_id = $1`, [apptId]),
    one(`SELECT pu.*, u.full_name AS confirmed_by_name FROM pacs_uploads pu LEFT JOIN users u ON u.id = pu.confirmed_by WHERE pu.appointment_id = $1`, [apptId]),
    q(`SELECT we.*, u.full_name AS user_name FROM workflow_events we LEFT JOIN users u ON u.id = we.user_id WHERE appointment_id = $1 ORDER BY at, id`, [apptId]),
    q(`SELECT ia.*, pi.device_name, pi.safety_class, pi.verification_status, pi.conditions, pi.manufacturer, pi.model_name, pi.anatomical_location,
              pi.info_source, ic.name AS category_name, u.full_name AS assessed_by_name
         FROM implant_assessments ia JOIN patient_implants pi ON pi.id = ia.implant_id JOIN implant_categories ic ON ic.id = pi.category_id
         LEFT JOIN users u ON u.id = ia.assessed_by WHERE ia.appointment_id = $1 ORDER BY pi.created_at`, [apptId]),
    q(`SELECT ca.*, ag.name AS agent_name, b.batch_no, st.full_name AS administered_by_name FROM contrast_administrations ca
         JOIN contrast_agents ag ON ag.id = ca.agent_id JOIN contrast_batches b ON b.id = ca.batch_id JOIN staff st ON st.id = ca.administered_by
        WHERE ca.appointment_id = $1 ORDER BY administered_at`, [apptId]),
  ]);
  return { appt, screening, prep, scan, pacs, events, assessments, contrast };
}
