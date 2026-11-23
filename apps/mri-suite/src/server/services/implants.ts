// MRI Implant & Medical Device Registry.
// Documentation and decision-support only – never infers MRI safety from material,
// category or previous assessments. Clearance is made per examination by authorised staff.
import { z } from "zod";
import { q, one, tx } from "@/lib/db";
import { IMPLANT_MATERIALS, CONDITION_FIELDS, VERIFICATION_CHECKLIST } from "@/lib/constants";
import { type Actor, assertCan, can } from "../actor";
import { audit } from "../audit";
import { DomainError, NotFoundError, ForbiddenError } from "../errors";
import { parse, optStr, reqStr, optDate, uuid, optUuid } from "../validation";

const materialsSchema = z.preprocess(
  (v) => (Array.isArray(v) ? v : v ? [v] : []),
  z.array(z.enum(Object.keys(IMPLANT_MATERIALS) as [string, ...string[]])).min(1, "Select at least one material (or Unknown / not documented)"),
);
const conditionsSchema = z.record(z.string(), z.string().max(1000)).default({});

function cleanConditions(c: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const f of CONDITION_FIELDS) if (c[f.key]?.trim()) out[f.key] = c[f.key].trim();
  return out;
}

const implantSchema = z.object({
  patientId: uuid,
  categoryId: uuid,
  deviceReferenceId: optUuid,
  deviceName: reqStr("Device / implant name", 200),
  anatomicalLocation: optStr,
  side: z.preprocess((v) => (v === "" || v === undefined ? null : v), z.enum(["RIGHT", "LEFT", "BILATERAL", "MIDLINE", "NOT_APPLICABLE", "UNKNOWN"]).nullable()),
  manufacturer: optStr, modelName: optStr, modelNumber: optStr, serialNo: optStr, catalogueNo: optStr,
  implantedOn: optDate, implantedOnText: optStr, facility: optStr, implantingSpecialist: optStr, reason: optStr,
  materials: materialsSchema,
  materialDetails: optStr,
  safetyClass: z.enum(["MR_SAFE", "MR_CONDITIONAL", "MR_UNSAFE", "UNKNOWN"]),
  conditions: conditionsSchema,
  notes: optStr,
  appointmentId: optUuid,
});
export type ImplantInput = z.input<typeof implantSchema>;

function validateMaterials(m: string[]) {
  if (m.includes("UNKNOWN") && m.length > 1) throw new DomainError("'Unknown / not documented' cannot be combined with other materials.");
}

export async function createImplant(actor: Actor, input: ImplantInput) {
  assertCan(actor, "implants.manage");
  const d = parse(implantSchema, input);
  validateMaterials(d.materials);
  return tx(async (db) => {
    const p = await one(`SELECT id FROM patients WHERE id=$1`, [d.patientId], db);
    if (!p) throw new NotFoundError("Patient");
    let infoSource = "USER_ENTERED_UNVERIFIED";
    let conditions = cleanConditions(d.conditions);
    let safetyClass = d.safetyClass;
    if (d.deviceReferenceId) {
      const ref = await one(`SELECT * FROM device_references WHERE id=$1`, [d.deviceReferenceId], db);
      if (!ref) throw new NotFoundError("Device reference");
      // Copying reference data is allowed, but the per-patient record still requires verification.
      if (ref.info_status === "MANUFACTURER_VERIFIED" && safetyClass === ref.safety_class && JSON.stringify(conditions) === JSON.stringify(cleanConditions(ref.conditions))) infoSource = "MANUFACTURER_VERIFIED";
    }
    if (safetyClass === "MR_CONDITIONAL" && Object.keys(conditions).length === 0)
      throw new DomainError("For an MR Conditional device, record the manufacturer-approved conditions exactly as labelled (at least the permitted field strength).");
    const row = await one(
      `INSERT INTO patient_implants (patient_id, device_reference_id, category_id, device_name, anatomical_location, side, manufacturer, model_name, model_number,
         serial_no, catalogue_no, implanted_on, implanted_on_text, facility, implanting_specialist, reason, materials, material_details, safety_class, conditions,
         info_source, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) RETURNING *`,
      [d.patientId, d.deviceReferenceId, d.categoryId, d.deviceName, d.anatomicalLocation, d.side, d.manufacturer, d.modelName, d.modelNumber, d.serialNo,
        d.catalogueNo, d.implantedOn, d.implantedOnText, d.facility, d.implantingSpecialist, d.reason, d.materials, d.materialDetails, safetyClass,
        JSON.stringify(conditions), infoSource, d.notes, actor.userId], db);
    // If declared during an active examination's screening, it needs an assessment for that exam.
    const activeAppts = await q(`SELECT id, scanner_id, status, screening_status FROM appointments WHERE patient_id=$1 AND status IN ('ARRIVED','SCREENING','PREPARATION','CLEARED')`, [d.patientId], db);
    for (const a of activeAppts) {
      await q(`INSERT INTO implant_assessments (implant_id, appointment_id, scanner_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [row!.id, a.id, a.scanner_id], db);
      if (a.screening_status === "CLEAR") {
        await q(`UPDATE safety_screenings SET status='PENDING', decision_by=NULL, decision_at=NULL WHERE appointment_id=$1`, [a.id], db);
        await q(`UPDATE appointments SET screening_status='PENDING', status=CASE WHEN status IN ('PREPARATION','CLEARED') THEN 'SCREENING' ELSE status END WHERE id=$1`, [a.id], db);
        await q(`INSERT INTO workflow_events (appointment_id, from_status, to_status, event, note, user_id) VALUES ($1,$2,'SCREENING','SCREENING_DECISION_REVOKED',$3,$4)`,
          [a.id, a.status, `New implant registered: ${d.deviceName}`, actor.userId], db);
      }
    }
    await audit(db, actor, "implant.create", "implant", row!.id, { patientId: d.patientId, deviceName: d.deviceName, safetyClass });
    return row!;
  });
}

export async function updateImplant(actor: Actor, id: string, input: ImplantInput & { isPresent?: unknown }) {
  assertCan(actor, "implants.manage");
  const d = parse(implantSchema, input);
  validateMaterials(d.materials);
  const isPresent = !(input.isPresent === "false" || input.isPresent === false);
  return tx(async (db) => {
    const cur = await one(`SELECT * FROM patient_implants WHERE id=$1 FOR UPDATE`, [id], db);
    if (!cur) throw new NotFoundError("Implant");
    const conditions = cleanConditions(d.conditions);
    if (d.safetyClass === "MR_CONDITIONAL" && Object.keys(conditions).length === 0)
      throw new DomainError("For an MR Conditional device, record the manufacturer-approved conditions exactly as labelled.");
    const safetyChanged = cur.safety_class !== d.safetyClass || JSON.stringify(cur.conditions) !== JSON.stringify(conditions)
      || cur.model_number !== d.modelNumber || cur.manufacturer !== d.manufacturer;
    if (safetyChanged && cur.verification_status === "VERIFIED" && !can(actor, "implants.verify"))
      throw new ForbiddenError("This implant is verified. Changing identity or safety information requires implant verification permission.");
    await q(
      `UPDATE patient_implants SET category_id=$2, device_name=$3, anatomical_location=$4, side=$5, manufacturer=$6, model_name=$7, model_number=$8, serial_no=$9,
         catalogue_no=$10, implanted_on=$11, implanted_on_text=$12, facility=$13, implanting_specialist=$14, reason=$15, materials=$16, material_details=$17,
         safety_class=$18, conditions=$19, notes=$20, is_present=$21, updated_at=now()
         ${safetyChanged ? ", verification_status = CASE WHEN verification_status='VERIFIED' THEN 'UNDER_REVIEW' ELSE verification_status END, info_source='USER_ENTERED_UNVERIFIED'" : ""}
       WHERE id=$1`,
      [id, d.categoryId, d.deviceName, d.anatomicalLocation, d.side, d.manufacturer, d.modelName, d.modelNumber, d.serialNo, d.catalogueNo, d.implantedOn,
        d.implantedOnText, d.facility, d.implantingSpecialist, d.reason, d.materials, d.materialDetails, d.safetyClass, JSON.stringify(conditions), d.notes, isPresent], db);
    if (safetyChanged) {
      // Any proceed decision on an active exam must be re-made with the new information.
      const affected = await q(`UPDATE implant_assessments ia SET decision='PENDING', notes=COALESCE(ia.notes,'') || ' [Reset: device information changed]'
          FROM appointments a WHERE ia.appointment_id=a.id AND ia.implant_id=$1 AND a.status IN ('ARRIVED','SCREENING','PREPARATION','CLEARED') RETURNING a.id, a.status, a.screening_status`, [id], db);
      for (const a of affected) if (a.screening_status === "CLEAR") {
        await q(`UPDATE safety_screenings SET status='PENDING', decision_by=NULL, decision_at=NULL WHERE appointment_id=$1`, [a.id], db);
        await q(`UPDATE appointments SET screening_status='PENDING', status=CASE WHEN status IN ('PREPARATION','CLEARED') THEN 'SCREENING' ELSE status END WHERE id=$1`, [a.id], db);
      }
    }
    await audit(db, actor, "implant.update", "implant", id, { safetyChanged, isPresent });
  });
}

const verifySchema = z.object({
  status: z.enum(["NOT_STARTED", "PENDING_DOCUMENTATION", "UNDER_REVIEW", "VERIFIED", "ESCALATED", "UNSUCCESSFUL"]),
  checklist: z.record(z.string(), z.preprocess((v) => v === "on" || v === true || v === "true", z.boolean())).default({}),
  docSource: optStr, docTitle: optStr, docRevision: optStr, docReference: optStr,
  specialistConsulted: optStr,
  notes: optStr,
});

export async function recordVerification(actor: Actor, implantId: string, input: z.input<typeof verifySchema>) {
  assertCan(actor, "implants.verify");
  const d = parse(verifySchema, input);
  if (d.status === "VERIFIED") {
    const required = ["identity_confirmed", "manufacturer_docs_reviewed", "model_serial_confirmed", "safety_docs_reviewed", "restrictions_checked"];
    const missing = VERIFICATION_CHECKLIST.filter((c) => required.includes(c.key) && !d.checklist[c.key]).map((c) => c.label);
    if (missing.length) throw new DomainError(`Cannot mark VERIFIED – incomplete: ${missing.join("; ")}.`);
    if (!d.docSource || !d.docTitle || !d.docReference) throw new DomainError("Record the documentation source, title and reference used for verification.");
  }
  if (["ESCALATED", "UNSUCCESSFUL"].includes(d.status) && !d.notes) throw new DomainError("Record the reason for escalation / unsuccessful verification.");
  return tx(async (db) => {
    const imp = await one(`SELECT * FROM patient_implants WHERE id=$1 FOR UPDATE`, [implantId], db);
    if (!imp) throw new NotFoundError("Implant");
    if (d.status === "VERIFIED" && imp.safety_class === "UNKNOWN")
      throw new DomainError("Set the MRI safety classification from the reviewed documentation before marking the implant verified.");
    if (d.status === "VERIFIED" && imp.materials.length === 1 && imp.materials[0] === "UNKNOWN" && !d.notes)
      throw new DomainError("Material composition is undocumented – add a note explaining how identity was confirmed.");
    await q(`INSERT INTO implant_verifications (implant_id, checklist, doc_source, doc_title, doc_revision, doc_reference, status, specialist_consulted, notes, verified_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [implantId, JSON.stringify(d.checklist), d.docSource, d.docTitle, d.docRevision, d.docReference, d.status, d.specialistConsulted, d.notes, actor.userId], db);
    await q(`UPDATE patient_implants SET verification_status=$2, updated_at=now() WHERE id=$1`, [implantId, d.status], db);
    await audit(db, actor, "implant.verification", "implant", implantId, { status: d.status });
  });
}

// -------------------------- Device reference database --------------------------
const deviceSchema = z.object({
  categoryId: uuid,
  manufacturer: reqStr("Manufacturer", 200),
  modelName: reqStr("Model name", 200),
  modelNumber: optStr,
  materials: materialsSchema,
  materialDetails: optStr,
  safetyClass: z.enum(["MR_SAFE", "MR_CONDITIONAL", "MR_UNSAFE", "UNKNOWN"]),
  approvedFieldStrengths: optStr,
  conditions: conditionsSchema,
  sourceType: optStr, sourceTitle: optStr, sourceRevision: optStr, sourceReference: optStr,
  changeNote: optStr,
});

export async function saveDeviceReference(actor: Actor, id: string | null, input: z.input<typeof deviceSchema>) {
  assertCan(actor, "implants.configure");
  const d = parse(deviceSchema, input);
  validateMaterials(d.materials);
  const conditions = cleanConditions(d.conditions);
  if (d.safetyClass === "MR_CONDITIONAL" && !Object.keys(conditions).length) throw new DomainError("MR Conditional entries must include the labelled conditions.");
  return tx(async (db) => {
    let row;
    if (id) {
      const cur = await one(`SELECT * FROM device_references WHERE id=$1 FOR UPDATE`, [id], db);
      if (!cur) throw new NotFoundError("Device reference");
      await q(`INSERT INTO device_reference_versions (device_reference_id, version, snapshot, changed_by, change_note) VALUES ($1,$2,$3,$4,$5)`,
        [id, cur.version, JSON.stringify(cur), actor.userId, d.changeNote], db);
      row = await one(
        `UPDATE device_references SET category_id=$2, manufacturer=$3, model_name=$4, model_number=$5, materials=$6, material_details=$7, safety_class=$8,
           approved_field_strengths=$9, conditions=$10, source_type=$11, source_title=$12, source_revision=$13, source_reference=$14,
           info_status='USER_ENTERED_UNVERIFIED', last_verified_at=NULL, verified_by=NULL, version=version+1, updated_at=now() WHERE id=$1 RETURNING *`,
        [id, d.categoryId, d.manufacturer, d.modelName, d.modelNumber, d.materials, d.materialDetails, d.safetyClass, d.approvedFieldStrengths,
          JSON.stringify(conditions), d.sourceType, d.sourceTitle, d.sourceRevision, d.sourceReference], db);
    } else {
      row = await one(
        `INSERT INTO device_references (category_id, manufacturer, model_name, model_number, materials, material_details, safety_class, approved_field_strengths,
           conditions, source_type, source_title, source_revision, source_reference, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
        [d.categoryId, d.manufacturer, d.modelName, d.modelNumber, d.materials, d.materialDetails, d.safetyClass, d.approvedFieldStrengths,
          JSON.stringify(conditions), d.sourceType, d.sourceTitle, d.sourceRevision, d.sourceReference, actor.userId], db);
    }
    await audit(db, actor, id ? "device_reference.update" : "device_reference.create", "device_reference", row!.id, { version: row!.version });
    return row!;
  });
}

export async function verifyDeviceReference(actor: Actor, id: string) {
  assertCan(actor, "devices.verify");
  await tx(async (db) => {
    const cur = await one(`SELECT * FROM device_references WHERE id=$1 FOR UPDATE`, [id], db);
    if (!cur) throw new NotFoundError("Device reference");
    if (!cur.source_title || !cur.source_reference) throw new DomainError("A manufacturer source document (title and reference) is required before marking as manufacturer-verified.");
    if (cur.safety_class === "UNKNOWN") throw new DomainError("Set the safety classification from the manufacturer documentation first.");
    await q(`UPDATE device_references SET info_status='MANUFACTURER_VERIFIED', last_verified_at=now(), verified_by=$2 WHERE id=$1`, [id, actor.userId], db);
    await audit(db, actor, "device_reference.verify", "device_reference", id);
  });
}

export async function addCategory(actor: Actor, groupName: string, name: string) {
  assertCan(actor, "implants.configure");
  const d = parse(z.object({ groupName: reqStr("Group", 80), name: reqStr("Category name", 120) }), { groupName, name });
  const row = await one(`INSERT INTO implant_categories (group_name, name, created_by) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING id`, [d.groupName, d.name, actor.userId]);
  if (!row) throw new DomainError("This category already exists.");
  await audit(undefined, actor, "implant_category.create", "implant_category", row.id, d);
}
