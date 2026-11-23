// Departmental operations: contrast media, QC, maintenance, staff & duty, incidents, cleaning.
import { z } from "zod";
import { q, one, txAs, type Db } from "@/lib/db";
import { fromLocalInput, localDate } from "@/lib/time";
import { type Actor, assertCan, assertAny, can } from "../actor";
import { audit } from "../audit";
import { DomainError, NotFoundError, ForbiddenError } from "../errors";
import { parse, optStr, reqStr, optNum, optInt, uuid, optUuid, dateStr, optDate, bool } from "../validation";

const reqDateTime = (label: string) => z.preprocess((v) => (typeof v === "string" && v ? fromLocalInput(v) : v instanceof Date ? v : null),
  z.date({ message: `${label} is required` }));
const optDateTime = z.preprocess((v) => (typeof v === "string" && v ? fromLocalInput(v) : v instanceof Date ? v : null), z.date().nullable());
function notFuture(d: Date | null, label: string) { if (d && d.getTime() > Date.now() + 60000) throw new DomainError(`${label} cannot be in the future.`); }

// ============================== CONTRAST MEDIA ==============================
export async function receiveContrast(actor: Actor, input: Record<string, unknown>) {
  assertCan(actor, "contrast.inventory");
  const d = parse(z.object({ agentId: uuid, batchNo: reqStr("Batch number", 60), expiryDate: dateStr, quantity: z.coerce.number().positive("Quantity must be positive"),
    supplier: optStr, receivedOn: optDate }), input);
  if (d.expiryDate <= localDate()) throw new DomainError("Cannot receive stock that has already expired.");
  return txAs(actor, async (db) => {
    const b = await one(`INSERT INTO contrast_batches (agent_id, batch_no, expiry_date, quantity_received, current_stock, supplier, received_on, received_by)
                         VALUES ($1,$2,$3,$4,$4,$5,COALESCE($6,current_date),$7) ON CONFLICT (agent_id, batch_no) DO NOTHING RETURNING id`,
      [d.agentId, d.batchNo, d.expiryDate, d.quantity, d.supplier, d.receivedOn, actor.userId], db);
    if (!b) throw new DomainError("This batch number already exists for this agent – use a stock adjustment instead.");
    await q(`INSERT INTO contrast_stock_movements (batch_id, movement_type, quantity, reason, user_id) VALUES ($1,'RECEIPT',$2,'Stock received',$3)`, [b.id, d.quantity, actor.userId], db);
    await audit(db, actor, "contrast.receive", "contrast_batch", b.id, d);
  });
}

export async function adjustContrast(actor: Actor, input: Record<string, unknown>) {
  assertCan(actor, "contrast.inventory");
  const d = parse(z.object({ batchId: uuid, type: z.enum(["ADJUSTMENT", "DISPOSAL"]), quantity: z.coerce.number().refine((n) => n !== 0, "Quantity cannot be zero"), reason: reqStr("Reason", 500) }), input);
  return txAs(actor, async (db) => {
    const b = await one(`SELECT * FROM contrast_batches WHERE id=$1 FOR UPDATE`, [d.batchId], db);
    if (!b) throw new NotFoundError("Batch");
    const delta = d.type === "DISPOSAL" ? -Math.abs(d.quantity) : d.quantity;
    if (b.current_stock + delta < 0) throw new DomainError(`Adjustment would make stock negative (current ${b.current_stock}).`);
    await q(`UPDATE contrast_batches SET current_stock = current_stock + $2 WHERE id=$1`, [d.batchId, delta], db);
    await q(`INSERT INTO contrast_stock_movements (batch_id, movement_type, quantity, reason, user_id) VALUES ($1,$2,$3,$4,$5)`, [d.batchId, d.type, delta, d.reason, actor.userId], db);
    await audit(db, actor, "contrast.adjust", "contrast_batch", d.batchId, { delta, reason: d.reason });
  });
}

const adminSchema = z.object({
  appointmentId: uuid, batchId: uuid, doseMl: z.coerce.number().positive("Dose must be positive").max(500),
  route: z.enum(["IV_HAND", "IV_INJECTOR", "ORAL", "OTHER"]), administeredAt: optDateTime, administeredBy: optUuid,
  adverseReaction: bool, reactionSeverity: z.preprocess((v) => (v === "" || v === undefined ? null : v), z.enum(["MILD", "MODERATE", "SEVERE"]).nullable()),
  reactionDetails: optStr, extravasation: bool, extravasationDetails: optStr,
});

/** Records administration, decrements inventory and raises an incident for reactions/extravasation – one transaction. */
export async function administerContrast(actor: Actor, input: z.input<typeof adminSchema>) {
  assertCan(actor, "contrast.administer");
  const d = parse(adminSchema, input);
  const at = d.administeredAt ?? new Date();
  notFuture(at, "Administration time");
  if (d.adverseReaction && (!d.reactionSeverity || !d.reactionDetails)) throw new DomainError("Record the reaction severity and details.");
  if (d.extravasation && !d.extravasationDetails) throw new DomainError("Record extravasation details.");
  return txAs(actor, async (db) => {
    const a = await one(`SELECT * FROM appointments WHERE id=$1`, [d.appointmentId], db);
    if (!a) throw new NotFoundError("Appointment");
    if (!["ARRIVED", "SCREENING", "PREPARATION", "CLEARED", "SCANNING", "SCANNED"].includes(a.status)) throw new DomainError("Contrast can only be recorded for an active examination.");
    if (a.screening_status !== "CLEAR") throw new DomainError("Contrast cannot be administered before MRI safety clearance.", "SAFETY_BLOCK");
    const b = await one(`SELECT b.*, ag.name AS agent_name FROM contrast_batches b JOIN contrast_agents ag ON ag.id=b.agent_id WHERE b.id=$1 FOR UPDATE OF b`, [d.batchId], db);
    if (!b) throw new NotFoundError("Contrast batch");
    if (b.expiry_date < localDate(at)) throw new DomainError(`Batch ${b.batch_no} expired on ${b.expiry_date} – do not use.`, "SAFETY_BLOCK");
    if (b.current_stock < d.doseMl) throw new DomainError(`Insufficient stock in batch ${b.batch_no} (${b.current_stock} mL available).`);
    const staffId = d.administeredBy || actor.staffId;
    if (!staffId) throw new DomainError("Select the administering staff member.");
    let incidentId: string | null = null;
    if (d.adverseReaction || d.extravasation) {
      const inc = await createIncidentTx(db, actor, {
        occurredAt: at, category: d.adverseReaction ? "CONTRAST_REACTION" : "EXTRAVASATION",
        severity: d.reactionSeverity === "SEVERE" ? "SEVERE" : d.reactionSeverity === "MODERATE" ? "MODERATE" : "LOW",
        description: [d.adverseReaction && `Contrast reaction (${d.reactionSeverity}): ${d.reactionDetails}`, d.extravasation && `Extravasation: ${d.extravasationDetails}`].filter(Boolean).join("\n"),
        immediateAction: null, personsInvolved: null, patientId: a.patient_id, appointmentId: a.id, location: "MRI suite",
      });
      incidentId = inc.id;
    }
    const row = await one(
      `INSERT INTO contrast_administrations (appointment_id, patient_id, agent_id, batch_id, dose_ml, route, administered_at, administered_by, adverse_reaction,
         reaction_severity, reaction_details, extravasation, extravasation_details, incident_id, recorded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
      [a.id, a.patient_id, b.agent_id, b.id, d.doseMl, d.route, at, staffId, d.adverseReaction, d.adverseReaction ? d.reactionSeverity : null,
        d.reactionDetails, d.extravasation, d.extravasationDetails, incidentId, actor.userId], db);
    await q(`UPDATE contrast_batches SET current_stock = current_stock - $2 WHERE id=$1`, [b.id, d.doseMl], db);
    await q(`INSERT INTO contrast_stock_movements (batch_id, movement_type, quantity, reason, administration_id, user_id) VALUES ($1,'ADMINISTRATION',$2,$3,$4,$5)`,
      [b.id, -d.doseMl, `Administered – ${a.accession_no}`, row!.id, actor.userId], db);
    await q(`UPDATE scan_records SET contrast_used = true WHERE appointment_id=$1`, [a.id], db);
    await q(`INSERT INTO workflow_events (appointment_id, from_status, to_status, event, note, user_id) VALUES ($1,$2,$2,'CONTRAST_ADMINISTERED',$3,$4)`,
      [a.id, a.status, `${b.agent_name} ${d.doseMl} mL (batch ${b.batch_no})${incidentId ? " – incident raised" : ""}`, actor.userId], db);
    await audit(db, actor, "contrast.administer", "contrast_administration", row!.id, { appointmentId: a.id, dose: d.doseMl, incidentId });
    return { id: row!.id, incidentId };
  });
}

// ============================== EQUIPMENT QC ==============================
export function evaluateQc(value: number | null, lower: number | null, upper: number | null, thresholdSource: string | null): "PASS" | "FAIL" | "NOT_EVALUATED" {
  if (value === null || value === undefined) return "NOT_EVALUATED";
  if ((lower === null && upper === null) || !thresholdSource) return "NOT_EVALUATED"; // thresholds must be configured from approved guidance
  if (lower !== null && value < lower) return "FAIL";
  if (upper !== null && value > upper) return "FAIL";
  return "PASS";
}

export async function recordQcSession(actor: Actor, input: Record<string, any>) {
  assertCan(actor, "qc.record");
  const d = parse(z.object({ scannerId: uuid, frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "CUSTOM"]), performedAt: optDateTime, performedBy: optUuid,
    phantom: optStr, notes: optStr, correctiveAction: optStr,
    values: z.record(z.string(), optNum).default({}), observations: z.record(z.string(), optStr).default({}),
    manualResults: z.record(z.string(), z.preprocess((v) => (v === "" || v === undefined ? null : v), z.enum(["PASS", "FAIL"]).nullable())).default({}) }), input);
  const at = d.performedAt ?? new Date();
  notFuture(at, "QC time");
  return txAs(actor, async (db) => {
    const params = await q(`SELECT * FROM qc_parameters WHERE scanner_id=$1 AND frequency=$2 AND is_active ORDER BY sort_order, name`, [d.scannerId, d.frequency], db);
    if (!params.length) throw new DomainError("No QC parameters are configured for this scanner and frequency.");
    const results = params.map((p) => {
      const v = d.values[p.id] ?? null;
      let r = evaluateQc(v, p.lower_limit, p.upper_limit, p.threshold_source);
      // Where no approved threshold exists, the operator's documented visual/qualitative judgement may be recorded.
      if (r === "NOT_EVALUATED" && d.manualResults[p.id]) r = d.manualResults[p.id]!;
      return { p, v, r, obs: d.observations[p.id] ?? null };
    });
    if (results.every((x) => x.v === null && !x.obs && !d.manualResults[x.p.id])) throw new DomainError("Enter at least one QC measurement or observation.");
    const overall = results.some((x) => x.r === "FAIL") ? "FAIL" : results.every((x) => x.r === "PASS") ? "PASS" : "NOT_EVALUATED";
    if (overall === "FAIL" && !d.correctiveAction) throw new DomainError("QC failed – record the corrective action taken.");
    const staffId = d.performedBy || actor.staffId;
    if (!staffId) throw new DomainError("Select the staff member who performed QC.");
    const s = await one(`INSERT INTO qc_sessions (scanner_id, frequency, performed_at, performed_by, phantom, overall_result, notes, corrective_action, recorded_by)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [d.scannerId, d.frequency, at, staffId, d.phantom, overall, d.notes, d.correctiveAction, actor.userId], db);
    for (const x of results) await q(`INSERT INTO qc_results (session_id, parameter_id, value, observation, result) VALUES ($1,$2,$3,$4,$5)`, [s!.id, x.p.id, x.v, x.obs, x.r], db);
    await audit(db, actor, "qc.record", "qc_session", s!.id, { overall });
    return { id: s!.id, overall };
  });
}

export async function verifyQcSession(actor: Actor, id: string) {
  assertCan(actor, "qc.verify");
  const r = await one(`UPDATE qc_sessions SET verified_by=$2, verified_at=now() WHERE id=$1 AND verified_at IS NULL RETURNING id`, [id, actor.userId]);
  if (!r) throw new DomainError("QC session not found or already verified.");
  await audit(undefined, actor, "qc.verify", "qc_session", id);
}

export async function saveQcParameter(actor: Actor, id: string | null, input: Record<string, unknown>) {
  assertCan(actor, "qc.configure");
  const d = parse(z.object({ scannerId: uuid, name: reqStr("Parameter", 120), unit: optStr, frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "CUSTOM"]),
    lowerLimit: optNum, upperLimit: optNum, thresholdSource: optStr, isActive: bool, sortOrder: optInt }), input);
  if ((d.lowerLimit !== null || d.upperLimit !== null) && !d.thresholdSource)
    throw new DomainError("Acceptance limits require a documented source (manufacturer guidance or approved departmental standard).");
  if (d.lowerLimit !== null && d.upperLimit !== null && d.lowerLimit > d.upperLimit) throw new DomainError("Lower limit cannot exceed upper limit.");
  const row = id
    ? await one(`UPDATE qc_parameters SET name=$2, unit=$3, frequency=$4, lower_limit=$5, upper_limit=$6, threshold_source=$7, is_active=$8, sort_order=COALESCE($9,sort_order) WHERE id=$1 RETURNING id`,
      [id, d.name, d.unit, d.frequency, d.lowerLimit, d.upperLimit, d.thresholdSource, d.isActive, d.sortOrder])
    : await one(`INSERT INTO qc_parameters (scanner_id, name, unit, frequency, lower_limit, upper_limit, threshold_source, is_active, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,true,COALESCE($8,99)) RETURNING id`,
      [d.scannerId, d.name, d.unit, d.frequency, d.lowerLimit, d.upperLimit, d.thresholdSource, d.sortOrder]);
  await audit(undefined, actor, id ? "qc_parameter.update" : "qc_parameter.create", "qc_parameter", row?.id, d);
}

// ============================== MAINTENANCE ==============================
export async function setScannerStatus(actor: Actor, scannerId: string, status: string, note: string | null, db?: Db) {
  assertAny(actor, "scanner.status", "maintenance.manage");
  if (!["AVAILABLE", "MAINTENANCE", "UNAVAILABLE"].includes(status)) throw new DomainError("Invalid scanner status.");
  const run = async (c: Db) => {
    const s = await one(`SELECT * FROM scanners WHERE id=$1 FOR UPDATE`, [scannerId], c);
    if (!s) throw new NotFoundError("Scanner");
    if (s.status === "IN_USE") throw new DomainError("Scanner is in use – complete the current examination first.");
    if (status === "AVAILABLE") {
      const open = await one(`SELECT 1 FROM maintenance_events WHERE scanner_id=$1 AND status <> 'CLOSED' AND event_type IN ('BREAKDOWN','REPAIR')`, [scannerId], c);
      if (open && !can(actor, "maintenance.rts")) throw new ForbiddenError("An open breakdown exists – return to service must be authorised.");
      if (open) throw new DomainError("Close the open breakdown with a return-to-service authorisation instead.");
    }
    await q(`UPDATE scanners SET status=$2, status_note=$3 WHERE id=$1`, [scannerId, status, note], c);
    await audit(c, actor, "scanner.status", "scanner", scannerId, { from: s.status, to: status, note });
  };
  return db ? run(db) : txAs(actor, run);
}

const maintSchema = z.object({
  scannerId: uuid, scheduleId: optUuid, eventType: z.enum(["PREVENTIVE", "BREAKDOWN", "REPAIR", "INSPECTION", "SOFTWARE_UPDATE"]),
  reportedAt: optDateTime, faultDescription: optStr, engineerName: optStr, engineerCompany: optStr, engineerContact: optStr,
  downtimeStart: optDateTime, downtimeEnd: optDateTime, workDone: optStr, partsReplaced: optStr,
  status: z.enum(["OPEN", "IN_PROGRESS", "AWAITING_RTS", "CLOSED"]).default("OPEN"), takeOffline: bool,
});

export async function logMaintenance(actor: Actor, input: z.input<typeof maintSchema>) {
  assertCan(actor, "maintenance.manage");
  const d = parse(maintSchema, input);
  if (d.eventType === "BREAKDOWN" && !d.faultDescription) throw new DomainError("Describe the fault.");
  if (d.downtimeEnd && d.downtimeStart && d.downtimeEnd < d.downtimeStart) throw new DomainError("Downtime end must be after start.");
  if (d.status === "CLOSED" && ["BREAKDOWN", "REPAIR"].includes(d.eventType)) throw new DomainError("Breakdowns are closed via return-to-service authorisation.");
  const reportedAt = d.reportedAt ?? new Date();
  notFuture(reportedAt, "Reported time");
  return txAs(actor, async (db) => {
    const takeOffline = d.takeOffline || d.eventType === "BREAKDOWN";
    const row = await one(
      `INSERT INTO maintenance_events (scanner_id, schedule_id, event_type, reported_at, fault_description, engineer_name, engineer_company, engineer_contact,
         downtime_start, downtime_end, work_done, parts_replaced, status, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
      [d.scannerId, d.scheduleId, d.eventType, reportedAt, d.faultDescription, d.engineerName, d.engineerCompany, d.engineerContact,
        d.downtimeStart ?? (takeOffline ? reportedAt : null), d.downtimeEnd, d.workDone, d.partsReplaced, d.status, actor.userId], db);
    if (takeOffline && d.status !== "CLOSED") {
      const sc = await one(`SELECT status FROM scanners WHERE id=$1 FOR UPDATE`, [d.scannerId], db);
      if (sc?.status === "IN_USE") throw new DomainError("Scanner is in use – complete or abandon the current examination before taking it offline.");
      await q(`UPDATE scanners SET status=$2, status_note=$3 WHERE id=$1`, [d.scannerId, d.eventType === "BREAKDOWN" ? "UNAVAILABLE" : "MAINTENANCE", `${d.eventType.toLowerCase()} logged`], db);
    }
    if (d.scheduleId && d.status === "CLOSED") await completeScheduleTx(db, d.scheduleId, localDate(reportedAt));
    await audit(db, actor, "maintenance.log", "maintenance_event", row!.id, { type: d.eventType, takeOffline });
    return row!;
  });
}

async function completeScheduleTx(db: Db, scheduleId: string, doneOn: string) {
  await q(`UPDATE maintenance_schedules SET last_done_on=$2, next_due_on=$2::date + frequency_days WHERE id=$1`, [scheduleId, doneOn], db);
}

export async function updateMaintenance(actor: Actor, id: string, input: Record<string, unknown>) {
  assertCan(actor, "maintenance.manage");
  const d = parse(z.object({ status: z.enum(["OPEN", "IN_PROGRESS", "AWAITING_RTS", "CLOSED"]), workDone: optStr, partsReplaced: optStr, engineerName: optStr,
    engineerCompany: optStr, engineerContact: optStr, downtimeEnd: optDateTime }), input);
  await txAs(actor, async (db) => {
    const e = await one(`SELECT * FROM maintenance_events WHERE id=$1 FOR UPDATE`, [id], db);
    if (!e) throw new NotFoundError("Maintenance event");
    if (e.status === "CLOSED") throw new DomainError("This event is closed.");
    if (d.status === "CLOSED" && ["BREAKDOWN", "REPAIR"].includes(e.event_type)) throw new DomainError("Use 'Authorise return to service' to close a breakdown/repair.");
    await q(`UPDATE maintenance_events SET status=$2, work_done=COALESCE($3,work_done), parts_replaced=COALESCE($4,parts_replaced), engineer_name=COALESCE($5,engineer_name),
              engineer_company=COALESCE($6,engineer_company), engineer_contact=COALESCE($7,engineer_contact), downtime_end=COALESCE($8,downtime_end) WHERE id=$1`,
      [id, d.status, d.workDone, d.partsReplaced, d.engineerName, d.engineerCompany, d.engineerContact, d.downtimeEnd], db);
    if (d.status === "CLOSED") {
      if (e.schedule_id) await completeScheduleTx(db, e.schedule_id, localDate());
      if (e.downtime_start && !e.downtime_end && !d.downtimeEnd) await q(`UPDATE maintenance_events SET downtime_end=now() WHERE id=$1`, [id], db);
      const open = await one(`SELECT 1 FROM maintenance_events WHERE scanner_id=$1 AND status<>'CLOSED' AND id<>$2`, [e.scanner_id, id], db);
      if (!open) await q(`UPDATE scanners SET status='AVAILABLE', status_note=NULL WHERE id=$1 AND status='MAINTENANCE'`, [e.scanner_id], db);
    }
    await audit(db, actor, "maintenance.update", "maintenance_event", id, d);
  });
}

export async function returnToService(actor: Actor, id: string, notes: string | null) {
  assertCan(actor, "maintenance.rts");
  if (!notes || notes.length < 5) throw new DomainError("Record the return-to-service checks performed (e.g. post-repair QC result).");
  await txAs(actor, async (db) => {
    const e = await one(`SELECT * FROM maintenance_events WHERE id=$1 FOR UPDATE`, [id], db);
    if (!e) throw new NotFoundError("Maintenance event");
    if (e.status === "CLOSED") throw new DomainError("Already closed.");
    await q(`UPDATE maintenance_events SET status='CLOSED', rts_by=$2, rts_at=now(), rts_notes=$3, downtime_end=COALESCE(downtime_end, now()) WHERE id=$1`, [id, actor.userId, notes], db);
    const open = await one(`SELECT 1 FROM maintenance_events WHERE scanner_id=$1 AND status<>'CLOSED' AND id<>$2`, [e.scanner_id, id], db);
    if (!open) await q(`UPDATE scanners SET status='AVAILABLE', status_note=NULL WHERE id=$1 AND status IN ('MAINTENANCE','UNAVAILABLE')`, [e.scanner_id], db);
    await audit(db, actor, "maintenance.return_to_service", "maintenance_event", id, { notes });
  });
}

export async function saveSchedule(actor: Actor, input: Record<string, unknown>) {
  assertCan(actor, "maintenance.manage");
  const d = parse(z.object({ scannerId: uuid, title: reqStr("Title", 200), frequencyDays: z.coerce.number().int().positive(), provider: optStr, nextDueOn: dateStr }), input);
  const r = await one(`INSERT INTO maintenance_schedules (scanner_id, title, frequency_days, provider, next_due_on) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [d.scannerId, d.title, d.frequencyDays, d.provider, d.nextDueOn]);
  await audit(undefined, actor, "maintenance_schedule.create", "maintenance_schedule", r!.id, d);
}

// ============================== STAFF & DUTY ==============================
const staffSchema = z.object({
  staffNo: reqStr("Staff ID", 40), fullName: reqStr("Full name", 200), designation: reqStr("Designation", 120), phone: optStr,
  email: optStr.pipe(z.string().email("Enter a valid email").nullable()),
  employmentStatus: z.enum(["ACTIVE", "PART_TIME", "LOCUM", "ON_LEAVE", "SUSPENDED", "LEFT"]),
  registrationBody: optStr, registrationNo: optStr, registrationExpiry: optDate, contractedHoursWeek: optNum,
});
export async function saveStaff(actor: Actor, id: string | null, input: z.input<typeof staffSchema>) {
  assertCan(actor, "staff.manage");
  const d = parse(staffSchema, input);
  const params = [d.staffNo, d.fullName, d.designation, d.phone, d.email, d.employmentStatus, d.registrationBody, d.registrationNo, d.registrationExpiry, d.contractedHoursWeek ?? 40];
  try {
    const row = id
      ? await one(`UPDATE staff SET staff_no=$2, full_name=$3, designation=$4, phone=$5, email=$6, employment_status=$7, registration_body=$8, registration_no=$9,
                    registration_expiry=$10, contracted_hours_week=$11, updated_at=now() WHERE id=$1 RETURNING id`, [id, ...params])
      : await one(`INSERT INTO staff (hospital_id, staff_no, full_name, designation, phone, email, employment_status, registration_body, registration_no, registration_expiry, contracted_hours_week)
                   VALUES ($11,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`, [...params, actor.hospitalId]);
    await audit(undefined, actor, id ? "staff.update" : "staff.create", "staff", row?.id, { staffNo: d.staffNo });
    return row;
  } catch (e: any) {
    if (e?.code === "23505") throw new DomainError("Staff ID already exists.");
    throw e;
  }
}

export async function addCompetency(actor: Actor, input: Record<string, unknown>) {
  assertCan(actor, "staff.manage");
  const d = parse(z.object({ staffId: uuid, competency: reqStr("Competency", 200), level: z.enum(["TRAINING", "SUPERVISED", "COMPETENT", "TRAINER"]),
    achievedOn: optDate, expiresOn: optDate, assessedBy: optStr }), input);
  await q(`INSERT INTO staff_competencies (staff_id, competency, level, achieved_on, expires_on, assessed_by) VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (staff_id, competency) DO UPDATE SET level=EXCLUDED.level, achieved_on=EXCLUDED.achieved_on, expires_on=EXCLUDED.expires_on, assessed_by=EXCLUDED.assessed_by`,
    [d.staffId, d.competency, d.level, d.achievedOn, d.expiresOn, d.assessedBy]);
  await audit(undefined, actor, "staff.competency", "staff", d.staffId, d);
}

export async function addTraining(actor: Actor, input: Record<string, unknown>) {
  assertCan(actor, "staff.manage");
  const d = parse(z.object({ staffId: uuid, title: reqStr("Training title", 200), provider: optStr, category: z.enum(["MANDATORY", "MR_SAFETY", "CPD", "EQUIPMENT", "OTHER"]),
    completedOn: dateStr, expiresOn: optDate, hours: optNum, notes: optStr }), input);
  if (d.completedOn > localDate()) throw new DomainError("Completion date cannot be in the future.");
  await q(`INSERT INTO training_records (staff_id, title, provider, category, completed_on, expires_on, hours, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [d.staffId, d.title, d.provider, d.category, d.completedOn, d.expiresOn, d.hours, d.notes]);
  await audit(undefined, actor, "staff.training", "staff", d.staffId, { title: d.title });
}

export async function requestLeave(actor: Actor, input: Record<string, unknown>) {
  assertAny(actor, "staff.manage", "roster.manage", "leave.approve");
  const d = parse(z.object({ staffId: uuid, leaveType: z.enum(["ANNUAL", "SICK", "MATERNITY", "PATERNITY", "STUDY", "COMPASSIONATE", "OTHER"]), startDate: dateStr, endDate: dateStr, notes: optStr }), input);
  if (d.endDate < d.startDate) throw new DomainError("End date must be on or after start date.");
  const overlap = await one(`SELECT 1 FROM leave_records WHERE staff_id=$1 AND status IN ('REQUESTED','APPROVED') AND daterange(start_date,end_date,'[]') && daterange($2::date,$3::date,'[]')`, [d.staffId, d.startDate, d.endDate]);
  if (overlap) throw new DomainError("This overlaps an existing leave request.");
  const r = await one(`INSERT INTO leave_records (staff_id, leave_type, start_date, end_date, notes) VALUES ($1,$2,$3,$4,$5) RETURNING id`, [d.staffId, d.leaveType, d.startDate, d.endDate, d.notes]);
  await audit(undefined, actor, "leave.request", "leave", r!.id, d);
}

export async function decideLeave(actor: Actor, id: string, decision: string) {
  assertCan(actor, "leave.approve");
  if (!["APPROVED", "DECLINED", "CANCELLED"].includes(decision)) throw new DomainError("Invalid decision.");
  await txAs(actor, async (db) => {
    const l = await one(`UPDATE leave_records SET status=$2, decided_by=$3, decided_at=now() WHERE id=$1 RETURNING *`, [id, decision, actor.userId], db);
    if (!l) throw new NotFoundError("Leave record");
    let removed = 0;
    if (decision === "APPROVED") {
      const r = await q(`DELETE FROM duty_roster WHERE staff_id=$1 AND duty_date BETWEEN $2 AND $3 RETURNING id`, [l.staff_id, l.start_date, l.end_date], db);
      removed = r.length;
    }
    await audit(db, actor, `leave.${decision.toLowerCase()}`, "leave", id, { rosterShiftsRemoved: removed });
  });
}

export async function assignDuty(actor: Actor, input: Record<string, unknown>) {
  assertCan(actor, "roster.manage");
  const d = parse(z.object({ staffId: uuid, dutyDate: dateStr, shift: z.enum(["MORNING", "AFTERNOON", "NIGHT", "ON_CALL"]), scannerId: optUuid, roleNote: optStr }), input);
  return txAs(actor, async (db) => {
    const st = await one(`SELECT employment_status FROM staff WHERE id=$1`, [d.staffId], db);
    if (!st) throw new NotFoundError("Staff");
    if (["LEFT", "SUSPENDED"].includes(st.employment_status)) throw new DomainError("This staff member is not available for duty.");
    const leave = await one(`SELECT leave_type FROM leave_records WHERE staff_id=$1 AND status='APPROVED' AND $2::date BETWEEN start_date AND end_date`, [d.staffId, d.dutyDate], db);
    if (leave) throw new DomainError(`Staff member is on approved ${leave.leave_type.toLowerCase()} leave on this date.`);
    if (d.shift === "MORNING") {
      const night = await one(`SELECT 1 FROM duty_roster WHERE staff_id=$1 AND duty_date=$2::date - 1 AND shift='NIGHT'`, [d.staffId, d.dutyDate], db);
      if (night) throw new DomainError("Staff member worked the previous night shift – a morning shift would breach rest requirements.");
    }
    const r = await one(`INSERT INTO duty_roster (staff_id, duty_date, shift, scanner_id, role_note, created_by) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING id`,
      [d.staffId, d.dutyDate, d.shift, d.scannerId, d.roleNote, actor.userId], db);
    if (!r) throw new DomainError("Staff member is already rostered for this shift.");
    await audit(db, actor, "roster.assign", "duty_roster", r.id, d);
  });
}
export async function removeDuty(actor: Actor, id: string) {
  assertCan(actor, "roster.manage");
  const r = await one(`DELETE FROM duty_roster WHERE id=$1 RETURNING staff_id, duty_date, shift`, [id]);
  if (!r) throw new NotFoundError("Roster entry");
  await audit(undefined, actor, "roster.remove", "duty_roster", id, r);
}

export async function recordAttendance(actor: Actor, input: Record<string, unknown>) {
  assertCan(actor, "roster.manage");
  const d = parse(z.object({ staffId: uuid, workDate: dateStr, status: z.enum(["PRESENT", "LATE", "ABSENT", "ON_LEAVE", "OFF_DUTY"]), clockIn: optDateTime, clockOut: optDateTime, notes: optStr }), input);
  if (d.workDate > localDate()) throw new DomainError("Attendance cannot be recorded for a future date.");
  if (d.clockIn && d.clockOut && d.clockOut < d.clockIn) throw new DomainError("Clock-out must be after clock-in.");
  await q(`INSERT INTO attendance_records (staff_id, work_date, status, clock_in, clock_out, notes, recorded_by) VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (staff_id, work_date) DO UPDATE SET status=EXCLUDED.status, clock_in=EXCLUDED.clock_in, clock_out=EXCLUDED.clock_out, notes=EXCLUDED.notes, recorded_by=EXCLUDED.recorded_by`,
    [d.staffId, d.workDate, d.status, d.clockIn, d.clockOut, d.notes, actor.userId]);
  await audit(undefined, actor, "attendance.record", "staff", d.staffId, { date: d.workDate, status: d.status });
}

// ============================== INCIDENTS ==============================
interface IncidentCore {
  occurredAt: Date; category: string; severity: string; description: string; immediateAction: string | null; personsInvolved: string | null;
  patientId: string | null; appointmentId: string | null; location: string | null;
}
async function createIncidentTx(db: Db, actor: Actor, d: IncidentCore) {
  const n = (await one<{ n: number }>(`SELECT nextval('incident_seq') AS n`, [], db))!.n;
  const ref = `INC-${localDate(d.occurredAt).slice(0, 4)}-${String(n).padStart(4, "0")}`;
  const row = await one(
    `INSERT INTO incidents (ref_no, occurred_at, category, severity, location, description, immediate_action, persons_involved, patient_id, appointment_id, reported_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id, ref_no`,
    [ref, d.occurredAt, d.category, d.severity, d.location, d.description, d.immediateAction, d.personsInvolved, d.patientId, d.appointmentId, actor.userId], db);
  await audit(db, actor, "incident.report", "incident", row!.id, { ref, category: d.category, severity: d.severity });
  return row!;
}

export async function reportIncident(actor: Actor, input: Record<string, unknown>) {
  assertCan(actor, "incidents.report");
  const d = parse(z.object({ occurredAt: reqDateTime("Incident date/time"), category: z.enum(["PATIENT", "CONTRAST_REACTION", "EXTRAVASATION", "PROJECTILE", "MRI_BURN", "FALL", "NEAR_MISS", "EQUIPMENT_FAILURE", "MRI_SAFETY", "OTHER"]),
    severity: z.enum(["NO_HARM", "LOW", "MODERATE", "SEVERE", "CRITICAL"]), location: optStr, description: reqStr("Description", 5000), immediateAction: optStr,
    personsInvolved: optStr, patientMrn: optStr }), input);
  notFuture(d.occurredAt, "Incident time");
  return txAs(actor, async (db) => {
    let patientId: string | null = null;
    if (d.patientMrn) {
      const p = await one(`SELECT id FROM patients WHERE mrn=$1`, [d.patientMrn], db);
      if (!p) throw new DomainError(`No patient with MRN ${d.patientMrn}.`);
      patientId = p.id;
    }
    return createIncidentTx(db, actor, { ...d, patientId, appointmentId: null });
  });
}

export async function updateIncident(actor: Actor, id: string, input: Record<string, unknown>) {
  assertCan(actor, "incidents.manage");
  const d = parse(z.object({ status: z.enum(["OPEN", "UNDER_INVESTIGATION", "ACTION_PLANNED", "CLOSED"]), severity: z.enum(["NO_HARM", "LOW", "MODERATE", "SEVERE", "CRITICAL"]),
    investigation: optStr, correctiveAction: optStr, preventiveAction: optStr, responsibleOfficer: optStr, closureNotes: optStr }), input);
  if (d.status === "CLOSED" && (!d.investigation || !d.correctiveAction || !d.closureNotes))
    throw new DomainError("Closing requires investigation findings, corrective action and closure notes.");
  await txAs(actor, async (db) => {
    const cur = await one(`SELECT status FROM incidents WHERE id=$1 FOR UPDATE`, [id], db);
    if (!cur) throw new NotFoundError("Incident");
    await q(`UPDATE incidents SET status=$2, severity=$3, investigation=$4, corrective_action=$5, preventive_action=$6, responsible_officer=$7, closure_notes=$8,
              closed_at = CASE WHEN $2='CLOSED' THEN COALESCE(closed_at, now()) ELSE NULL END, updated_at=now() WHERE id=$1`,
      [id, d.status, d.severity, d.investigation, d.correctiveAction, d.preventiveAction, d.responsibleOfficer, d.closureNotes], db);
    await audit(db, actor, "incident.update", "incident", id, { from: cur.status, to: d.status });
  });
}

// ============================== CLEANING ==============================
export async function recordCleaning(actor: Actor, input: Record<string, any>) {
  assertCan(actor, "cleaning.record");
  const d = parse(z.object({ areaId: uuid, cleanedAt: optDateTime, staffId: optUuid, items: z.array(z.string()).default([]), notes: optStr }), input);
  const at = d.cleanedAt ?? new Date();
  notFuture(at, "Cleaning time");
  return txAs(actor, async (db) => {
    const area = await one(`SELECT * FROM cleaning_areas WHERE id=$1 AND is_active`, [d.areaId], db);
    if (!area) throw new NotFoundError("Cleaning area");
    const checklist: Record<string, boolean> = {};
    for (const item of area.checklist as string[]) checklist[item] = d.items.includes(item);
    const compliant = Object.values(checklist).every(Boolean);
    if (!compliant && !d.notes) throw new DomainError("Some checklist items were not completed – explain why in the notes.");
    const staffId = d.staffId || actor.staffId;
    if (!staffId) throw new DomainError("Select the staff member responsible.");
    const r = await one(`INSERT INTO cleaning_records (area_id, cleaned_at, staff_id, checklist, compliant, notes, recorded_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [d.areaId, at, staffId, JSON.stringify(checklist), compliant, d.notes, actor.userId], db);
    await audit(db, actor, "cleaning.record", "cleaning_record", r!.id, { compliant });
    return { compliant };
  });
}

export async function verifyCleaning(actor: Actor, id: string) {
  assertCan(actor, "cleaning.verify");
  const r = await one(`UPDATE cleaning_records SET verified_by=$2, verified_at=now() WHERE id=$1 AND verified_at IS NULL RETURNING id`, [id, actor.userId]);
  if (!r) throw new DomainError("Record not found or already verified.");
  await audit(undefined, actor, "cleaning.verify", "cleaning_record", id);
}
