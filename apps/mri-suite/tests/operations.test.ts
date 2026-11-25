import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { setup, teardown, actor, testScanner, examType, newPatient, nowSlot, nextOperatingDay, q, one, zonedToUtc } from "./helpers";
import * as wf from "../src/server/services/workflow";
import * as ops from "../src/server/services/operations";
import { createPatient } from "../src/server/services/patients";
import { saveUser, validatePassword, setRolePermissions, saveIntegration } from "../src/server/services/admin";
import { createProtocol, protocolAction } from "../src/server/services/protocols";
import { storeDocument } from "../src/server/services/documents";
import { pacsKpis, utilisation, examVolume, qualitySafety } from "../src/server/analytics";
import { computeAlerts } from "../src/server/alerts";
import { DomainError, ForbiddenError } from "../src/server/errors";
import { SCREENING_QUESTIONS } from "../src/lib/constants";
import { localDate, addDays } from "../src/lib/time";

before(setup);
after(teardown);
async function rejects(p: Promise<unknown>, re: RegExp, cls: any = DomainError) {
  await assert.rejects(p, (e: any) => { assert.ok(e instanceof cls, `expected ${cls.name}, got ${e?.constructor?.name}: ${e?.message}`); assert.match(e.message, re); return true; });
}
const allNo = () => Object.fromEntries(SCREENING_QUESTIONS.map((qq) => [qq.key, { answer: "NO", details: null }]));

async function clearedContrastExam(name: string) {
  const rec = await actor("receptionist1"), rad = await actor("radiographer1");
  const sc = await testScanner(name);
  const s = nowSlot(-5);
  const a = await wf.createAppointment(rec, { patientId: (await newPatient()).id, examTypeId: (await examType("BRAINC")).id, scannerId: sc.id, date: s.date, time: s.time, clinicalIndication: "x", referringDoctor: "d", referringDepartment: "n", priority: "EMERGENCY", contrast: "on" } as any);
  await wf.recordArrival(rec, a.id, { identityVerified: "on", identityMethod: "Name + DOB" });
  await wf.saveScreening(rad, a.id, { answers: allNo(), pregnancyStatus: "NOT_APPLICABLE" } as any);
  await wf.decideScreening(rad, a.id, { decision: "CLEAR", notes: "" });
  return { a, sc };
}

describe("Contrast media", () => {
  test("administration decrements stock, logs movement, blocks expired/insufficient stock, raises incidents", async () => {
    const nurse = await actor("nurse1");
    const { a } = await clearedContrastExam("TEST contrast");
    const agent = await one(`SELECT id FROM contrast_agents ORDER BY name LIMIT 1`);
    await ops.receiveContrast(nurse, { agentId: agent.id, batchNo: "T-OK", expiryDate: addDays(localDate(), 300), quantity: "100" });
    await rejects(ops.receiveContrast(nurse, { agentId: agent.id, batchNo: "T-OK", expiryDate: addDays(localDate(), 300), quantity: "5" }), /already exists/);
    await rejects(ops.receiveContrast(nurse, { agentId: agent.id, batchNo: "T-OLD", expiryDate: addDays(localDate(), -1), quantity: "5" }), /expired/);
    const b = await one(`SELECT * FROM contrast_batches WHERE batch_no='T-OK'`);
    await rejects(ops.administerContrast(nurse, { appointmentId: a.id, batchId: b.id, doseMl: "500", route: "IV_INJECTOR" } as any), /Dose|Insufficient/);
    await ops.administerContrast(nurse, { appointmentId: a.id, batchId: b.id, doseMl: "15", route: "IV_INJECTOR" } as any);
    assert.equal((await one(`SELECT current_stock FROM contrast_batches WHERE id=$1`, [b.id])).current_stock, 85);
    assert.equal((await one(`SELECT sum(quantity) AS s FROM contrast_stock_movements WHERE batch_id=$1`, [b.id])).s, 85);
    await rejects(ops.administerContrast(nurse, { appointmentId: a.id, batchId: b.id, doseMl: "5", route: "IV_HAND", adverseReaction: "on" } as any), /severity and details/);
    const r = await ops.administerContrast(nurse, { appointmentId: a.id, batchId: b.id, doseMl: "5", route: "IV_HAND", adverseReaction: "on", reactionSeverity: "MILD", reactionDetails: "Urticaria" } as any);
    const inc = await one(`SELECT category, appointment_id FROM incidents WHERE id=$1`, [r.incidentId]);
    assert.equal(inc.category, "CONTRAST_REACTION"); assert.equal(inc.appointment_id, a.id);
    // Expired batch is rejected at administration
    await q(`UPDATE contrast_batches SET expiry_date = current_date - 1 WHERE id=$1`, [b.id]);
    await rejects(ops.administerContrast(nurse, { appointmentId: a.id, batchId: b.id, doseMl: "1", route: "IV_HAND" } as any), /expired/);
    await rejects(ops.adjustContrast(nurse, { batchId: b.id, type: "ADJUSTMENT", quantity: "-1000", reason: "count" }), /negative/);
  });
  test("contrast cannot be given before safety clearance", async () => {
    const rec = await actor("receptionist1"), nurse = await actor("nurse1");
    const s = nowSlot(-3);
    const a = await wf.createAppointment(rec, { patientId: (await newPatient()).id, examTypeId: (await examType("BRAINC")).id, scannerId: (await testScanner("TEST contrast 2")).id, date: s.date, time: s.time, clinicalIndication: "x", referringDoctor: "d", referringDepartment: "n", priority: "EMERGENCY" } as any);
    await wf.recordArrival(rec, a.id, { identityVerified: "on", identityMethod: "x" });
    const b = await one(`SELECT id FROM contrast_batches WHERE current_stock > 10 AND expiry_date > current_date LIMIT 1`);
    await rejects(ops.administerContrast(nurse, { appointmentId: a.id, batchId: b.id, doseMl: "5", route: "IV_HAND" } as any), /before MRI safety clearance/);
  });
});

describe("Equipment QC & maintenance", () => {
  test("no invented thresholds: unconfigured parameters are NOT_EVALUATED; configured limits need a source", async () => {
    assert.equal(ops.evaluateQc(50, null, null, null), "NOT_EVALUATED");
    assert.equal(ops.evaluateQc(50, 10, 20, null), "NOT_EVALUATED");
    assert.equal(ops.evaluateQc(50, 10, 20, "Dept std v1"), "FAIL");
    assert.equal(ops.evaluateQc(15, 10, 20, "Dept std v1"), "PASS");
    const sup = await actor("supervisor"), rad = await actor("radiographer1");
    const sc = await testScanner("TEST qc");
    await rejects(ops.saveQcParameter(sup, null, { scannerId: sc.id, name: "SNR", frequency: "DAILY", lowerLimit: "100", isActive: "on" }), /documented source/);
    await rejects(ops.saveQcParameter(rad, null, { scannerId: sc.id, name: "SNR", frequency: "DAILY", isActive: "on" }), /qc.configure/, ForbiddenError);
    await ops.saveQcParameter(sup, null, { scannerId: sc.id, name: "SNR", frequency: "DAILY", lowerLimit: "100", thresholdSource: "TEST departmental standard", isActive: "on" });
    const p = await one(`SELECT id FROM qc_parameters WHERE scanner_id=$1`, [sc.id]);
    await rejects(ops.recordQcSession(rad, { scannerId: sc.id, frequency: "DAILY", values: { [p.id]: "80" } }), /corrective action/);
    const r = await ops.recordQcSession(rad, { scannerId: sc.id, frequency: "DAILY", values: { [p.id]: "80" }, correctiveAction: "Service called" });
    assert.equal(r.overall, "FAIL");
    const alerts = await computeAlerts();
    assert.ok(alerts.some((x) => x.category === "QC failure" && x.title.includes("TEST qc")));
    await ops.verifyQcSession(sup, r.id);
    await rejects(ops.verifyQcSession(sup, r.id), /already verified/);
  });
  test("breakdown takes scanner offline, blocks scanning; return to service restores it", async () => {
    const rad = await actor("radiographer1"), sup = await actor("supervisor");
    const { a, sc } = await clearedContrastExam("TEST breakdown");
    await wf.savePreparation(await actor("nurse1"), a.id, { complete: "1", metalRemoved: "on", gownChanged: "on", ivCannula: "on", cannulaGauge: "20G", cannulaSite: "L ACF", egfrValue: "90", egfrDate: localDate(), checklist: { allergy_history: true, weight_confirmed: true } } as any);
    const ev = await ops.logMaintenance(rad, { scannerId: sc.id, eventType: "BREAKDOWN", faultDescription: "Coil error" } as any);
    assert.equal((await one(`SELECT status FROM scanners WHERE id=$1`, [sc.id])).status, "UNAVAILABLE");
    await rejects(wf.startScan(rad, a.id, {}), /unavailable/);
    assert.ok((await computeAlerts()).some((x) => x.category === "Equipment downtime" && x.title.includes("TEST breakdown")));
    await rejects(ops.returnToService(rad, ev.id, "checks done"), /maintenance.rts/, ForbiddenError);
    await rejects(ops.updateMaintenance(rad, ev.id, { status: "CLOSED" }), /Return to service|return to service/i);
    await ops.returnToService(sup, ev.id, "Post-repair QC passed");
    assert.equal((await one(`SELECT status FROM scanners WHERE id=$1`, [sc.id])).status, "AVAILABLE");
    await wf.startScan(rad, a.id, {});
  });
  test("maintenance due generates an alert", async () => {
    const sup = await actor("supervisor");
    const sc = await testScanner("TEST pm");
    await ops.saveSchedule(sup, { scannerId: sc.id, title: "TEST PM", frequencyDays: "90", nextDueOn: addDays(localDate(), 3) });
    assert.ok((await computeAlerts()).some((x) => x.category === "Maintenance due" && x.title.includes("TEST PM")));
  });
});

describe("Staff, incidents, cleaning", () => {
  test("roster respects approved leave and rest after night shifts", async () => {
    const sup = await actor("supervisor");
    const st = await one(`INSERT INTO staff (hospital_id, staff_no, full_name, designation) SELECT id, 'TEST-ST-1', 'Test Radiographer', 'MRI Radiographer' FROM hospitals LIMIT 1 RETURNING id`);
    const d = addDays(localDate(), 40);
    await ops.requestLeave(sup, { staffId: st.id, leaveType: "ANNUAL", startDate: d, endDate: addDays(d, 2) });
    await rejects(ops.requestLeave(sup, { staffId: st.id, leaveType: "SICK", startDate: addDays(d, 1), endDate: addDays(d, 1) }), /overlaps/);
    await ops.assignDuty(sup, { staffId: st.id, dutyDate: d, shift: "MORNING" });
    const l = await one(`SELECT id FROM leave_records WHERE staff_id=$1`, [st.id]);
    await ops.decideLeave(sup, l.id, "APPROVED");
    assert.equal((await one(`SELECT count(*)::int AS n FROM duty_roster WHERE staff_id=$1`, [st.id])).n, 0, "approved leave removes clashing shifts");
    await rejects(ops.assignDuty(sup, { staffId: st.id, dutyDate: addDays(d, 1), shift: "AFTERNOON" }), /approved annual leave/);
    await ops.assignDuty(sup, { staffId: st.id, dutyDate: addDays(d, 10), shift: "NIGHT" });
    await rejects(ops.assignDuty(sup, { staffId: st.id, dutyDate: addDays(d, 11), shift: "MORNING" }), /rest/);
    await rejects(ops.assignDuty(sup, { staffId: st.id, dutyDate: addDays(d, 10), shift: "NIGHT" }), /already rostered/);
  });
  test("incident lifecycle and confidentiality", async () => {
    const rec = await actor("receptionist1"), sup = await actor("supervisor");
    const r = await ops.reportIncident(rec, { occurredAt: `${localDate()}T00:01`, category: "NEAR_MISS", severity: "NO_HARM", description: "Test near miss" });
    assert.match(r.ref_no, /^INC-\d{4}-\d{4}$/);
    await rejects(ops.updateIncident(rec, r.id, { status: "CLOSED", severity: "NO_HARM" }), /incidents.manage/, ForbiddenError);
    await rejects(ops.updateIncident(sup, r.id, { status: "CLOSED", severity: "NO_HARM" }), /Closing requires/);
    await ops.updateIncident(sup, r.id, { status: "CLOSED", severity: "NO_HARM", investigation: "x", correctiveAction: "y", closureNotes: "z" });
    assert.ok((await one(`SELECT closed_at FROM incidents WHERE id=$1`, [r.id])).closed_at);
    assert.equal(rec.permissions.has("incidents.view"), false);
  });
  test("cleaning compliance requires all items or an explanation", async () => {
    const nurse = await actor("nurse1");
    const area = await one(`SELECT * FROM cleaning_areas ORDER BY sort_order LIMIT 1`);
    await rejects(ops.recordCleaning(nurse, { areaId: area.id, items: [area.checklist[0]] }), /explain why/);
    const ok = await ops.recordCleaning(nurse, { areaId: area.id, items: area.checklist });
    assert.equal(ok.compliant, true);
    const partial = await ops.recordCleaning(nurse, { areaId: area.id, items: [], notes: "Out of wipes" });
    assert.equal(partial.compliant, false);
  });
});

describe("Security, data integrity & administration", () => {
  test("role permissions follow least privilege", async () => {
    const admin = await actor("admin"), rec = await actor("receptionist1"), mgr = await actor("manager"), rad = await actor("radiographer1");
    assert.equal(admin.permissions.has("patients.view"), false, "system administrator has no clinical access by default");
    assert.equal(rec.permissions.has("screening.record"), false);
    assert.equal(mgr.permissions.has("patients.view"), false);
    assert.equal(rad.permissions.has("safety.clear"), false);
    const roles = await q(`SELECT code FROM roles`);
    assert.ok(!roles.some((r) => /RADIOLOGIST/i.test(r.code)), "no radiologist role");
    const sysadminRole = await one(`SELECT id FROM roles WHERE code='SYSADMIN'`);
    await rejects(setRolePermissions(admin, sysadminRole.id, ["admin.settings"]), /lock-out/);
    await rejects(setRolePermissions(await actor("supervisor"), sysadminRole.id, []), /admin.roles/, ForbiddenError);
  });
  test("password policy, duplicate patients and audit immutability", async () => {
    assert.throws(() => validatePassword("short"), /policy/);
    assert.throws(() => validatePassword("alllowercase123"), /policy/);
    validatePassword("Str0ngPassword");
    const admin = await actor("admin");
    const role = await one(`SELECT id FROM roles WHERE code='NURSE'`);
    await rejects(saveUser(admin, null, { username: "x y", fullName: "X", roleId: role.id, isActive: "on", password: "Str0ngPassword" } as any), /letters, numbers/);
    await saveUser(admin, null, { username: "test.nurse", fullName: "Test Nurse", roleId: role.id, isActive: "on", password: "Str0ngPassword" } as any);
    assert.equal((await one(`SELECT must_change_password FROM users WHERE username='test.nurse'`)).must_change_password, true);
    const rec = await actor("receptionist1");
    const p = await createPatient(rec, { mrn: "TEST-DUP-1", fullName: "Kofi Annan Test", dob: "1970-01-01", sex: "MALE" } as any);
    await rejects(createPatient(rec, { mrn: "TEST-DUP-1", fullName: "Someone Else", dob: "1971-01-01", sex: "MALE" } as any), /already registered/);
    await rejects(createPatient(rec, { mrn: "TEST-DUP-2", fullName: "Test Kofi Annan", dob: "1970-01-01", sex: "MALE" } as any), /Possible duplicate/);
    await createPatient(rec, { mrn: "TEST-DUP-2", fullName: "Test Kofi Annan", dob: "1970-01-01", sex: "MALE", confirmPossibleDuplicate: "on" } as any);
    await rejects(createPatient(rec, { mrn: "TEST-3", fullName: "Future Baby", dob: addDays(localDate(), 5), sex: "MALE" } as any), /future/);
    assert.ok(p.id);
    await assert.rejects(q(`UPDATE audit_logs SET action='tampered' WHERE id = (SELECT max(id) FROM audit_logs)`), /append-only/);
    await assert.rejects(q(`DELETE FROM audit_logs`), /append-only/);
    const n = await one(`SELECT count(*)::int AS n FROM audit_logs WHERE action='patient.create' AND entity_id=$1`, [p.id]);
    assert.equal(n.n, 1);
  });
  test("database exclusion constraint prevents scanner double-booking even outside the service layer", async () => {
    const sc = await testScanner("TEST constraint");
    const ex = await examType("BRAIN");
    const p = await newPatient();
    const h = await one(`SELECT id FROM hospitals LIMIT 1`);
    const ins = (acc: string, start: string, end: string) => q(`INSERT INTO appointments (hospital_id, accession_no, patient_id, exam_type_id, body_region, clinical_indication, referring_doctor, referring_department, scheduled_start, scheduled_end, scanner_id)
      VALUES ($1,$2,$3,$4,'BRAIN','x','x','x',$5,$6,$7)`, [h.id, acc, p.id, ex.id, start, end, sc.id]);
    await ins("TEST-C1", "2030-01-01T09:00:00Z", "2030-01-01T09:30:00Z");
    await assert.rejects(ins("TEST-C2", "2030-01-01T09:15:00Z", "2030-01-01T09:45:00Z"), /appt_no_scanner_overlap/);
  });
  test("uploads are validated by content, not by declared type", async () => {
    const rad = await actor("radiographer1");
    const imp = await one(`SELECT id FROM patient_implants LIMIT 1`);
    const fake = new File([Buffer.from("not really a pdf")], "x.pdf", { type: "application/pdf" });
    await rejects(storeDocument(rad, "IMPLANT", imp.id, "OTHER", null, fake), /Only PDF, PNG or JPEG/);
    const exe = new File([Buffer.from("MZ...")], "x.exe", { type: "application/x-msdownload" });
    await rejects(storeDocument(rad, "IMPLANT", imp.id, "OTHER", null, exe), /Only PDF/);
    const pdf = new File([Buffer.from("%PDF-1.4\n%test\n")], "card.pdf", { type: "application/pdf" });
    const d = await storeDocument(rad, "IMPLANT", imp.id, "IMPLANT_CARD", "Card", pdf);
    assert.ok(d.id);
    await rejects(storeDocument(await actor("receptionist1"), "IMPLANT", imp.id, "OTHER", null, pdf), /One of these permissions/, ForbiddenError);
  });
  test("integrations cannot be marked connected by hand; protocols need parameters before approval", async () => {
    await rejects(saveIntegration(await actor("admin"), "PACS_DICOM", { status: "CONNECTED" }), /Invalid option/);
    const sup = await actor("supervisor");
    const p = await createProtocol(sup, { scannerModel: "GE SIGNA Creator 1.5T", category: "BRAIN", name: "TEST proto", kind: "DEPARTMENTAL", sequences: [{ name: "Ax T2" }] } as any);
    await rejects(protocolAction(sup, p.id, "APPROVE"), /missing core parameters/);
    const edu = await createProtocol(sup, { scannerModel: "x", category: "BRAIN", name: "TEST edu", kind: "EDUCATIONAL_REFERENCE", sequences: [{ name: "a", tr: "1", te: "1", slice_thickness: "1", fov: "1", matrix: "1" }] } as any);
    await rejects(protocolAction(sup, edu.id, "APPROVE"), /Educational references/);
  });
});

describe("Analytics match the underlying records", () => {
  const p = { from: addDays(localDate(), -60), to: addDays(localDate(), 1) };
  test("examination volume equals scan records in period", async () => {
    const v = await examVolume(p);
    const n = await one(`SELECT count(*)::int AS n FROM scan_records WHERE started_at >= $1 AND started_at < $2`, [zonedToUtc(p.from), zonedToUtc(p.to)]);
    assert.equal(v.totals.total, n.n);
    assert.equal(v.byRegion.reduce((a: number, r: any) => a + r.n, 0), n.n);
  });
  test("PACS success rate and average upload time", async () => {
    const k = await pacsKpis(p);
    const r = await one(`SELECT count(*)::int AS total, count(*) FILTER (WHERE pu.status='SUCCESSFULLY_UPLOADED')::int AS s,
        avg(extract(epoch FROM (pu.completed_at - sr.ended_at))/60) FILTER (WHERE pu.status='SUCCESSFULLY_UPLOADED') AS avg
        FROM pacs_uploads pu JOIN scan_records sr ON sr.id=pu.scan_record_id WHERE sr.started_at >= $1 AND sr.started_at < $2`, [zonedToUtc(p.from), zonedToUtc(p.to)]);
    assert.equal(k.total, r.total);
    assert.ok(Math.abs(k.successRate! - (r.s / r.total) * 100) < 1e-9);
    assert.ok(Math.abs(k.avg_minutes - r.avg) < 1e-6);
  });
  test("utilisation = scanning hours ÷ available hours × 100 with configured operating hours", async () => {
    const u = await utilisation(p);
    const s = u.scanners.find((x) => x.scanner.startsWith("MRI 1"))!;
    assert.ok(Math.abs(s.utilisationPct! - (s.scanningHours / s.availableHours) * 100) < 1e-9);
    // 24/7 unit: 24 available hours every day
    let days = 0;
    for (let d = p.from; d < p.to; d = addDays(d, 1)) days++;
    assert.equal(s.availableHours, days * 24);
  });
  test("screening compliance is 100% for system-recorded scans", async () => {
    const qs = await qualitySafety(p);
    assert.equal(qs.screening.compliant, qs.screening.scans);
  });
});
