import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { setup, teardown, actor, testScanner, examType, newPatient, nextOperatingDay, nowSlot, q, one } from "./helpers";
import * as wf from "../src/server/services/workflow";
import { createImplant, recordVerification } from "../src/server/services/implants";
import { DomainError, ForbiddenError } from "../src/server/errors";
import { SCREENING_QUESTIONS } from "../src/lib/constants";

before(setup);
after(teardown);

const allNo = (): Record<string, { answer: any; details: string | null }> => Object.fromEntries(SCREENING_QUESTIONS.map((qq) => [qq.key, { answer: "NO", details: null }]));
const base = (patientId: string, examTypeId: string, scannerId: string, date: string, time: string, extra: Record<string, unknown> = {}) => ({
  patientId, examTypeId, scannerId, date, time, clinicalIndication: "Test indication", referringDoctor: "Dr Test", referringDepartment: "Neurology",
  priority: "ROUTINE", patientType: "OUTPATIENT", contrast: false, ...extra,
});
async function rejects(p: Promise<unknown>, re: RegExp, cls: any = DomainError) {
  await assert.rejects(p, (e: any) => { assert.ok(e instanceof cls, `expected ${cls.name}, got ${e?.constructor?.name}: ${e?.message}`); assert.match(e.message, re); return true; });
}

describe("Stage 1 – booking rules", () => {
  test("creates appointment, worklist entry and BOOKED event; prevents double booking", async () => {
    const rec = await actor("receptionist1");
    const sc = await testScanner("TEST booking");
    const ex = await examType("BRAIN");
    const p1 = await newPatient(), p2 = await newPatient();
    const day = nextOperatingDay();
    const a = await wf.createAppointment(rec, base(p1.id, ex.id, sc.id, day, "09:00") as any);
    assert.equal(a.status, "BOOKED");
    assert.match(a.accession_no, /^MR\d{8}$/);
    const ev = await q(`SELECT event FROM workflow_events WHERE appointment_id=$1`, [a.id]);
    assert.deepEqual(ev.map((e) => e.event), ["BOOKED"]);
    await rejects(wf.createAppointment(rec, base(p2.id, ex.id, sc.id, day, "09:15") as any), /Scheduling conflict/);
    await rejects(wf.createAppointment(rec, base(p1.id, ex.id, (await testScanner("TEST booking 2")).id, day, "09:10") as any), /overlapping appointment/);
    const b = await wf.createAppointment(rec, base(p2.id, ex.id, sc.id, day, "09:30") as any); // back-to-back is allowed
    assert.ok(b.id);
  });
  test("24/7 unit: routine bookings at any hour; restricted hours still enforced if configured", async () => {
    const rec = await actor("receptionist1");
    const sc = await testScanner("TEST hours");
    const ex = await examType("BRAIN");
    const day = nextOperatingDay();
    const night = await wf.createAppointment(rec, base((await newPatient()).id, ex.id, sc.id, day, "02:00") as any);
    assert.equal(night.priority, "ROUTINE", "routine booking at 02:00 accepted in a 24/7 unit");
    await wf.createAppointment(rec, base((await newPatient()).id, ex.id, sc.id, day, "23:45") as any); // crosses midnight
    const saved = (await one(`SELECT value FROM settings WHERE key='operatingHours'`)).value;
    try {
      const restricted = Object.fromEntries(Object.keys(saved).map((d) => [d, { open: "08:00", close: "17:00" }]));
      await q(`UPDATE settings SET value=$1 WHERE key='operatingHours'`, [JSON.stringify(restricted)]);
      await rejects(wf.createAppointment(rec, base((await newPatient()).id, ex.id, sc.id, day, "21:00") as any), /operating hours/);
      const e = await wf.createAppointment(rec, base((await newPatient()).id, ex.id, sc.id, day, "21:00", { priority: "EMERGENCY" }) as any);
      assert.equal(e.priority, "EMERGENCY");
    } finally {
      await q(`UPDATE settings SET value=$1 WHERE key='operatingHours'`, [JSON.stringify(saved)]);
    }
  });
  test("reschedule records event and count; cancel requires reason; no-show only after slot time", async () => {
    const rec = await actor("receptionist1");
    const sc = await testScanner("TEST resched");
    const ex = await examType("KNEE");
    const day = nextOperatingDay();
    const a = await wf.createAppointment(rec, base((await newPatient()).id, ex.id, sc.id, day, "10:00") as any);
    await wf.rescheduleAppointment(rec, a.id, { date: day, time: "11:00", reason: "Patient request" });
    const r = await one(`SELECT reschedule_count FROM appointments WHERE id=$1`, [a.id]);
    assert.equal(r.reschedule_count, 1);
    await rejects(wf.markNoShow(rec, a.id), /after the appointment time/);
    await rejects(wf.cancelAppointment(rec, a.id, ""), /reason is required/);
    await wf.cancelAppointment(rec, a.id, "Patient request");
    assert.equal((await one(`SELECT status FROM appointments WHERE id=$1`, [a.id])).status, "CANCELLED");
    // the slot is free again after cancellation
    await wf.createAppointment(rec, base((await newPatient()).id, ex.id, sc.id, day, "11:00") as any);
  });
  test("management and nurses cannot book", async () => {
    const sc = await testScanner("TEST perms");
    const ex = await examType("BRAIN");
    await rejects(wf.createAppointment(await actor("manager"), base((await newPatient()).id, ex.id, sc.id, nextOperatingDay(), "12:00") as any), /Permission required/, ForbiddenError);
    await rejects(wf.createAppointment(await actor("nurse1"), base((await newPatient()).id, ex.id, sc.id, nextOperatingDay(), "12:00") as any), /Permission required/, ForbiddenError);
  });
});

async function arrivedToday(scannerName: string, patientOverrides?: { sex: string; dob: string }, examCode = "BRAIN", contrast = false) {
  const rec = await actor("receptionist1");
  const sc = await testScanner(scannerName);
  const ex = await examType(examCode);
  const p = await newPatient(patientOverrides?.sex, patientOverrides?.dob);
  const s = nowSlot(-5);
  const a = await wf.createAppointment(rec, base(p.id, ex.id, sc.id, s.date, s.time, { priority: "EMERGENCY", contrast }) as any);
  await rejects(wf.recordArrival(rec, a.id, { identityVerified: "", identityMethod: "Name + DOB" }), /identity must be verified/);
  await wf.recordArrival(rec, a.id, { identityVerified: "on", identityMethod: "Name + DOB + MRN" });
  return { a, p, sc, rec };
}

describe("Stages 2–7 – full happy path", () => {
  test("arrival → screening → preparation → scan → PACS → completion", async () => {
    const { a, sc } = await arrivedToday("TEST happy");
    const rad = await actor("radiographer1"), nurse = await actor("nurse1"), sup = await actor("supervisor");
    assert.equal((await one(`SELECT status FROM appointments WHERE id=$1`, [a.id])).status, "ARRIVED");
    await rejects(wf.saveScreening(await actor("receptionist1"), a.id, { answers: allNo(), pregnancyStatus: "NOT_APPLICABLE" } as any), /screening.record/, ForbiddenError);
    await wf.saveScreening(rad, a.id, { answers: allNo(), pregnancyStatus: "NOT_APPLICABLE" } as any);
    let row = await one(`SELECT status, screening_status FROM appointments WHERE id=$1`, [a.id]);
    assert.deepEqual([row.status, row.screening_status], ["SCREENING", "PENDING"]);
    await wf.decideScreening(rad, a.id, { decision: "CLEAR", notes: "" }); // routine clearance by radiographer
    row = await one(`SELECT status, screening_status FROM appointments WHERE id=$1`, [a.id]);
    assert.deepEqual([row.status, row.screening_status], ["PREPARATION", "CLEAR"]);
    await rejects(wf.startScan(rad, a.id, {}), /preparation is not complete/);
    await rejects(wf.savePreparation(nurse, a.id, { complete: "1", metalRemoved: "on" } as any), /Preparation incomplete.*MRI-safe clothing/);
    await wf.savePreparation(nurse, a.id, { complete: "1", metalRemoved: "on", gownChanged: "on", checklist: { procedure_explained: true, hearing_protection: true } } as any);
    assert.equal((await one(`SELECT status FROM appointments WHERE id=$1`, [a.id])).status, "CLEARED");
    await rejects(wf.startScan(nurse, a.id, {}), /scanning.perform/, ForbiddenError);
    await wf.startScan(rad, a.id, {});
    assert.equal((await one(`SELECT status FROM scanners WHERE id=$1`, [sc.id])).status, "IN_USE");
    await rejects(wf.endScan(rad, a.id, { completionStatus: "INCOMPLETE" } as any), /reason is required/);
    await wf.endScan(rad, a.id, { completionStatus: "COMPLETE", repeatSequences: "1" } as any);
    row = await one(`SELECT a.status, s.status AS sc FROM appointments a JOIN scanners s ON s.id=a.scanner_id WHERE a.id=$1`, [a.id]);
    assert.deepEqual([row.status, row.sc], ["SCANNED", "AVAILABLE"]);
    const up = await one(`SELECT * FROM pacs_uploads WHERE appointment_id=$1`, [a.id]);
    assert.equal(up.status, "PENDING_UPLOAD");
    await rejects(wf.confirmPacsUpload(rad, up.id), /Only a successful upload/);
    await rejects(wf.updatePacsStatus(rad, up.id, { status: "UPLOAD_FAILED" } as any), /failure reason/);
    await wf.updatePacsStatus(rad, up.id, { status: "UPLOAD_FAILED", failureReason: "Network timeout" } as any);
    await wf.updatePacsStatus(rad, up.id, { status: "UPLOADING", correctiveAction: "Re-sent" } as any);
    await wf.updatePacsStatus(rad, up.id, { status: "SUCCESSFULLY_UPLOADED", imageCount: "500" } as any);
    assert.equal((await one(`SELECT status FROM appointments WHERE id=$1`, [a.id])).status, "SCANNED", "success alone must not complete the exam");
    const r = await wf.confirmPacsUpload(rad, up.id, "Visible in PACS");
    assert.equal(r.completed, true);
    row = await one(`SELECT status, completed_at FROM appointments WHERE id=$1`, [a.id]);
    assert.equal(row.status, "COMPLETED"); assert.ok(row.completed_at);
    const u2 = await one(`SELECT attempts, verification_status FROM pacs_uploads WHERE id=$1`, [up.id]);
    assert.equal(u2.attempts, 2); assert.equal(u2.verification_status, "VERIFIED");
    // Re-opening a confirmed upload returns the exam to an exception state.
    await wf.updatePacsStatus(sup, up.id, { status: "REQUIRES_INVESTIGATION", note: "Series missing" } as any);
    assert.equal((await one(`SELECT status FROM appointments WHERE id=$1`, [a.id])).status, "SCANNED");
    const events = (await q(`SELECT event FROM workflow_events WHERE appointment_id=$1 ORDER BY at, id`, [a.id])).map((e) => e.event);
    for (const e of ["BOOKED", "ARRIVED", "SCREENING_RECORDED", "SAFETY_CLEARED", "PREPARATION_COMPLETE", "CLEARED_FOR_SCANNING", "SCAN_STARTED", "SCAN_COMPLETED", "PACS_UPLOAD_FAILED", "EXAMINATION_COMPLETED", "COMPLETION_REVOKED"]) assert.ok(events.includes(e), `missing event ${e}`);
  });
  test("invalid PACS transitions are rejected and incomplete scans never complete", async () => {
    const { a } = await arrivedToday("TEST incomplete");
    const rad = await actor("radiographer1"), nurse = await actor("nurse1");
    await wf.saveScreening(rad, a.id, { answers: allNo(), pregnancyStatus: "NOT_APPLICABLE" } as any);
    await wf.decideScreening(rad, a.id, { decision: "CLEAR", notes: "" });
    await wf.savePreparation(nurse, a.id, { complete: "1", metalRemoved: "on", gownChanged: "on", checklist: { procedure_explained: true, hearing_protection: true } } as any);
    await wf.startScan(rad, a.id, {});
    await wf.endScan(rad, a.id, { completionStatus: "INCOMPLETE", incompleteReason: "Claustrophobia" } as any);
    const up = await one(`SELECT * FROM pacs_uploads WHERE appointment_id=$1`, [a.id]);
    await rejects(wf.updatePacsStatus(rad, up.id, { status: "PENDING_UPLOAD" } as any), /unchanged/);
    await wf.updatePacsStatus(rad, up.id, { status: "SUCCESSFULLY_UPLOADED" } as any);
    const r = await wf.confirmPacsUpload(rad, up.id);
    assert.equal(r.completed, false);
    assert.equal((await one(`SELECT status FROM appointments WHERE id=$1`, [a.id])).status, "INCOMPLETE");
  });
});

describe("MRI safety blocks", () => {
  test("positive answers need MR safety personnel; implants block until assessed; previous assessments are not reused", async () => {
    const { a, p } = await arrivedToday("TEST safety");
    const rad = await actor("radiographer1"), mrso = await actor("mrso");
    const answers = allNo();
    answers.pacemaker = { answer: "YES" as any, details: null };
    await rejects(wf.saveScreening(rad, a.id, { answers, pregnancyStatus: "NOT_APPLICABLE" } as any), /Details are required/);
    answers.pacemaker.details = "Pacemaker 2019";
    await wf.saveScreening(rad, a.id, { answers, pregnancyStatus: "NOT_APPLICABLE" } as any);
    let ev = await wf.evaluateClearance(undefined, a.id);
    assert.equal(ev.routineEligible, false);
    assert.ok(ev.blockers.some((b) => /no implant record exists/.test(b)));
    await rejects(wf.decideScreening(rad, a.id, { decision: "CLEAR", notes: "" }), /Cannot clear/);
    await rejects(wf.startScan(rad, a.id, {}), /not CLEAR/);
    const cat = await one(`SELECT id FROM implant_categories WHERE name='Pacemaker'`);
    await rejects(createImplant(rad, { patientId: p.id, categoryId: cat.id, deviceName: "PPM", materials: ["UNKNOWN", "TITANIUM"], safetyClass: "UNKNOWN", conditions: {} } as any), /cannot be combined/);
    await rejects(createImplant(rad, { patientId: p.id, categoryId: cat.id, deviceName: "PPM", materials: ["TITANIUM"], safetyClass: "MR_CONDITIONAL", conditions: {} } as any), /manufacturer-approved conditions/);
    const imp = await createImplant(rad, { patientId: p.id, categoryId: cat.id, deviceName: "Permanent pacemaker", materials: ["UNKNOWN"], safetyClass: "UNKNOWN", conditions: {} } as any);
    const asmt = await one(`SELECT * FROM implant_assessments WHERE implant_id=$1 AND appointment_id=$2`, [imp.id, a.id]);
    assert.equal(asmt.decision, "PENDING", "an implant registered during an active exam needs an exam-specific assessment");
    ev = await wf.evaluateClearance(undefined, a.id);
    assert.ok(ev.blockers.some((b) => /assessment pending/.test(b)));
    await rejects(wf.assessImplant(rad, asmt.id, { decision: "PROCEED" } as any), /implants.assess/, ForbiddenError);
    await rejects(wf.assessImplant(mrso, asmt.id, { decision: "PROCEED", notes: "ok" } as any), /risk–benefit justification/);
    await wf.assessImplant(mrso, asmt.id, { decision: "DO_NOT_SCAN", notes: "Unknown pacemaker – cardiology to identify device" } as any);
    await rejects(wf.decideScreening(mrso, a.id, { decision: "CLEAR", notes: "Trying to clear" }), /DO NOT SCAN/);
    await wf.decideScreening(rad, a.id, { decision: "NOT_CLEARED", notes: "Unidentified pacemaker" });
    await rejects(wf.startScan(rad, a.id, {}), /not CLEAR/);
    // MR Unsafe device can never "proceed"
    await q(`UPDATE patient_implants SET safety_class='MR_UNSAFE' WHERE id=$1`, [imp.id]);
    await rejects(wf.assessImplant(mrso, asmt.id, { decision: "PROCEED", notes: "x".repeat(40) } as any), /MR Unsafe/);
  });
  test("conditional device: comparison required, mismatch blocks, authorised clearance then works", async () => {
    const { a, p } = await arrivedToday("TEST conditional");
    const rad = await actor("radiographer1"), mrso = await actor("mrso"), nurse = await actor("nurse1");
    const cat = await one(`SELECT id FROM implant_categories WHERE name='Hip prosthesis'`);
    const imp = await createImplant(rad, { patientId: p.id, categoryId: cat.id, deviceName: "THR", manufacturer: "X", modelName: "Y", materials: ["TITANIUM_ALLOY"], safetyClass: "MR_CONDITIONAL", conditions: { field_strength: "1.5 T and 3 T" } } as any);
    await rejects(recordVerification(mrso, imp.id, { status: "VERIFIED", checklist: { identity_confirmed: true } } as any), /Cannot mark VERIFIED/);
    await recordVerification(mrso, imp.id, { status: "VERIFIED", checklist: { identity_confirmed: true, manufacturer_docs_reviewed: true, model_serial_confirmed: true, safety_docs_reviewed: true, restrictions_checked: true }, docSource: "Implant card", docTitle: "IFU", docReference: "REF1" } as any);
    const answers = allNo(); answers.ortho_implant = { answer: "YES" as any, details: "Right THR" };
    await wf.saveScreening(rad, a.id, { answers, pregnancyStatus: "NOT_APPLICABLE" } as any);
    const asmt = await one(`SELECT id FROM implant_assessments WHERE implant_id=$1 AND appointment_id=$2`, [imp.id, a.id]);
    await rejects(wf.assessImplant(mrso, asmt.id, { decision: "PROCEED" } as any), /Proceed with conditions/);
    await rejects(wf.assessImplant(mrso, asmt.id, { decision: "PROCEED_WITH_CONDITIONS", comparison: { field_strength: "MET" } } as any), /Compare every condition/);
    const allMet = { field_strength: "MET", spatial_gradient: "MET", sar_b1: "MET", slew_rate: "NOT_APPLICABLE", region_positioning: "MET", waiting_period: "MET", device_mode: "NOT_APPLICABLE", monitoring: "NOT_APPLICABLE" };
    await rejects(wf.assessImplant(mrso, asmt.id, { decision: "PROCEED_WITH_CONDITIONS", comparison: { ...allMet, sar_b1: "NOT_MET" }, conditionsApplied: "NOM" } as any), /mismatch/);
    await wf.assessImplant(mrso, asmt.id, { decision: "PROCEED_WITH_CONDITIONS", comparison: allMet, conditionsApplied: "Normal operating mode" } as any);
    await rejects(wf.decideScreening(rad, a.id, { decision: "CLEAR", notes: "" }), /authorised MR safety personnel/, ForbiddenError);
    await rejects(wf.decideScreening(mrso, a.id, { decision: "CLEAR", notes: "" }), /rationale/);
    await wf.decideScreening(mrso, a.id, { decision: "CLEAR", notes: "Conditions met for 1.5T; NOM" });
    // Changing answers after clearance revokes it
    await wf.saveScreening(rad, a.id, { answers: { ...answers, claustrophobia: { answer: "YES", details: "mild" } }, pregnancyStatus: "NOT_APPLICABLE" } as any);
    assert.equal((await one(`SELECT screening_status FROM appointments WHERE id=$1`, [a.id])).screening_status, "PENDING");
    await wf.decideScreening(mrso, a.id, { decision: "CLEAR", notes: "Re-reviewed; mild claustrophobia only" });
    await wf.savePreparation(nurse, a.id, { complete: "1", metalRemoved: "on", gownChanged: "on", checklist: { procedure_explained: true, hearing_protection: true } } as any);
    await wf.startScan(rad, a.id, {});
    assert.equal((await one(`SELECT status FROM appointments WHERE id=$1`, [a.id])).status, "SCANNING");
    // A subsequent examination does not inherit this assessment.
    await wf.endScan(rad, a.id, { completionStatus: "COMPLETE" } as any);
    const rec = await actor("receptionist1");
    const s2 = await wf.createAppointment(rec, base(p.id, (await examType("KNEE")).id, (await testScanner("TEST conditional 2")).id, nextOperatingDay(), "08:00") as any);
    const n = await one(`SELECT count(*)::int AS n FROM implant_assessments WHERE appointment_id=$1`, [s2.id]);
    assert.equal(n.n, 0, "no assessment is carried over to a new examination");
  });
  test("pregnancy status is required for women of child-bearing age", async () => {
    const { a } = await arrivedToday("TEST pregnancy", { sex: "FEMALE", dob: "1995-01-01" });
    const rad = await actor("radiographer1");
    await wf.saveScreening(rad, a.id, { answers: allNo(), pregnancyStatus: "" } as any);
    const ev = await wf.evaluateClearance(undefined, a.id);
    assert.ok(ev.blockers.some((b) => /Pregnancy status/.test(b)));
    await wf.saveScreening(rad, a.id, { answers: allNo(), pregnancyStatus: "POSSIBLY_PREGNANT" } as any);
    await rejects(wf.decideScreening(rad, a.id, { decision: "CLEAR", notes: "" }), /authorised MR safety personnel/, ForbiddenError);
  });
  test("contrast exams need eGFR and cannula before preparation is complete", async () => {
    const { a } = await arrivedToday("TEST contrast prep", undefined, "BRAINC", true);
    const rad = await actor("radiographer1"), nurse = await actor("nurse1");
    await wf.saveScreening(rad, a.id, { answers: allNo(), pregnancyStatus: "NOT_APPLICABLE" } as any);
    await wf.decideScreening(rad, a.id, { decision: "CLEAR", notes: "" });
    await rejects(wf.savePreparation(nurse, a.id, { complete: "1", metalRemoved: "on", gownChanged: "on", checklist: { allergy_history: true, weight_confirmed: true } } as any), /eGFR.*IV cannulation/);
  });
});

describe("Automatic appointment audit trail", () => {
  test("every entry and change is saved with the user, time and field-level differences", async () => {
    const rec = await actor("receptionist1"), rec2 = await actor("receptionist2");
    const sc = await testScanner("TEST audit");
    const ex = await examType("BRAIN");
    const day = nextOperatingDay();
    const a = await wf.createAppointment(rec, base((await newPatient()).id, ex.id, sc.id, day, "10:00") as any);
    let rows = await q(`SELECT * FROM appointment_audit WHERE appointment_id=$1 ORDER BY id`, [a.id]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].operation, "CREATED");
    assert.equal(rows[0].changed_by, rec.userId);
    assert.equal(rows[0].changed_by_name, rec.fullName);
    assert.equal(rows[0].changed_by_role, "Receptionist");
    assert.equal(rows[0].snapshot.accession_no, a.accession_no);
    await wf.rescheduleAppointment(rec2, a.id, { date: day, time: "12:00", reason: "Patient request" });
    await wf.recordReminder(rec2, a.id, "Confirmed by phone");
    await wf.cancelAppointment(rec, a.id, "Patient request");
    rows = await q(`SELECT * FROM appointment_audit WHERE appointment_id=$1 ORDER BY id`, [a.id]);
    assert.equal(rows.length, 4);
    const [, resched, reminder, cancel] = rows;
    assert.equal(resched.changed_by, rec2.userId);
    assert.ok(resched.changed_fields.scheduled_start, "time change recorded");
    assert.equal(resched.changed_fields.reschedule_count.from, 0);
    assert.equal(resched.changed_fields.reschedule_count.to, 1);
    assert.ok(!("updated_at" in resched.changed_fields), "noise fields excluded");
    assert.equal(reminder.changed_fields.reminder_note.to, "Confirmed by phone");
    assert.deepEqual(cancel.changed_fields.status, { from: "BOOKED", to: "CANCELLED" });
    assert.equal(cancel.changed_fields.cancel_reason.to, "Patient request");
    assert.equal(cancel.changed_by, rec.userId);
  });
  test("changes outside the application are still captured and flagged as unattributed; trail is append-only", async () => {
    const rec = await actor("receptionist1");
    const a = await wf.createAppointment(rec, base((await newPatient()).id, (await examType("KNEE")).id, (await testScanner("TEST audit 2")).id, nextOperatingDay(), "14:00") as any);
    await q(`UPDATE appointments SET notes='edited directly in SQL' WHERE id=$1`, [a.id]);
    const r = await one(`SELECT * FROM appointment_audit WHERE appointment_id=$1 AND operation='UPDATED'`, [a.id]);
    assert.equal(r.changed_by, null);
    assert.match(r.source, /Direct database change/);
    assert.equal(r.changed_fields.notes.to, "edited directly in SQL");
    await q(`UPDATE appointments SET updated_at=now() WHERE id=$1`, [a.id]);
    assert.equal((await one(`SELECT count(*)::int AS n FROM appointment_audit WHERE appointment_id=$1`, [a.id])).n, 2, "no-op updates are not logged");
    await assert.rejects(q(`UPDATE appointment_audit SET changed_by_name='x' WHERE appointment_id=$1`, [a.id]), /append-only/);
    await assert.rejects(q(`DELETE FROM appointment_audit WHERE appointment_id=$1`, [a.id]), /append-only/);
  });
});
