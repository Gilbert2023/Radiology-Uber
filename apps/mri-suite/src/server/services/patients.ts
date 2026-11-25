import { z } from "zod";
import { q, one, tx } from "@/lib/db";
import { type Actor, assertCan } from "../actor";
import { audit } from "../audit";
import { DomainError, NotFoundError } from "../errors";
import { parse, optStr, reqStr, optNum, dateStr, bool } from "../validation";

const patientSchema = z.object({
  mrn: reqStr("Hospital number / MRN", 40).pipe(z.string().regex(/^[A-Za-z0-9\-/]+$/, "MRN may contain letters, numbers, - and / only")),
  fullName: reqStr("Full name", 200),
  dob: dateStr,
  sex: z.enum(["MALE", "FEMALE", "OTHER", "UNKNOWN"]),
  phone: optStr.pipe(z.string().regex(/^[+0-9 ()-]{6,20}$/, "Enter a valid phone number").nullable()),
  email: optStr.pipe(z.string().email("Enter a valid email").nullable()),
  address: optStr,
  nextOfKin: optStr,
  nextOfKinPhone: optStr,
  weightKg: optNum,
  confirmPossibleDuplicate: bool.optional(),
});
export type PatientInput = z.input<typeof patientSchema>;

export async function findPossibleDuplicates(fullName: string, dob: string, excludeId?: string) {
  return q(
    `SELECT id, mrn, full_name, dob::text AS dob FROM patients
      WHERE dob = $2 AND (lower(full_name) = lower($1) OR similarity_name(full_name, $1)) AND ($3::uuid IS NULL OR id <> $3) LIMIT 5`,
    [fullName.trim(), dob, excludeId ?? null]);
}

export async function createPatient(actor: Actor, input: PatientInput) {
  assertCan(actor, "patients.manage");
  const d = parse(patientSchema, input);
  if (new Date(d.dob) > new Date()) throw new DomainError("Date of birth cannot be in the future.");
  return tx(async (db) => {
    const existing = await one(`SELECT id, full_name FROM patients WHERE hospital_id = $1 AND mrn = $2`, [actor.hospitalId, d.mrn], db);
    if (existing) throw new DomainError(`MRN ${d.mrn} is already registered to ${existing.full_name}. Open the existing record instead of creating a duplicate.`, "DUPLICATE");
    if (!d.confirmPossibleDuplicate) {
      const dups = await q(`SELECT mrn, full_name FROM patients WHERE dob = $1 AND similarity_name(full_name, $2) LIMIT 3`, [d.dob, d.fullName], db);
      if (dups.length) throw new DomainError(`Possible duplicate: ${dups.map((x) => `${x.full_name} (${x.mrn})`).join(", ")} has the same date of birth and a similar name. Tick "Confirm this is a different patient" to continue.`, "POSSIBLE_DUPLICATE");
    }
    const row = await one(
      `INSERT INTO patients (hospital_id, mrn, full_name, dob, sex, phone, email, address, next_of_kin, next_of_kin_phone, weight_kg, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [actor.hospitalId, d.mrn, d.fullName, d.dob, d.sex, d.phone, d.email, d.address, d.nextOfKin, d.nextOfKinPhone, d.weightKg, actor.userId], db);
    await audit(db, actor, "patient.create", "patient", row!.id, { mrn: d.mrn });
    return row!;
  });
}

export async function updatePatient(actor: Actor, id: string, input: PatientInput) {
  assertCan(actor, "patients.manage");
  const d = parse(patientSchema, input);
  return tx(async (db) => {
    const p = await one(`SELECT * FROM patients WHERE id = $1 FOR UPDATE`, [id], db);
    if (!p) throw new NotFoundError("Patient");
    const clash = await one(`SELECT full_name FROM patients WHERE hospital_id=$1 AND mrn=$2 AND id<>$3`, [actor.hospitalId, d.mrn, id], db);
    if (clash) throw new DomainError(`MRN ${d.mrn} is already used by ${clash.full_name}.`);
    await q(`UPDATE patients SET mrn=$2, full_name=$3, dob=$4, sex=$5, phone=$6, email=$7, address=$8, next_of_kin=$9, next_of_kin_phone=$10, weight_kg=$11, updated_at=now() WHERE id=$1`,
      [id, d.mrn, d.fullName, d.dob, d.sex, d.phone, d.email, d.address, d.nextOfKin, d.nextOfKinPhone, d.weightKg], db);
    const changed = Object.entries({ mrn: [p.mrn, d.mrn], full_name: [p.full_name, d.fullName], dob: [p.dob, d.dob], sex: [p.sex, d.sex] })
      .filter(([, [a, b]]) => String(a) !== String(b)).map(([k]) => k);
    await audit(db, actor, "patient.update", "patient", id, { changed });
  });
}

export async function searchPatients(term: string, limit = 25) {
  const t = `%${term.trim()}%`;
  return q(
    `SELECT p.id, p.mrn, p.full_name, p.dob::text AS dob, p.sex, p.phone, p.is_demo,
            (SELECT count(*) FROM appointments a WHERE a.patient_id = p.id) AS appt_count,
            (SELECT count(*) FROM patient_implants i WHERE i.patient_id = p.id AND i.is_present) AS implant_count
       FROM patients p
      WHERE $1 = '%%' OR p.full_name ILIKE $1 OR p.mrn ILIKE $1 OR p.phone ILIKE $1
      ORDER BY p.updated_at DESC LIMIT $2`, [t, limit]);
}
