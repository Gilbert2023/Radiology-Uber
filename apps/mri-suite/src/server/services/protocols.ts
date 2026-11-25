// MRI Protocol Library (versioned) and patient-preparation protocols.
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { q, one, tx } from "@/lib/db";
import { type Actor, assertCan } from "../actor";
import { audit } from "../audit";
import { DomainError, NotFoundError } from "../errors";
import { parse, optStr, reqStr, uuid, optNum, bool } from "../validation";

export const SEQ_FIELDS = ["name", "plane", "tr", "te", "ti", "flip_angle", "slice_thickness", "fov", "matrix", "nex", "bandwidth", "etl", "parallel_imaging", "notes"] as const;

const protocolSchema = z.object({
  scannerModel: reqStr("Scanner model", 120),
  category: z.enum(["BRAIN", "SPINE", "MSK", "ABDOMEN", "PELVIS", "CARDIAC", "MRA", "MRV", "SPECIAL"]),
  name: reqStr("Protocol name", 200),
  kind: z.enum(["DEPARTMENTAL", "EDUCATIONAL_REFERENCE"]),
  clinicalIndication: optStr, positioning: optStr, coil: optStr, contrastRequirement: optStr, specialInstructions: optStr, changeNote: optStr,
  sequences: z.array(z.record(z.string(), z.string().max(500).optional())).default([]),
});
export type ProtocolInput = z.input<typeof protocolSchema>;

async function insertSequences(db: any, protocolId: string, seqs: Record<string, string | undefined>[]) {
  let order = 1;
  for (const s of seqs) {
    if (!s.name?.trim()) continue;
    const vals = SEQ_FIELDS.map((f) => (s[f]?.trim() ? s[f]!.trim() : null));
    await q(`INSERT INTO protocol_sequences (protocol_id, seq_order, ${SEQ_FIELDS.join(", ")}) VALUES ($1,$2,${SEQ_FIELDS.map((_, i) => `$${i + 3}`).join(",")})`,
      [protocolId, order++, ...vals], db);
  }
}

export async function createProtocol(actor: Actor, input: ProtocolInput) {
  assertCan(actor, "protocols.edit");
  const d = parse(protocolSchema, input);
  return tx(async (db) => {
    const row = await one(
      `INSERT INTO mri_protocols (lineage_id, version, scanner_model, category, name, kind, clinical_indication, positioning, coil, contrast_requirement, special_instructions, change_note, created_by)
       VALUES ($1,1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [randomUUID(), d.scannerModel, d.category, d.name, d.kind, d.clinicalIndication, d.positioning, d.coil, d.contrastRequirement, d.specialInstructions, d.changeNote ?? "Initial version", actor.userId], db);
    await insertSequences(db, row!.id, d.sequences);
    await audit(db, actor, "protocol.create", "protocol", row!.id, { name: d.name });
    return row!;
  });
}

/** Editing a DRAFT changes it in place; editing an APPROVED protocol creates a new DRAFT version. */
export async function editProtocol(actor: Actor, id: string, input: ProtocolInput) {
  assertCan(actor, "protocols.edit");
  const d = parse(protocolSchema, input);
  return tx(async (db) => {
    const cur = await one(`SELECT * FROM mri_protocols WHERE id=$1 FOR UPDATE`, [id], db);
    if (!cur) throw new NotFoundError("Protocol");
    if (["ARCHIVED", "SUPERSEDED"].includes(cur.status)) throw new DomainError("Archived or superseded versions cannot be edited.");
    if (cur.status === "DRAFT" || cur.status === "PENDING_APPROVAL") {
      await q(`UPDATE mri_protocols SET scanner_model=$2, category=$3, name=$4, kind=$5, clinical_indication=$6, positioning=$7, coil=$8, contrast_requirement=$9,
                special_instructions=$10, change_note=$11, status='DRAFT', updated_at=now() WHERE id=$1`,
        [id, d.scannerModel, d.category, d.name, d.kind, d.clinicalIndication, d.positioning, d.coil, d.contrastRequirement, d.specialInstructions, d.changeNote], db);
      await q(`DELETE FROM protocol_sequences WHERE protocol_id=$1`, [id], db);
      await insertSequences(db, id, d.sequences);
      await audit(db, actor, "protocol.update", "protocol", id);
      return { id };
    }
    const pending = await one(`SELECT id FROM mri_protocols WHERE lineage_id=$1 AND status IN ('DRAFT','PENDING_APPROVAL')`, [cur.lineage_id], db);
    if (pending) throw new DomainError("A draft revision of this protocol already exists – edit that draft instead.");
    const max = await one(`SELECT max(version) AS v FROM mri_protocols WHERE lineage_id=$1`, [cur.lineage_id], db);
    if (!d.changeNote) throw new DomainError("Describe what changed in this revision.");
    const row = await one(
      `INSERT INTO mri_protocols (lineage_id, version, scanner_model, category, name, kind, clinical_indication, positioning, coil, contrast_requirement, special_instructions, change_note, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [cur.lineage_id, max!.v + 1, d.scannerModel, d.category, d.name, d.kind, d.clinicalIndication, d.positioning, d.coil, d.contrastRequirement, d.specialInstructions, d.changeNote, actor.userId], db);
    await insertSequences(db, row!.id, d.sequences);
    await audit(db, actor, "protocol.revise", "protocol", row!.id, { from: id });
    return row!;
  });
}

export async function protocolAction(actor: Actor, id: string, action: "SUBMIT" | "APPROVE" | "ARCHIVE" | "REJECT") {
  if (action === "SUBMIT") assertCan(actor, "protocols.edit"); else assertCan(actor, "protocols.approve");
  await tx(async (db) => {
    const p = await one(`SELECT * FROM mri_protocols WHERE id=$1 FOR UPDATE`, [id], db);
    if (!p) throw new NotFoundError("Protocol");
    const seqCount = (await one(`SELECT count(*)::int AS n FROM protocol_sequences WHERE protocol_id=$1`, [id], db))!.n;
    if (action === "SUBMIT") {
      if (p.status !== "DRAFT") throw new DomainError("Only drafts can be submitted.");
      await q(`UPDATE mri_protocols SET status='PENDING_APPROVAL', updated_at=now() WHERE id=$1`, [id], db);
    } else if (action === "APPROVE") {
      if (!["DRAFT", "PENDING_APPROVAL"].includes(p.status)) throw new DomainError("Only draft / pending protocols can be approved.");
      if (p.kind !== "DEPARTMENTAL") throw new DomainError("Educational references cannot be approved as departmental protocols.");
      if (!seqCount) throw new DomainError("A protocol needs at least one sequence before approval.");
      const incomplete = await one(`SELECT count(*)::int AS n FROM protocol_sequences WHERE protocol_id=$1 AND (tr IS NULL OR te IS NULL OR slice_thickness IS NULL OR fov IS NULL OR matrix IS NULL)`, [id], db);
      if (incomplete!.n) throw new DomainError(`${incomplete!.n} sequence(s) are missing core parameters (TR, TE, slice thickness, FOV, matrix). Enter the values from the scanner before approval.`);
      await q(`UPDATE mri_protocols SET status='SUPERSEDED', updated_at=now() WHERE lineage_id=$1 AND status='APPROVED'`, [p.lineage_id], db);
      await q(`UPDATE mri_protocols SET status='APPROVED', approved_by=$2, approved_at=now(), updated_at=now() WHERE id=$1`, [id, actor.userId], db);
    } else if (action === "REJECT") {
      if (p.status !== "PENDING_APPROVAL") throw new DomainError("Only pending protocols can be returned.");
      await q(`UPDATE mri_protocols SET status='DRAFT', updated_at=now() WHERE id=$1`, [id], db);
    } else {
      await q(`UPDATE mri_protocols SET status='ARCHIVED', updated_at=now() WHERE id=$1`, [id], db);
    }
    await audit(db, actor, `protocol.${action.toLowerCase()}`, "protocol", id);
  });
}

// ----------------------------- Preparation protocols -----------------------------
const prepSchema = z.object({
  name: reqStr("Name", 200), examCategory: reqStr("Examination category", 80), fastingHours: optNum, requiresEgfr: bool, oralContrast: bool, ivCannula: bool,
  medicationNotes: optStr, instructions: optStr, checklistText: optStr,
});
export async function savePrepProtocol(actor: Actor, id: string, input: z.input<typeof prepSchema>) {
  assertCan(actor, "prep.protocols.manage");
  const d = parse(prepSchema, input);
  const checklist = (d.checklistText ?? "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
    .map((label) => ({ key: label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60), label }));
  await tx(async (db) => {
    const r = await one(`UPDATE prep_protocols SET name=$2, exam_category=$3, fasting_hours=$4, requires_egfr=$5, oral_contrast=$6, iv_cannula=$7, medication_notes=$8,
        instructions=$9, checklist=$10, status='DRAFT', version=version+1, approved_by=NULL, approved_at=NULL, updated_by=$11, updated_at=now() WHERE id=$1 RETURNING id`,
      [id, d.name, d.examCategory, d.fastingHours, d.requiresEgfr, d.oralContrast, d.ivCannula, d.medicationNotes, d.instructions, JSON.stringify(checklist), actor.userId], db);
    if (!r) throw new NotFoundError("Preparation protocol");
    await audit(db, actor, "prep_protocol.update", "prep_protocol", id);
  });
}
export async function approvePrepProtocol(actor: Actor, id: string) {
  assertCan(actor, "prep.protocols.approve");
  const r = await one(`UPDATE prep_protocols SET status='APPROVED', approved_by=$2, approved_at=now() WHERE id=$1 AND status='DRAFT' RETURNING id`, [id, actor.userId]);
  if (!r) throw new DomainError("Only draft preparation protocols can be approved.");
  await audit(undefined, actor, "prep_protocol.approve", "prep_protocol", id);
}
