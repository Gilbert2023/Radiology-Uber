// Seeds reference data (always) and clearly-labelled SYNTHETIC demonstration data (unless --reference-only).
// No real patient information is used anywhere. All demo patients have MRNs starting "DEMO-".
import "./loadenv";
import bcrypt from "bcryptjs";
import type { PoolClient } from "pg";
import { getPool } from "../src/lib/db";
import { PERMISSIONS, ROLES } from "../src/lib/rbac";
import { DEFAULT_SETTINGS } from "../src/server/settings";
import { zonedToUtc, addDays, localDate, weekday } from "../src/lib/time";
import { SCREENING_QUESTIONS, VERIFICATION_CHECKLIST } from "../src/lib/constants";

export const DEMO_PASSWORD = "Demo@MRI2026";

// Deterministic PRNG so demo data is reproducible.
let seedState = 20261122;
const rnd = () => ((seedState = (seedState * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];
const chance = (p: number) => rnd() < p;
const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const addMin = (d: Date, m: number) => new Date(d.getTime() + m * 60000);

const JSONB_COLS = new Set(["checklist", "conditions", "comparison", "answers", "details", "snapshot", "value"]);
async function ins(db: PoolClient, table: string, row: Record<string, unknown>, returning = "id") {
  const keys = Object.keys(row);
  const vals = keys.map((k) => { const v = row[k]; return JSONB_COLS.has(k) && v !== null && v !== undefined ? JSON.stringify(v) : v; });
  const r = await db.query(`INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(",")}) RETURNING ${returning}`, vals);
  return r.rows[0];
}

export async function seed({ referenceOnly = false, quiet = false, today = localDate() } = {}) {
  const pool = getPool();
  const db = await pool.connect();
  const log = (...a: unknown[]) => { if (!quiet) console.log(...a); };
  try {
    await db.query("BEGIN");
    // Attribute every seeded appointment change in the automatic audit trail.
    await db.query(`SELECT set_config('app.user_name', 'Synthetic demo data seed', true), set_config('app.source', 'Demo data seed script', true)`);
    const existing = await db.query(`SELECT count(*)::int AS n FROM hospitals`);
    if (existing.rows[0].n > 0) throw new Error("Database already seeded. Use `npm run db:reset` to rebuild from scratch.");

    // ---------------- Reference data ----------------
    const hospital = await ins(db, "hospitals", { code: "TBH", name: "The Bank Hospital", department: "Radiology Department – MRI Unit", country: "Ghana", timezone: "Africa/Accra", currency: "GHS", address: "Cantonments, Accra, Ghana" });
    for (const [code, p] of Object.entries(PERMISSIONS))
      await db.query(`INSERT INTO permissions (code, module, description, is_sensitive) VALUES ($1,$2,$3,$4) ON CONFLICT (code) DO NOTHING`, [code, p.module, p.description, !!(p as any).sensitive]);
    const roleIds: Record<string, string> = {};
    for (const [code, r] of Object.entries(ROLES)) {
      roleIds[code] = (await ins(db, "roles", { code, name: r.name, description: r.description })).id;
      for (const p of r.permissions) await db.query(`INSERT INTO role_permissions VALUES ($1,$2)`, [roleIds[code], p]);
    }
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) await db.query(`INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`, [k, JSON.stringify(v)]);

    const integrations = [
      ["PACS_DICOM", "PACS (DICOM C-STORE / C-FIND)", "Automatic confirmation of study arrival in PACS. Until connected, uploads are confirmed manually by staff.", "UNDER_DEVELOPMENT"],
      ["PACS_DICOMWEB", "PACS DICOMweb (QIDO-RS)", "Query PACS for study presence where the PACS supports DICOMweb.", "NOT_CONNECTED"],
      ["MWL", "DICOM Modality Worklist", "Send scheduled examinations to the scanner worklist.", "NOT_CONNECTED"],
      ["HIS", "Hospital Information System", "Patient demographics and orders exchange (HL7 v2 / FHIR).", "NOT_CONNECTED"],
      ["RIS", "Radiology Information System", "Order/accession synchronisation.", "NOT_CONNECTED"],
      ["SMS", "SMS appointment reminders", "Bulk SMS gateway for reminders. Reminders are currently recorded manually after phone calls.", "NOT_CONNECTED"],
      ["WHATSAPP", "WhatsApp Business", "Appointment messages via WhatsApp Business API.", "NOT_CONNECTED"],
      ["EMAIL", "Email (SMTP)", "Password reset and report distribution emails.", "NOT_CONNECTED"],
      ["PATIENT_PORTAL", "Patient portal", "Patient self-service appointment view.", "NOT_CONNECTED"],
      ["REFERRER_PORTAL", "Referring doctor portal", "Referral submission and appointment status.", "NOT_CONNECTED"],
    ];
    for (const [code, name, description, status] of integrations) await ins(db, "integrations", { code, name, description, status }, "code");

    const scanner = await ins(db, "scanners", { hospital_id: hospital.id, name: "MRI 1 – SIGNA Creator", manufacturer: "GE HealthCare", model: "SIGNA Creator", field_strength_t: 1.5,
      location: "Radiology Department, MRI Suite", service_provider: "GE HealthCare (service contract – details to be confirmed)", installation_notes: "Serial number and installation date to be entered by the department.", colour: "#2c3135" });

    // Preparation protocols (generic templates; status DRAFT until the department reviews and approves them).
    const prepDefs: Record<string, any> = {
      GENERAL: { name: "General MRI preparation", exam_category: "General (non-contrast)", fasting_hours: null, requires_egfr: false, iv_cannula: false, oral_contrast: false,
        instructions: "Confirm identity and examination. Remove all metallic objects, cards, hearing aids and removable devices. Change into MRI-safe gown. Explain procedure and provide hearing protection.",
        checklist: [{ key: "procedure_explained", label: "Procedure explained to patient" }, { key: "hearing_protection", label: "Hearing protection provided" }] },
      CONTRAST: { name: "Contrast-enhanced MRI preparation", exam_category: "Contrast-enhanced MRI", fasting_hours: null, requires_egfr: true, iv_cannula: true, oral_contrast: false,
        instructions: "Review renal function according to departmental contrast policy. Check allergy and previous contrast reaction history. Site IV cannula. Confirm weight for dose calculation.",
        checklist: [{ key: "allergy_history", label: "Allergy / previous contrast reaction history checked" }, { key: "weight_confirmed", label: "Weight confirmed for dose calculation" }] },
      ABDOMEN: { name: "MRI Abdomen / MRCP preparation", exam_category: "Abdomen / MRCP", fasting_hours: 4, requires_egfr: true, iv_cannula: false, oral_contrast: false,
        instructions: "Fasting as per departmental protocol. Breath-hold instructions rehearsed with patient.", checklist: [{ key: "breath_hold", label: "Breath-hold instructions rehearsed" }] },
      ENTEROGRAPHY: { name: "MR Enterography preparation", exam_category: "MR Enterography", fasting_hours: 4, requires_egfr: true, iv_cannula: true, oral_contrast: true,
        instructions: "Oral contrast regimen as per departmental protocol (timing and volume to be specified). Antiperistaltic agent only per approved local policy.", checklist: [{ key: "oral_regimen_completed", label: "Oral contrast regimen completed on schedule" }] },
      CARDIAC: { name: "Cardiac MRI preparation", exam_category: "Cardiac MRI", fasting_hours: null, requires_egfr: true, iv_cannula: true, oral_contrast: false,
        instructions: "ECG electrodes placement per vendor guidance. Breath-hold coaching. Stress agent use only under approved local protocol.", checklist: [{ key: "ecg_gating", label: "ECG gating checked" }, { key: "breath_hold", label: "Breath-hold coaching completed" }] },
      PELVIS: { name: "MRI Pelvis preparation", exam_category: "Pelvis", fasting_hours: null, requires_egfr: false, iv_cannula: false, oral_contrast: false,
        instructions: "Bladder filling instructions per examination protocol.", checklist: [{ key: "bladder", label: "Bladder preparation per protocol" }] },
    };
    const prepIds: Record<string, string> = {};
    for (const [k, v] of Object.entries(prepDefs)) prepIds[k] = (await ins(db, "prep_protocols", { ...v, checklist: v.checklist, medication_notes: k === "CARDIAC" ? "Medication review per cardiology referral." : null })).id;

    const examDefs: [string, string, string, number, boolean, string][] = [
      ["BRAIN", "MRI Brain", "BRAIN", 30, false, "GENERAL"], ["BRAINC", "MRI Brain with contrast", "BRAIN", 40, true, "CONTRAST"],
      ["IAM", "MRI Internal Auditory Meati", "HEAD_NECK", 30, true, "CONTRAST"], ["PIT", "MRI Pituitary", "BRAIN", 40, true, "CONTRAST"],
      ["ORB", "MRI Orbits", "HEAD_NECK", 40, true, "CONTRAST"], ["NECK", "MRI Neck soft tissue", "HEAD_NECK", 40, true, "CONTRAST"],
      ["CSP", "MRI Cervical spine", "SPINE", 30, false, "GENERAL"], ["TSP", "MRI Thoracic spine", "SPINE", 30, false, "GENERAL"],
      ["LSP", "MRI Lumbar spine", "SPINE", 30, false, "GENERAL"], ["WSP", "MRI Whole spine", "SPINE", 60, false, "GENERAL"],
      ["KNEE", "MRI Knee", "MSK", 30, false, "GENERAL"], ["SHLD", "MRI Shoulder", "MSK", 35, false, "GENERAL"], ["HIP", "MRI Hips / pelvis MSK", "MSK", 35, false, "GENERAL"],
      ["ANK", "MRI Ankle / foot", "MSK", 35, false, "GENERAL"], ["WRST", "MRI Wrist / hand", "MSK", 35, false, "GENERAL"],
      ["ABD", "MRI Abdomen (liver)", "ABDOMEN", 45, true, "ABDOMEN"], ["MRCP", "MRCP", "ABDOMEN", 40, false, "ABDOMEN"],
      ["MRE", "MR Enterography", "ABDOMEN", 60, true, "ENTEROGRAPHY"], ["PELF", "MRI Pelvis (female)", "PELVIS", 40, true, "PELVIS"],
      ["PROS", "MRI Prostate", "PELVIS", 45, true, "PELVIS"], ["CARD", "Cardiac MRI", "CARDIAC", 60, true, "CARDIAC"],
      ["MRAB", "MRA Brain (Circle of Willis)", "VASCULAR", 30, false, "GENERAL"], ["MRVB", "MRV Brain", "VASCULAR", 30, false, "GENERAL"],
      ["BRST", "MRI Breast", "BREAST", 45, true, "CONTRAST"],
    ];
    const exams: { id: string; code: string; region: string; dur: number; contrast: boolean; name: string }[] = [];
    for (const [code, name, region, dur, contrast, prep] of examDefs) {
      const r = await ins(db, "exam_types", { code, name, body_region: region, default_duration_min: dur, contrast_default: contrast, prep_protocol_id: prepIds[prep] });
      exams.push({ id: r.id, code, region, dur, contrast, name });
    }

    const categories: Record<string, string[]> = {
      Cardiac: ["Pacemaker", "Implantable cardioverter defibrillator (ICD)", "Cardiac resynchronisation therapy (CRT) device", "Implantable loop recorder", "Prosthetic heart valve / annuloplasty ring", "Cardiac vascular device"],
      Neurological: ["Aneurysm clip", "Ventricular shunt (programmable / fixed)", "Deep brain stimulator", "Neurostimulator (other)", "Spinal cord stimulator", "Implanted electrodes / leads", "Cochlear implant"],
      Orthopaedic: ["Hip prosthesis", "Knee prosthesis", "Shoulder prosthesis", "Spinal fixation", "Pedicle screws / rods", "Plates and screws", "Intramedullary nail"],
      Vascular: ["Vascular stent", "Aortic stent-graft", "IVC filter", "Embolisation coil", "Embolisation device (other)", "Vascular closure device"],
      Ophthalmic: ["Intraocular lens", "Orbital implant", "Retinal implant / tack"],
      "Breast and reconstructive": ["Breast implant", "Tissue expander", "Surgical mesh"],
      Dental: ["Dental implant", "Orthodontic braces", "Retainer", "Dental prosthesis"],
      Other: ["Insulin pump", "Implanted infusion pump", "Surgical clips / staples", "Intrauterine device (IUD)", "Penile prosthesis", "Magnetic implant", "Metallic foreign body"],
    };
    const catIds: Record<string, string> = {};
    for (const [g, names] of Object.entries(categories)) for (const n of names) catIds[n] = (await ins(db, "implant_categories", { group_name: g, name: n })).id;

    // QC parameters – thresholds intentionally NOT configured (must come from GE / departmental standards).
    const qcParams = [["Signal-to-noise ratio (SNR)", ""], ["Image uniformity", "%"], ["Geometric accuracy", "mm"], ["Slice thickness accuracy", "mm"],
      ["Slice position accuracy", "mm"], ["Ghosting / artefact level", "%"], ["Centre frequency stability", "Hz"]];
    const qcIds: Record<string, string[]> = { DAILY: [], WEEKLY: [], MONTHLY: [] };
    let order = 0;
    for (const [name, unit] of qcParams) {
      for (const freq of name.startsWith("Signal") || name.startsWith("Centre") || name.startsWith("Ghost") ? ["DAILY", "WEEKLY"] : ["WEEKLY", "MONTHLY"])
        qcIds[freq].push((await ins(db, "qc_parameters", { scanner_id: scanner.id, name, unit: unit || null, frequency: freq, sort_order: order++ })).id);
    }

    const contrastAgents = [
      await ins(db, "contrast_agents", { name: "Gadoterate meglumine 0.5 mmol/mL (DEMO stock)", manufacturer: "Demo supplier listing", concentration: "0.5 mmol/mL", agent_type: "IV_GADOLINIUM", reorder_level: 150 }),
      await ins(db, "contrast_agents", { name: "Gadobutrol 1.0 mmol/mL (DEMO stock)", manufacturer: "Demo supplier listing", concentration: "1.0 mmol/mL", agent_type: "IV_GADOLINIUM", reorder_level: 100 }),
      await ins(db, "contrast_agents", { name: "Oral mannitol solution (DEMO stock)", manufacturer: "Hospital pharmacy", concentration: "As prepared by pharmacy", agent_type: "ORAL", reorder_level: 2000 }),
    ];

    const cleaningAreas = [
      ["MRI scan room (Zone IV)", "DAILY", ["Floor cleaned and dry", "Surfaces wiped with approved disinfectant", "Waste removed", "No loose ferromagnetic items present"]],
      ["Patient table", "BETWEEN_PATIENTS", ["Table surface disinfected", "Linen changed", "Positioning pads wiped"]],
      ["Coils and accessories", "BETWEEN_PATIENTS", ["Coils in contact with patient disinfected", "Cables inspected for damage", "Coils returned to storage"]],
      ["Control room & equipment surfaces", "DAILY", ["Console keyboard / mouse disinfected", "Injector console wiped", "Surfaces dust-free"]],
      ["Patient preparation & changing area", "DAILY", ["Changing cubicles cleaned", "Lockers checked and wiped", "Hand-hygiene supplies stocked"]],
      ["MR-conditional equipment (injector, monitoring)", "WEEKLY", ["Injector head cleaned", "Monitoring leads disinfected", "Wheelchair / trolley (MR conditional) cleaned"]],
    ] as const;
    const areaIds: { id: string; name: string; freq: string; checklist: readonly string[] }[] = [];
    let so = 0;
    for (const [name, freq, checklist] of cleaningAreas) areaIds.push({ id: (await ins(db, "cleaning_areas", { name, frequency: freq, checklist: [...checklist], sort_order: so++ })).id, name, freq, checklist });

    if (referenceOnly) {
      // A single administrator so the system can be configured. Password must be changed at first login.
      const sysadmin = await ins(db, "users", { username: "admin", full_name: "System Administrator", role_id: roleIds.SYSADMIN, password_hash: await bcrypt.hash(DEMO_PASSWORD, 12), must_change_password: true });
      await db.query("COMMIT");
      log(`Reference data seeded. Sign in as 'admin' / '${DEMO_PASSWORD}' and change the password.`, sysadmin.id ? "" : "");
      return;
    }

    // ---------------- SYNTHETIC DEMONSTRATION DATA ----------------
    const staffDefs = [
      ["TBH-MRI-001", "Abena Owusu-Ansah", "MRI Supervisor / Senior Radiographer", "SUPERVISOR", "Allied Health Professions Council (Ghana)"],
      ["TBH-MRI-002", "Kwame Asante", "MRI Radiographer", "RADIOGRAPHER", "Allied Health Professions Council (Ghana)"],
      ["TBH-MRI-003", "Efua Mensah", "MRI Radiographer", "RADIOGRAPHER", "Allied Health Professions Council (Ghana)"],
      ["TBH-MRI-004", "Yaw Boateng", "MRI Radiographer", "RADIOGRAPHER", "Allied Health Professions Council (Ghana)"],
      ["TBH-MRI-005", "Akosua Darko", "MRI Radiographer", "RADIOGRAPHER", "Allied Health Professions Council (Ghana)"],
      ["TBH-MRI-006", "Kofi Appiah", "Radiographer (MRI trainee)", "RADIOGRAPHER", "Allied Health Professions Council (Ghana)"],
      ["TBH-MRI-007", "Ama Serwaa Frimpong", "MRI Nurse", "NURSE", "Nursing and Midwifery Council of Ghana"],
      ["TBH-MRI-008", "Esi Quaye", "MRI Nurse", "NURSE", "Nursing and Midwifery Council of Ghana"],
      ["TBH-MRI-009", "Adwoa Nyarko", "Receptionist", "RECEPTIONIST", null],
      ["TBH-MRI-010", "Nana Yeboah", "Receptionist", "RECEPTIONIST", null],
      ["TBH-MRI-011", "Dr. Kojo Amankwah", "MR Safety Officer (MRSO)", "MR_SAFETY", "Allied Health Professions Council (Ghana)"],
      ["TBH-ADM-001", "Comfort Adjei", "Head of Clinical Services", "MANAGEMENT", null],
      ["TBH-ICT-001", "Samuel Tetteh", "Systems Administrator", "SYSADMIN", null],
    ] as const;
    const staff: Record<string, string> = {};
    const usernames: Record<string, string> = { SUPERVISOR: "supervisor", MR_SAFETY: "mrso", MANAGEMENT: "manager", SYSADMIN: "admin" };
    const pwHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    const counters: Record<string, number> = {};
    const users: Record<string, string> = {};
    for (const [no, name, desig, role, body] of staffDefs) {
      const st = await ins(db, "staff", { hospital_id: hospital.id, staff_no: no, full_name: name, designation: desig, phone: `+233 20 ${int(100, 999)} ${int(1000, 9999)}`,
        email: `${name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "")}@demo.tbh.invalid`, employment_status: "ACTIVE",
        registration_body: body, registration_no: body ? `DEMO-${int(10000, 99999)}` : null, registration_expiry: body ? addDays(today, int(20, 600)) : null, is_demo: true });
      staff[no] = st.id;
      counters[role] = (counters[role] ?? 0) + 1;
      const uname = usernames[role] ?? `${role.toLowerCase()}${counters[role]}`;
      users[uname] = (await ins(db, "users", { username: uname, full_name: name, email: `${uname}@demo.tbh.invalid`, role_id: roleIds[role], staff_id: st.id, password_hash: pwHash })).id;
    }
    const radiographers = ["TBH-MRI-001", "TBH-MRI-002", "TBH-MRI-003", "TBH-MRI-004", "TBH-MRI-005", "TBH-MRI-006"].map((k) => staff[k]);
    const nurses = [staff["TBH-MRI-007"], staff["TBH-MRI-008"]];
    const recUsers = [users.receptionist1, users.receptionist2];
    const radUsers = [users.supervisor, users.radiographer1, users.radiographer2, users.radiographer3, users.radiographer4, users.radiographer5];
    const radUserByStaff: Record<string, string> = Object.fromEntries(radiographers.map((s, i) => [s, radUsers[i]]));

    // Fictional device references (never real manufacturer data).
    const devRefs = [
      { cat: "Pacemaker", manufacturer: "DEMO Manufacturer A (fictional)", model_name: "Example MR-Conditional Pacing System X1", model_number: "DEMO-PM-X1", materials: ["TITANIUM", "POLYMER"], safety_class: "MR_CONDITIONAL",
        conditions: { field_strength: "[DEMO] 1.5 T only – replace with manufacturer labelling", sar_whole_body: "[DEMO] value to be taken from labelling", device_programming: "[DEMO] Device must be programmed to MRI mode by cardiac physiology", monitoring: "[DEMO] Continuous ECG and SpO2 monitoring" } },
      { cat: "Hip prosthesis", manufacturer: "DEMO Orthopaedics (fictional)", model_name: "Example Total Hip System H2", model_number: "DEMO-HIP-H2", materials: ["COBALT_CHROMIUM", "TITANIUM_ALLOY", "POLYMER"], safety_class: "MR_CONDITIONAL",
        conditions: { field_strength: "[DEMO] 1.5 T and 3 T – replace with labelling", spatial_gradient: "[DEMO] value from labelling", sar_whole_body: "[DEMO] value from labelling" } },
      { cat: "Aneurysm clip", manufacturer: "DEMO Neuro (fictional)", model_name: "Example Clip (unknown alloy)", model_number: null, materials: ["UNKNOWN"], safety_class: "UNKNOWN", conditions: {} },
      { cat: "Intraocular lens", manufacturer: "DEMO Ophthalmic (fictional)", model_name: "Example Acrylic IOL", model_number: "DEMO-IOL-1", materials: ["POLYMER"], safety_class: "MR_SAFE", conditions: {} },
    ];
    const devIds: string[] = [];
    for (const d of devRefs) devIds.push((await ins(db, "device_references", { category_id: catIds[d.cat], manufacturer: d.manufacturer, model_name: d.model_name, model_number: d.model_number,
      materials: d.materials, safety_class: d.safety_class, conditions: d.conditions, source_type: "Demonstration entry", source_title: "DEMO – no source document", info_status: "USER_ENTERED_UNVERIFIED", is_demo: true, created_by: users.mrso })).id);

    // Patients
    const first = { MALE: ["Kwame", "Kofi", "Kwabena", "Yaw", "Kwaku", "Kojo", "Kwesi", "Emmanuel", "Daniel", "Samuel", "Joseph", "Isaac", "Prince", "Michael", "Richard", "Ebenezer", "Fiifi", "Nii", "Selorm", "Elikem"],
      FEMALE: ["Ama", "Akosua", "Abena", "Adwoa", "Afua", "Yaa", "Efua", "Esi", "Akua", "Mercy", "Grace", "Gifty", "Patience", "Comfort", "Abigail", "Priscilla", "Naa", "Dzifa", "Sena", "Elorm"] };
    const last = ["Mensah", "Owusu", "Boateng", "Asante", "Osei", "Agyeman", "Amoah", "Ofori", "Appiah", "Darko", "Addo", "Quaye", "Tetteh", "Lartey", "Nkrumah", "Badu", "Frimpong", "Gyamfi", "Antwi", "Sarpong", "Kufuor", "Danquah", "Ansah", "Bekoe", "Kumi", "Agbeko", "Dogbe", "Fiagbe", "Abubakar", "Issah"];
    const patients: { id: string; sex: string; dob: string; mrn: string; name: string }[] = [];
    const usedNames = new Set<string>();
    for (let i = 0; i < 260; i++) {
      const sex = chance(0.52) ? "FEMALE" : "MALE";
      let name = `${pick(first[sex as "MALE" | "FEMALE"])} ${pick(last)}`;
      while (usedNames.has(name)) name = `${pick(first[sex as "MALE" | "FEMALE"])} ${pick(last)} ${pick(last)}`;
      usedNames.add(name);
      const dob = `${int(1945, 2016)}-${String(int(1, 12)).padStart(2, "0")}-${String(int(1, 28)).padStart(2, "0")}`;
      const mrn = `DEMO-${String(100000 + i * 37).slice(-6)}`;
      const p = await ins(db, "patients", { hospital_id: hospital.id, mrn, full_name: name, dob, sex, phone: `+233 24 ${int(100, 999)} ${int(1000, 9999)}`, weight_kg: int(45, 110), is_demo: true, created_by: users.receptionist1,
        address: pick(["East Legon, Accra", "Osu, Accra", "Tema Community 11", "Kasoa", "Madina", "Spintex, Accra", "Dansoman", "Adenta", "Cantonments, Accra"]),
        next_of_kin: `${pick(first.FEMALE)} ${pick(last)} (relative)`, next_of_kin_phone: `+233 27 ${int(100, 999)} ${int(1000, 9999)}` });
      patients.push({ id: p.id, sex, dob, mrn, name });
    }

    // Implants for a subset of patients
    const implantPatients = new Set<string>();
    const implantScenarios = [
      { cat: "Hip prosthesis", ref: 1, name: "Total hip replacement", loc: "Hip", side: "RIGHT", status: "VERIFIED", info: "USER_ENTERED_UNVERIFIED" },
      { cat: "Knee prosthesis", ref: null, name: "Total knee replacement", loc: "Knee", side: "LEFT", status: "VERIFIED", cls: "MR_CONDITIONAL" },
      { cat: "Plates and screws", ref: null, name: "Distal radius plate", loc: "Wrist", side: "LEFT", status: "PENDING_DOCUMENTATION", cls: "UNKNOWN" },
      { cat: "Intraocular lens", ref: 3, name: "Intraocular lens", loc: "Eye", side: "BILATERAL", status: "VERIFIED" },
      { cat: "Dental implant", ref: null, name: "Dental implant", loc: "Mandible", side: "MIDLINE", status: "UNDER_REVIEW", cls: "UNKNOWN" },
      { cat: "Pacemaker", ref: 0, name: "Permanent pacemaker", loc: "Left chest", side: "LEFT", status: "ESCALATED" },
      { cat: "Aneurysm clip", ref: 2, name: "Intracranial aneurysm clip", loc: "Brain", side: "RIGHT", status: "UNSUCCESSFUL" },
      { cat: "Vascular stent", ref: null, name: "Coronary stent", loc: "Heart (LAD)", side: "NOT_APPLICABLE", status: "NOT_STARTED", cls: "UNKNOWN" },
      { cat: "Surgical clips / staples", ref: null, name: "Cholecystectomy clips", loc: "Abdomen (gallbladder fossa)", side: "NOT_APPLICABLE", status: "VERIFIED", cls: "MR_CONDITIONAL" },
      { cat: "Intrauterine device (IUD)", ref: null, name: "Copper IUD", loc: "Uterus", side: "MIDLINE", status: "PENDING_DOCUMENTATION", cls: "UNKNOWN" },
      { cat: "Metallic foreign body", ref: null, name: "Retained metallic fragment", loc: "Left thigh soft tissue", side: "LEFT", status: "UNDER_REVIEW", cls: "UNKNOWN" },
      { cat: "Spinal fixation", ref: null, name: "Lumbar pedicle screw fixation L4–L5", loc: "Lumbar spine", side: "MIDLINE", status: "VERIFIED", cls: "MR_CONDITIONAL" },
    ];
    const implantByPatient: Record<string, string[]> = {};
    for (let i = 0; i < implantScenarios.length; i++) {
      const sc: any = implantScenarios[i];
      const pt = patients[200 + i];
      implantPatients.add(pt.id);
      const ref = sc.ref !== null ? devRefs[sc.ref] : null;
      const cls = ref ? ref.safety_class : sc.cls;
      const conditions = ref ? ref.conditions : cls === "MR_CONDITIONAL" ? { field_strength: "[DEMO] As stated on implant card – replace with actual labelling", sar_whole_body: "[DEMO] value from labelling" } : {};
      const imp = await ins(db, "patient_implants", { patient_id: pt.id, device_reference_id: sc.ref !== null ? devIds[sc.ref] : null, category_id: catIds[sc.cat], device_name: sc.name,
        anatomical_location: sc.loc, side: sc.side, manufacturer: ref?.manufacturer ?? (chance(0.5) ? "Not documented" : null), model_name: ref?.model_name ?? null, model_number: ref?.model_number ?? null,
        implanted_on_text: `${int(2008, 2024)}`, facility: pick(["Korle Bu Teaching Hospital", "37 Military Hospital", "Komfo Anokye Teaching Hospital", "The Bank Hospital", "Overseas – details not documented"]),
        materials: ref?.materials ?? ["UNKNOWN"], safety_class: cls, conditions, verification_status: sc.status, is_demo: true, created_by: users.radiographer1,
        notes: "Synthetic demonstration record." });
      (implantByPatient[pt.id] ??= []).push(imp.id);
      if (sc.status !== "NOT_STARTED") {
        const checklist: Record<string, boolean> = {};
        for (const c of VERIFICATION_CHECKLIST) checklist[c.key] = sc.status === "VERIFIED" ? c.key !== "specialist_consulted" : chance(0.4);
        await ins(db, "implant_verifications", { implant_id: imp.id, checklist, status: sc.status, verified_by: users.mrso,
          doc_source: sc.status === "VERIFIED" ? "Implant card + operative note (DEMO)" : null, doc_title: sc.status === "VERIFIED" ? "DEMO implant card" : null, doc_reference: sc.status === "VERIFIED" ? `DEMO-REF-${i}` : null,
          notes: sc.status === "ESCALATED" ? "Device programming and cardiology support required – escalated to MRSO / cardiology." : sc.status === "UNSUCCESSFUL" ? "Clip model and alloy could not be identified from available records." : null,
          verified_at: zonedToUtc(addDays(today, -int(3, 60)), "10:00") });
      }
    }

    // Appointments over the past 90 days + next 14 days
    const depts = ["Neurology", "Orthopaedics", "General Surgery", "Internal Medicine", "Obstetrics & Gynaecology", "Urology", "Cardiology", "ENT", "Emergency Department", "Oncology", "Family Medicine", "Gastroenterology"];
    const doctors = ["Dr. A. Mensah", "Dr. K. Osei", "Dr. E. Addo", "Dr. N. Lartey", "Dr. Y. Badu", "Dr. S. Agyeman", "Dr. F. Tetteh", "Dr. M. Owusu", "Dr. P. Danquah"];
    const indications: Record<string, string[]> = {
      BRAIN: ["Chronic headache – exclude structural lesion", "New-onset seizure", "Suspected stroke – follow-up", "Cognitive decline", "Vertigo"],
      HEAD_NECK: ["Unilateral sensorineural hearing loss", "Neck mass", "Visual disturbance"],
      SPINE: ["Low back pain with radiculopathy", "Neck pain with arm paraesthesia", "Suspected cord compression", "Myelopathy"],
      MSK: ["Knee pain – suspected meniscal tear", "Shoulder pain – rotator cuff assessment", "Ankle instability", "Hip pain – avascular necrosis query", "Wrist pain post fall"],
      ABDOMEN: ["Focal liver lesion characterisation", "Obstructive jaundice", "Crohn's disease assessment", "Abnormal LFTs"],
      PELVIS: ["Fibroid mapping", "Elevated PSA", "Pelvic mass", "Endometriosis query"],
      CARDIAC: ["Cardiomyopathy assessment", "Myocarditis query", "Assessment of LV function"],
      VASCULAR: ["Aneurysm screening", "Venous sinus thrombosis query"],
      BREAST: ["High-risk screening", "Implant integrity", "Problem-solving"],
    };
    const settings = DEFAULT_SETTINGS;
    let accession = 1000;
    const accNo = (date: string) => `MR${date.slice(2, 4)}${String(accession++).padStart(6, "0")}`;
    const nowMs = Date.now();
    const events: any[] = [];
    const ev = (appointment_id: string, from: string | null, to: string, event: string, at: Date, user_id: string | null, note: string | null = null) => events.push({ appointment_id, from_status: from, to_status: to, event, at, user_id, note });
    let incSeq = 1;
    const batches: { id: string; agent: number; stock: number }[] = [];
    // Contrast batches (current + an older nearly-expired one)
    for (const [ai, agent] of contrastAgents.entries()) {
      const qty = ai === 2 ? 20000 : 1500;
      const old = await ins(db, "contrast_batches", { agent_id: agent.id, batch_no: `DEMO-${ai}A-${int(1000, 9999)}`, expiry_date: addDays(today, ai === 1 ? 25 : 200), quantity_received: qty, current_stock: qty, supplier: "Demo supplier", received_on: addDays(today, -95), received_by: users.nurse1 });
      batches.push({ id: old.id, agent: ai, stock: qty });
      await db.query(`INSERT INTO contrast_stock_movements (batch_id, movement_type, quantity, reason, user_id, at) VALUES ($1,'RECEIPT',$2,'Stock received',$3,$4)`, [old.id, qty, users.nurse1, zonedToUtc(addDays(today, -95), "09:00")]);
    }
    const batchFor = (agentIdx: number) => batches.find((b) => b.agent === agentIdx)!;

    const busyUntil: Record<string, number> = {};
    const scheduledDays: string[] = [];
    for (let d = addDays(today, -90); d <= addDays(today, 14); d = addDays(d, 1)) scheduledDays.push(d);
    // The unit is open 24/7; demo elective lists run in daytime, plus occasional overnight emergencies.
    const demoList = (d: string) => (weekday(d) === 0 ? { open: "09:00", close: "15:00" } : weekday(d) === 6 ? { open: "08:00", close: "16:00" } : { open: "07:30", close: "19:30" });

    let patientCursor = 0;
    const nextPatient = () => patients[(patientCursor++ * 7) % 200]; // implant patients (200+) are used deliberately below
    type Fx = { pstate?: string; arrivedAt?: Date; scanStartAt?: Date; priority?: string; note?: string };
    const makeAppt = async (day: string, start: Date, exam: (typeof exams)[number], pt: (typeof patients)[number], outcome: string, fx: Fx = {}) => {
      const isPast = day < today, isFuture = day > today;
      const dur = exam.dur;
      const endAt = addMin(start, dur);
      const region = exam.region;
      const priority = fx.priority ?? (chance(0.08) ? "URGENT" : chance(0.02) ? "EMERGENCY" : "ROUTINE");
      const ptype = chance(0.2) ? "INPATIENT" : priority === "EMERGENCY" ? "EMERGENCY" : "OUTPATIENT";
      const radiographer = pick(radiographers.slice(0, 5));
      const created = addMin(start, -60 * 24 * int(1, 21));
      const booker = pick(recUsers);
      const id = (await ins(db, "appointments", {
        hospital_id: hospital.id, accession_no: accNo(day), patient_id: pt.id, exam_type_id: exam.id, body_region: region,
        clinical_indication: pick(indications[region] ?? indications[region === "HEAD_NECK" ? "HEAD_NECK" : "BRAIN"] ?? ["Clinical assessment"]),
        referring_doctor: pick(doctors), referring_department: pick(depts), patient_type: ptype, contrast: exam.contrast, priority,
        scheduled_start: start, scheduled_end: endAt, scanner_id: scanner.id, radiographer_id: radiographer, booked_by: booker, created_at: created, is_demo: true,
        status: "BOOKED", notes: fx.note ?? (chance(0.1) ? "Patient requests early slot (demo note)" : null),
      })).id;
      ev(id, null, "BOOKED", "BOOKED", created, booker);

      if (outcome === "CANCELLED") {
        const at = addMin(start, -60 * int(2, 48));
        await db.query(`UPDATE appointments SET status='CANCELLED', cancelled_at=$2, cancel_reason=$3 WHERE id=$1`, [id, at, pick(["Patient request", "Referrer cancelled", "Patient unwell", "Unable to fast / preparation not done", "Scanner downtime", "Claustrophobia – referred for sedation"])]);
        ev(id, "BOOKED", "CANCELLED", "CANCELLED", at, booker); return;
      }
      if (outcome === "NO_SHOW") {
        const at = addMin(start, 45);
        await db.query(`UPDATE appointments SET status='NO_SHOW', no_show_at=$2 WHERE id=$1`, [id, at]);
        ev(id, "BOOKED", "NO_SHOW", "NO_SHOW", at, booker); return;
      }
      if (isFuture || outcome === "BOOKED") {
        if (day <= addDays(today, 2) && chance(0.5)) await db.query(`UPDATE appointments SET reminder_at=$2, reminder_by=$3, reminder_note='Called – confirmed attendance (demo)' WHERE id=$1`, [id, addMin(start, -60 * 26), booker]);
        return;
      }
      // Arrival
      const arrived = fx.arrivedAt ?? addMin(start, chance(0.15) ? int(-10, 20) : int(-50, -25));
      if (arrived.getTime() > nowMs) { return; }
      const receiver = pick(recUsers);
      await db.query(`UPDATE appointments SET status='ARRIVED', arrived_at=$2, arrival_received_by=$3, identity_verified=true, identity_method='Name + date of birth + hospital number (verbal and wristband)' WHERE id=$1`, [id, arrived, receiver]);
      ev(id, "BOOKED", "ARRIVED", "ARRIVED", arrived, receiver);
      if (outcome === "ARRIVED") return;
      // Screening
      const screenedAt = addMin(arrived, int(5, 20));
      const screener = radUserByStaff[radiographer] ?? users.radiographer1;
      const hasImplant = implantByPatient[pt.id];
      const answers: Record<string, { answer: string; details?: string }> = {};
      for (const qq of SCREENING_QUESTIONS) answers[qq.key] = { answer: "NO" };
      if (hasImplant) { answers.ortho_implant = { answer: "YES", details: "Declared implant – see implant registry" }; answers.previous_surgery = { answer: "YES", details: "Related surgery" }; }
      if (chance(0.15)) answers.previous_mri = { answer: "YES" };
      if (chance(0.06)) answers.claustrophobia = { answer: "YES", details: "Mild anxiety – reassured" };
      const pregRelevant = pt.sex === "FEMALE" && (new Date().getUTCFullYear() - Number(pt.dob.slice(0, 4))) <= 55 && (new Date().getUTCFullYear() - Number(pt.dob.slice(0, 4))) >= 10;
      const routine = !hasImplant;
      const decisionAt = addMin(screenedAt, int(2, 10));
      const screeningPending = outcome === "SCREENING" && (hasImplant || chance(0.5));
      await ins(db, "safety_screenings", { appointment_id: id, patient_id: pt.id, answers, pregnancy_status: pregRelevant ? "NOT_PREGNANT" : "NOT_APPLICABLE", weight_kg: int(45, 110),
        status: screeningPending ? "PENDING" : "CLEAR", screened_by: screener, screened_at: screenedAt,
        decision_by: screeningPending ? null : routine ? screener : users.mrso, decision_at: screeningPending ? null : decisionAt,
        decision_notes: screeningPending ? null : routine ? null : "Implant verified and conditions compared with SIGNA Creator 1.5T – proceed with conditions (demo)." });
      ev(id, "ARRIVED", "SCREENING", "SCREENING_RECORDED", screenedAt, screener);
      if (hasImplant) for (const impId of hasImplant) {
        const imp = (await db.query(`SELECT safety_class, verification_status FROM patient_implants WHERE id=$1`, [impId])).rows[0];
        const canProceed = !screeningPending && imp.verification_status === "VERIFIED" && imp.safety_class !== "MR_UNSAFE";
        await ins(db, "implant_assessments", { implant_id: impId, appointment_id: id, scanner_id: scanner.id, decision: screeningPending ? "PENDING" : canProceed ? (imp.safety_class === "MR_CONDITIONAL" ? "PROCEED_WITH_CONDITIONS" : "PROCEED") : "PENDING",
          conditions_compared: canProceed, comparison: canProceed ? { field_strength: "MET", spatial_gradient: "MET", sar_b1: "MET", slew_rate: "NOT_APPLICABLE", region_positioning: "MET", waiting_period: "MET", device_mode: "NOT_APPLICABLE", monitoring: "NOT_APPLICABLE" } : {},
          conditions_applied: canProceed && imp.safety_class === "MR_CONDITIONAL" ? "Normal operating mode SAR; conditions per labelling (demo)" : null,
          assessed_by: canProceed ? users.mrso : null, assessed_at: canProceed ? decisionAt : null });
      }
      if (screeningPending) { await db.query(`UPDATE appointments SET status='SCREENING', screening_status='PENDING' WHERE id=$1`, [id]); return; }
      await db.query(`UPDATE appointments SET status='PREPARATION', screening_status='CLEAR' WHERE id=$1`, [id]);
      ev(id, "SCREENING", "SCREENING", "SAFETY_CLEARED", decisionAt, routine ? screener : users.mrso);
      ev(id, "SCREENING", "PREPARATION", "STATUS_PREPARATION", decisionAt, routine ? screener : users.mrso);
      // Preparation
      const nurse = pick(nurses);
      const nurseUser = nurse === nurses[0] ? users.nurse1 : users.nurse2;
      const prepDone = addMin(decisionAt, int(5, 15));
      const prepComplete = outcome !== "PREPARATION";
      const ex = examDefs.find((e) => e[0] === exam.code)!;
      const prepDef = prepDefs[ex[5]];
      const checklist: Record<string, boolean> = {};
      for (const c of prepDef.checklist) checklist[c.key] = prepComplete || chance(0.5);
      await ins(db, "patient_preparations", { appointment_id: id, prep_protocol_id: prepIds[ex[5]], checklist, fasting_confirmed: prepDef.fasting_hours ? true : null,
        egfr_value: exam.contrast ? int(60, 120) : null, egfr_date: exam.contrast ? addDays(day, -int(1, 20)) : null, previous_imaging: chance(0.3) ? "Previous CT available on PACS" : null,
        iv_cannula: exam.contrast || prepDef.iv_cannula ? true : null, cannula_gauge: exam.contrast ? pick(["20G", "22G"]) : null, cannula_site: exam.contrast ? pick(["Left antecubital fossa", "Right antecubital fossa", "Right dorsum of hand"]) : null,
        cannulated_by: exam.contrast ? nurse : null, oral_contrast_given: prepDef.oral_contrast ? true : null, oral_contrast_details: prepDef.oral_contrast ? "Oral regimen completed (demo)" : null,
        metal_removed: prepComplete ? true : null, gown_changed: prepComplete ? true : null, status: prepComplete ? "COMPLETE" : "IN_PROGRESS",
        completed_by: prepComplete ? nurseUser : null, completed_at: prepComplete ? prepDone : null, updated_by: nurseUser });
      ev(id, "PREPARATION", "PREPARATION", "PREPARATION_STARTED", addMin(decisionAt, 2), nurseUser);
      if (!prepComplete) { await db.query(`UPDATE appointments SET prep_status='IN_PROGRESS' WHERE id=$1`, [id]); return; }
      await db.query(`UPDATE appointments SET status='CLEARED', prep_status='COMPLETE' WHERE id=$1`, [id]);
      ev(id, "PREPARATION", "PREPARATION", "PREPARATION_COMPLETE", prepDone, nurseUser);
      ev(id, "PREPARATION", "CLEARED", "CLEARED_FOR_SCANNING", prepDone, nurseUser);
      if (outcome === "CLEARED") return;
      // Scanning
      const scanUser = radUserByStaff[radiographer] ?? users.radiographer1;
      const scanStart = fx.scanStartAt ?? new Date(Math.max(start.getTime(), prepDone.getTime() + 3 * 60000, busyUntil[scanner.id] ?? 0));
      if (scanStart.getTime() > nowMs) { return; }
      const actualDur = dur - int(-5, 8);
      const scanEnd = addMin(scanStart, actualDur);
      const stillScanning = outcome === "SCANNING" || scanEnd.getTime() > nowMs;
      const incomplete = outcome === "INCOMPLETE";
      const repeats = chance(0.12) ? int(1, 2) : 0;
      const sr = await ins(db, "scan_records", { appointment_id: id, scanner_id: scanner.id, radiographer_id: radiographer, started_at: scanStart, ended_at: stillScanning ? null : scanEnd,
        contrast_used: exam.contrast, completion_status: stillScanning ? null : incomplete ? "INCOMPLETE" : "COMPLETE",
        incomplete_reason: incomplete ? pick(["Patient claustrophobic – unable to tolerate", "Patient motion – unable to comply", "Patient unwell during scan", "Equipment fault during examination"]) : null,
        repeat_sequences: repeats, additional_sequences: chance(0.1) ? "Additional post-contrast coronal T1 (demo)" : null,
        protocol_modifications: repeats ? "Repeated motion-degraded sequence with PROPELLER (demo)" : null, started_by: scanUser, ended_by: stillScanning ? null : scanUser });
      ev(id, "CLEARED", "SCANNING", "SCAN_STARTED", scanStart, scanUser);
      busyUntil[scanner.id] = scanEnd.getTime() + 5 * 60000;
      if (exam.contrast) {
        const agentIdx = chance(0.7) ? 0 : 1;
        const weight = int(50, 100);
        const dose = agentIdx === 0 ? Math.round(weight * 0.2 * 10) / 10 : Math.round(weight * 0.1 * 10) / 10;
        const b = batchFor(agentIdx);
        const reaction = chance(0.015), extrav = !reaction && chance(0.01);
        let incidentId = null;
        const admAt = addMin(scanStart, Math.floor(actualDur * 0.6));
        if ((reaction || extrav) && admAt.getTime() < nowMs) {
          incidentId = (await ins(db, "incidents", { ref_no: `INC-${day.slice(0, 4)}-${String(incSeq++).padStart(4, "0")}`, occurred_at: admAt, category: reaction ? "CONTRAST_REACTION" : "EXTRAVASATION",
            severity: reaction ? "LOW" : "LOW", location: "MRI scan room", description: reaction ? "Mild urticaria following gadolinium injection (demo record)." : "Small-volume extravasation at cannula site (demo record).",
            immediate_action: reaction ? "Injection stopped, observed, antihistamine per protocol." : "Cannula removed, limb elevated, cold compress, observed.", patient_id: pt.id, appointment_id: id,
            status: day < addDays(today, -14) ? "CLOSED" : "UNDER_INVESTIGATION", investigation: day < addDays(today, -14) ? "Reviewed – no system failure identified." : null,
            corrective_action: day < addDays(today, -14) ? "Allergy alert added to patient record." : null, closure_notes: day < addDays(today, -14) ? "Closed after review (demo)." : null,
            closed_at: day < addDays(today, -14) ? addMin(admAt, 60 * 24 * 5) : null, reported_by: scanUser, is_demo: true })).id;
        }
        if (admAt.getTime() < nowMs) {
          const adm = await ins(db, "contrast_administrations", { appointment_id: id, patient_id: pt.id, agent_id: contrastAgents[agentIdx].id, batch_id: b.id, dose_ml: dose,
            route: "IV_INJECTOR", administered_at: admAt, administered_by: pick(nurses), adverse_reaction: reaction, reaction_severity: reaction ? "MILD" : null,
            reaction_details: reaction ? "Mild urticaria (demo)" : null, extravasation: extrav, extravasation_details: extrav ? "Approx. small volume at cannula site (demo)" : null, incident_id: incidentId, recorded_by: users.nurse1 });
          b.stock -= dose;
          await db.query(`INSERT INTO contrast_stock_movements (batch_id, movement_type, quantity, reason, administration_id, user_id, at) VALUES ($1,'ADMINISTRATION',$2,$3,$4,$5,$6)`, [b.id, -dose, "Administered (demo)", adm.id, users.nurse1, admAt]);
          ev(id, "SCANNING", "SCANNING", "CONTRAST_ADMINISTERED", admAt, users.nurse1, `${dose} mL`);
        }
      }
      if (stillScanning) {
        await db.query(`UPDATE appointments SET status='SCANNING' WHERE id=$1`, [id]);
        await db.query(`UPDATE scanners SET status='IN_USE' WHERE id=$1`, [scanner.id]);
        return;
      }
      await db.query(`UPDATE appointments SET status=$2 WHERE id=$1`, [id, incomplete ? "INCOMPLETE" : "SCANNED"]);
      ev(id, "SCANNING", incomplete ? "INCOMPLETE" : "SCANNED", incomplete ? "SCAN_INCOMPLETE" : "SCAN_COMPLETED", scanEnd, scanUser);
      // PACS
      const pu = await ins(db, "pacs_uploads", { appointment_id: id, scan_record_id: sr.id, created_at: scanEnd });
      await db.query(`INSERT INTO pacs_upload_events (upload_id, to_status, note, user_id, at) VALUES ($1,'PENDING_UPLOAD','Created on scan completion',$2,$3)`, [pu.id, scanUser, scanEnd]);
      const minsSince = (nowMs - scanEnd.getTime()) / 60000;
      let pstate: string;
      if (fx.pstate) pstate = fx.pstate;
      else if (outcome === "SCANNED") pstate = minsSince > 90 ? pick(["PENDING_UPLOAD", "UPLOAD_FAILED", "REQUIRES_INVESTIGATION", "SUCCESS_UNVERIFIED"]) : pick(["PENDING_UPLOAD", "UPLOADING", "SUCCESS_UNVERIFIED"]);
      else if (isPast && day >= addDays(today, -3) && chance(0.04)) pstate = pick(["UPLOAD_FAILED", "REQUIRES_INVESTIGATION"]);
      else pstate = "SUCCESS";
      const initAt = addMin(scanEnd, int(2, 12));
      if (initAt.getTime() > nowMs) pstate = "PENDING_UPLOAD";
      const failedFirst = pstate === "SUCCESS" && chance(0.05);
      if (pstate === "PENDING_UPLOAD") { if (outcome === "COMPLETED") await db.query(`UPDATE appointments SET status='SCANNED' WHERE id=$1`, [id]); return; }
      await db.query(`UPDATE pacs_uploads SET status='UPLOADING', initiated_at=$2, attempts=1 WHERE id=$1`, [pu.id, initAt]);
      await db.query(`INSERT INTO pacs_upload_events (upload_id, from_status, to_status, user_id, at) VALUES ($1,'PENDING_UPLOAD','UPLOADING',$2,$3)`, [pu.id, scanUser, initAt]);
      if (pstate === "UPLOADING") { await db.query(`UPDATE appointments SET status='SCANNED' WHERE id=$1`, [id]); return; }
      const reasons = ["Network timeout to PACS", "DICOM association rejected by PACS", "Study partially received – series missing", "PACS storage unavailable", "Patient ID mismatch in DICOM header"];
      if (pstate === "UPLOAD_FAILED" || pstate === "REQUIRES_INVESTIGATION" || failedFirst) {
        const r = pick(reasons);
        const fAt = addMin(initAt, int(3, 10));
        await db.query(`UPDATE pacs_uploads SET status=$2, failure_reason=$3 WHERE id=$1`, [pu.id, pstate === "REQUIRES_INVESTIGATION" ? "REQUIRES_INVESTIGATION" : "UPLOAD_FAILED", r]);
        await db.query(`INSERT INTO pacs_upload_events (upload_id, from_status, to_status, note, user_id, at) VALUES ($1,'UPLOADING',$2,$3,$4,$5)`, [pu.id, pstate === "REQUIRES_INVESTIGATION" ? "REQUIRES_INVESTIGATION" : "UPLOAD_FAILED", r, scanUser, fAt]);
        ev(id, "SCANNED", "SCANNED", pstate === "REQUIRES_INVESTIGATION" ? "PACS_REQUIRES_INVESTIGATION" : "PACS_UPLOAD_FAILED", fAt, scanUser, r);
        if (!failedFirst) { if (!incomplete) await db.query(`UPDATE appointments SET status='SCANNED' WHERE id=$1`, [id]); return; }
        await db.query(`UPDATE pacs_uploads SET status='UPLOADING', attempts=2, corrective_action='Re-sent from scanner after PACS link restored' WHERE id=$1`, [pu.id]);
      }
      const doneAt = addMin(initAt, int(4, 25) + (failedFirst ? 30 : 0));
      if (doneAt.getTime() > nowMs) { await db.query(`UPDATE appointments SET status='SCANNED' WHERE id=$1`, [id]); return; }
      await db.query(`UPDATE pacs_uploads SET status='SUCCESSFULLY_UPLOADED', completed_at=$2, image_count=$3, series_count=$4 WHERE id=$1`, [pu.id, doneAt, int(250, 1800), int(5, 12)]);
      await db.query(`INSERT INTO pacs_upload_events (upload_id, from_status, to_status, user_id, at) VALUES ($1,'UPLOADING','SUCCESSFULLY_UPLOADED',$2,$3)`, [pu.id, scanUser, doneAt]);
      ev(id, incomplete ? "INCOMPLETE" : "SCANNED", incomplete ? "INCOMPLETE" : "SCANNED", "PACS_SUCCESSFULLY_UPLOADED", doneAt, scanUser);
      if (pstate === "SUCCESS_UNVERIFIED") { await db.query(`UPDATE appointments SET status='SCANNED' WHERE id=$1`, [id]); return; }
      const confAt = addMin(doneAt, int(2, 15));
      if (confAt.getTime() > nowMs) { await db.query(`UPDATE appointments SET status='SCANNED' WHERE id=$1`, [id]); return; }
      await db.query(`UPDATE pacs_uploads SET verification_status='VERIFIED', confirmed_by=$2, confirmed_at=$3 WHERE id=$1`, [pu.id, scanUser, confAt]);
      if (!incomplete) {
        await db.query(`UPDATE appointments SET status='COMPLETED', completed_at=$2 WHERE id=$1`, [id, confAt]);
        ev(id, "SCANNED", "COMPLETED", "EXAMINATION_COMPLETED", confAt, scanUser, "Scan complete and PACS upload confirmed");
      }
    };

    // Anchor the live scenario to "now", clamped so the whole block stays within today's date.
    let anchor = Math.floor(nowMs / 300000) * 300000;
    anchor = Math.min(anchor, zonedToUtc(addDays(today, 1)).getTime() - 215 * 60000);
    anchor = Math.max(anchor, zonedToUtc(today).getTime() + 210 * 60000);
    const liveFrom = new Date(anchor - 215 * 60000), liveTo = new Date(anchor + 215 * 60000);
    for (const day of scheduledDays) {
      const hours = demoList(day);
      const [oh, om] = hours.open.split(":").map(Number);
      const [ch, cm] = hours.close.split(":").map(Number);
      let t = oh * 60 + om + 15;
      const end = ch * 60 + cm;
      const isToday = day === today, isPast = day < today, isFuture = day > today;
      const loadFactor = isFuture ? (addDays(today, 7) < day ? 0.45 : 0.75) : 0.85;
      while (t < end - 30) {
        const exam = pick(exams);
        const dur = exam.dur;
        if (t + dur > end) break;
        if (!chance(loadFactor)) { t += 15; continue; }
        const hh = String(Math.floor(t / 60)).padStart(2, "0"), mm = String(t % 60).padStart(2, "0");
        const start = zonedToUtc(day, `${hh}:${mm}`);
        t += dur + pick([0, 0, 5, 10, 15]);
        let outcome: string;
        if (isToday) {
          if (addMin(start, dur) > liveFrom && start < liveTo) continue; // reserved for the live scenario below
          outcome = start.getTime() < nowMs ? (chance(0.06) ? "NO_SHOW" : chance(0.05) ? "INCOMPLETE" : "COMPLETED") : "BOOKED";
        } else if (isFuture) outcome = chance(0.03) ? "CANCELLED" : "BOOKED";
        else outcome = chance(0.05) ? "NO_SHOW" : chance(0.05) ? "CANCELLED" : chance(0.03) ? "INCOMPLETE" : "COMPLETED";
        await makeAppt(day, start, exam, nextPatient(), outcome);
      }
      // 24/7 unit: occasional overnight emergency examinations (past nights only).
      if (!isFuture && chance(0.45)) {
        const start = zonedToUtc(day, pick(["21:30", "23:00", "01:30", "03:00"]));
        const ex = pick(exams.filter((e) => e.region === "BRAIN" || e.region === "SPINE"));
        const free = !(addMin(start, ex.dur) > liveFrom && start < liveTo);
        if (free && start.getTime() + ex.dur * 60000 < nowMs - 3 * 3600000)
          await makeAppt(day, start, ex, nextPatient(), chance(0.08) ? "INCOMPLETE" : "COMPLETED", { priority: "EMERGENCY", note: "Overnight emergency (demo)" });
      }
    }

    // Live scenario anchored to the current time so the Command Centre shows every workflow stage.
    const shortExams = exams.filter((e) => e.dur <= 30);
    const rel = (m: number) => new Date(Math.min(anchor + m * 60000, m <= 0 ? nowMs - 120000 : Infinity));
    const live: [number, string, Fx & { pt?: (typeof patients)[number] }][] = [
      [-205, "BOOKED", {}],
      [-170, "COMPLETED", { pstate: "SUCCESS", arrivedAt: rel(-195) }],
      [-135, "SCANNED", { pstate: "UPLOAD_FAILED", arrivedAt: rel(-160) }],
      [-100, "SCANNED", { pstate: "PENDING_UPLOAD", arrivedAt: rel(-125) }],
      [-65, "SCANNED", { pstate: "SUCCESS_UNVERIFIED", arrivedAt: rel(-90) }],
      [-30, "SCANNING", { arrivedAt: rel(-60), scanStartAt: rel(-12) }],
      [5, "CLEARED", { arrivedAt: rel(-45) }],
      [40, "PREPARATION", { arrivedAt: rel(-38) }],
      [75, "SCREENING", { arrivedAt: rel(-32), pt: patients[200] }],
      [110, "SCREENING", { arrivedAt: rel(-28), pt: patients[202] }],
      [145, "ARRIVED", { arrivedAt: rel(-58) }],
      [180, "ARRIVED", { arrivedAt: rel(-4) }],
    ];
    for (const [off, outcome, fx] of live) {
      const start = rel(off);
      const day = localDate(start);
      const h = settings.operatingHours[String(weekday(day))];
      const outOfHours = !h || start < zonedToUtc(day, h.open) || addMin(start, 30) > zonedToUtc(day, h.close);
      await makeAppt(day, start, pick(shortExams), fx.pt ?? nextPatient(), outcome,
        { ...fx, priority: outOfHours ? "URGENT" : undefined, note: outOfHours ? "Out-of-hours list (demo)" : undefined });
    }
    await db.query(`SELECT setval('accession_seq', $1)`, [accession + 1]);
    for (const e of events) await db.query(`INSERT INTO workflow_events (appointment_id, from_status, to_status, event, at, user_id, note) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [e.appointment_id, e.from_status, e.to_status, e.event, e.at, e.user_id, e.note]);
    for (const b of batches) await db.query(`UPDATE contrast_batches SET current_stock=$2 WHERE id=$1`, [b.id, Math.max(0, Math.round(b.stock * 10) / 10)]);
    // Low stock demo: gadobutrol batch nearly used up
    await db.query(`UPDATE contrast_batches SET current_stock = LEAST(current_stock, 60) WHERE id=$1`, [batchFor(1).id]);
    await db.query(`INSERT INTO contrast_stock_movements (batch_id, movement_type, quantity, reason, user_id, at) VALUES ($1,'ADJUSTMENT',0,'Stock count reconciliation (demo)',$2,now())`, [batchFor(1).id, users.nurse1]);

    // QC sessions: daily for past 60 operating days, weekly, monthly
    for (const day of scheduledDays.filter((d) => d <= today && d >= addDays(today, -60))) {
      if (day === today && chance(0.5)) continue;
      if (chance(0.06)) continue; // missed QC days (compliance < 100%)
      const fail = chance(0.03);
      const performer = pick(radiographers.slice(0, 5));
      const s = await ins(db, "qc_sessions", { scanner_id: scanner.id, frequency: "DAILY", performed_at: zonedToUtc(day, "07:40"), performed_by: performer, phantom: "GE head phantom (demo)",
        overall_result: fail ? "FAIL" : "PASS", notes: fail ? "Ghosting observed on daily QC image (demo)." : null, corrective_action: fail ? "Phantom repositioned and QC repeated; GE service informed (demo)." : null,
        verified_by: day < addDays(today, -2) ? users.supervisor : null, verified_at: day < addDays(today, -2) ? zonedToUtc(day, "16:00") : null, recorded_by: radUserByStaff[performer], is_demo: true });
      for (const pid of qcIds.DAILY) await ins(db, "qc_results", { session_id: s.id, parameter_id: pid, value: null, observation: "Visual check (demo)", result: fail && pid === qcIds.DAILY[2] ? "FAIL" : "PASS" });
    }
    for (let w = 1; w <= 8; w++) {
      const day = addDays(today, -7 * w);
      const s = await ins(db, "qc_sessions", { scanner_id: scanner.id, frequency: "WEEKLY", performed_at: zonedToUtc(day, "17:30"), performed_by: radiographers[0], phantom: "ACR-style phantom (demo)",
        overall_result: "NOT_EVALUATED", notes: "Measurements recorded; acceptance thresholds not yet configured (demo).", verified_by: users.supervisor, verified_at: zonedToUtc(day, "18:00"), recorded_by: users.supervisor, is_demo: true });
      for (const pid of qcIds.WEEKLY) await ins(db, "qc_results", { session_id: s.id, parameter_id: pid, value: Math.round((50 + rnd() * 50) * 10) / 10, result: "NOT_EVALUATED" });
    }

    // Maintenance
    await ins(db, "maintenance_schedules", { scanner_id: scanner.id, title: "Quarterly preventive maintenance (vendor)", frequency_days: 90, provider: "GE HealthCare field service", last_done_on: addDays(today, -80), next_due_on: addDays(today, 10) });
    await ins(db, "maintenance_schedules", { scanner_id: scanner.id, title: "Cryogen / helium level check", frequency_days: 30, provider: "GE HealthCare remote monitoring + department", last_done_on: addDays(today, -33), next_due_on: addDays(today, -3) });
    await ins(db, "maintenance_schedules", { scanner_id: scanner.id, title: "Chiller and HVAC inspection", frequency_days: 180, provider: "Hospital biomedical engineering", last_done_on: addDays(today, -40), next_due_on: addDays(today, 140) });
    const bd = addDays(today, -37);
    await ins(db, "maintenance_events", { scanner_id: scanner.id, event_type: "BREAKDOWN", reported_at: zonedToUtc(bd, "10:15"), fault_description: "Gradient amplifier fault – scanner aborted sequences (demo).",
      engineer_name: "Field engineer (demo)", engineer_company: "GE HealthCare", engineer_contact: "Service hotline", downtime_start: zonedToUtc(bd, "10:15"), downtime_end: zonedToUtc(addDays(bd, 1), "15:30"),
      work_done: "Gradient amplifier board replaced; system calibration performed (demo).", parts_replaced: "Gradient amplifier board (demo)", status: "CLOSED",
      rts_by: users.supervisor, rts_at: zonedToUtc(addDays(bd, 1), "16:00"), rts_notes: "Post-repair daily QC passed; test scans reviewed (demo).", created_by: users.radiographer1, is_demo: true });
    await ins(db, "maintenance_events", { scanner_id: scanner.id, event_type: "PREVENTIVE", reported_at: zonedToUtc(addDays(today, -80), "18:00"), engineer_name: "Field engineer (demo)", engineer_company: "GE HealthCare",
      downtime_start: zonedToUtc(addDays(today, -80), "18:00"), downtime_end: zonedToUtc(addDays(today, -80), "22:00"), work_done: "Quarterly PM completed (demo).", status: "CLOSED", created_by: users.supervisor, is_demo: true });

    // Staff roster & attendance (past 30 days, next 14), training, competencies, leave
    let lastNight: string | null = null;
    for (let d = addDays(today, -30); d <= addDays(today, 14); d = addDays(d, 1)) {
      // 24/7 cover: 2 morning, 1 afternoon, 1 night radiographer + on-call; last night's staff never work this morning.
      const order2 = [...radiographers.slice(0, 5)].sort(() => rnd() - 0.5).sort((a, b) => Number(a === lastNight) - Number(b === lastNight));
      const assigned: [string, string][] = [[order2[0], "MORNING"], [order2[1], "MORNING"], [order2[2], "AFTERNOON"], [order2[3], "NIGHT"], [order2[4], "ON_CALL"], [pick(nurses), "MORNING"], [staff["TBH-MRI-009"], "MORNING"], [staff["TBH-MRI-010"], "AFTERNOON"]];
      lastNight = order2[3];
      if (weekday(d) !== 6) assigned.push([staff["TBH-MRI-001"], "MORNING"]);
      for (const [sid, shift] of assigned) {
        await db.query(`INSERT INTO duty_roster (staff_id, duty_date, shift, scanner_id, created_by) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, [sid, d, shift, ["MORNING", "AFTERNOON"].includes(shift) ? scanner.id : null, users.supervisor]);
        if (d < today && shift !== "ON_CALL") {
          const st = chance(0.9) ? "PRESENT" : chance(0.6) ? "LATE" : "ABSENT";
          const ci = st === "ABSENT" ? null : zonedToUtc(d, shift === "MORNING" ? (st === "LATE" ? "07:55" : "07:25") : shift === "NIGHT" ? (st === "LATE" ? "20:20" : "19:55") : (st === "LATE" ? "14:20" : "13:55"));
          await db.query(`INSERT INTO attendance_records (staff_id, work_date, status, clock_in, clock_out, recorded_by) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
            [sid, d, st, ci, ci ? addMin(ci, (shift === "NIGHT" ? 11.5 : 6.5) * 60) : null, users.supervisor]);
        }
      }
    }
    const trainings = [["MRI safety annual update", "MR_SAFETY", 3], ["Basic life support (BLS)", "MANDATORY", 4], ["Contrast reaction management", "MANDATORY", 2], ["SIGNA Creator applications training", "EQUIPMENT", 16], ["Infection prevention and control", "MANDATORY", 2], ["Cardiac MRI CPD webinar", "CPD", 1.5]];
    for (const sid of Object.values(staff)) for (const [title, cat, hrs] of trainings) if (chance(0.6))
      await ins(db, "training_records", { staff_id: sid, title, category: cat, provider: cat === "EQUIPMENT" ? "GE HealthCare applications (demo)" : "The Bank Hospital training unit (demo)", completed_on: addDays(today, -int(5, 330)), expires_on: cat === "CPD" ? null : addDays(today, int(-20, 365)), hours: hrs });
    const comps = ["MRI safety screening", "Contrast injector operation", "Cardiac MRI", "MR Enterography", "Implant verification", "Emergency evacuation of Zone IV", "IV cannulation"];
    for (const sid of radiographers) for (const c of comps.slice(0, 6)) if (chance(0.7))
      await ins(db, "staff_competencies", { staff_id: sid, competency: c, level: sid === radiographers[5] ? "SUPERVISED" : pick(["COMPETENT", "COMPETENT", "TRAINER"]), achieved_on: addDays(today, -int(30, 700)), expires_on: chance(0.3) ? addDays(today, int(-30, 400)) : null, assessed_by: "MRI Supervisor (demo)" });
    for (const sid of nurses) for (const c of ["IV cannulation", "Contrast reaction management", "MRI safety screening"]) await ins(db, "staff_competencies", { staff_id: sid, competency: c, level: "COMPETENT", achieved_on: addDays(today, -int(30, 500)), assessed_by: "Nurse manager (demo)" });
    await ins(db, "leave_records", { staff_id: radiographers[3], leave_type: "ANNUAL", start_date: addDays(today, 20), end_date: addDays(today, 30), status: "REQUESTED", notes: "Annual leave request (demo)" });
    await ins(db, "leave_records", { staff_id: nurses[1], leave_type: "STUDY", start_date: addDays(today, -12), end_date: addDays(today, -10), status: "APPROVED", decided_by: users.supervisor, decided_at: zonedToUtc(addDays(today, -20), "10:00") });

    // Other incidents
    const otherInc = [
      ["NEAR_MISS", "NO_HARM", "Visitor attempted to enter Zone IV with oxygen cylinder; stopped at Zone III door by radiographer (demo).", "CLOSED"],
      ["MRI_SAFETY", "LOW", "Patient found with hairpin after screening; removed before entering scan room (demo).", "ACTION_PLANNED"],
      ["EQUIPMENT_FAILURE", "MODERATE", "Gradient amplifier fault interrupted examination (demo).", "CLOSED"],
      ["FALL", "LOW", "Patient slipped when stepping off table step; no injury (demo).", "UNDER_INVESTIGATION"],
      ["PATIENT", "NO_HARM", "Wrong examination side on request form identified at screening (demo).", "OPEN"],
    ];
    for (const [i, [cat, sev, desc, status]] of otherInc.entries()) {
      const d = addDays(today, -int(2, 80));
      await ins(db, "incidents", { ref_no: `INC-${d.slice(0, 4)}-${String(incSeq++).padStart(4, "0")}`, occurred_at: zonedToUtc(d, `${10 + i}:20`), category: cat, severity: sev, location: "MRI suite", description: desc,
        immediate_action: "Situation made safe; supervisor informed (demo).", status, investigation: status !== "OPEN" ? "Root cause review in progress / completed (demo)." : null,
        corrective_action: status === "CLOSED" ? "Staff briefing and signage reinforced (demo)." : null, closure_notes: status === "CLOSED" ? "Actions verified complete (demo)." : null,
        closed_at: status === "CLOSED" ? zonedToUtc(addDays(d, 7), "12:00") : null, responsible_officer: "MRI Supervisor", reported_by: users.radiographer2, is_demo: true });
    }
    await db.query(`SELECT setval('incident_seq', $1)`, [incSeq + 1]);

    // Cleaning records (past 30 days)
    for (const day of scheduledDays.filter((d) => d <= today && d >= addDays(today, -30))) {
      for (const a of areaIds) {
        const times = a.freq === "BETWEEN_PATIENTS" ? 3 : a.freq === "DAILY" ? 1 : weekday(day) === 5 ? 1 : 0;
        for (let k = 0; k < times; k++) {
          const at = zonedToUtc(day, `${String(8 + k * 3).padStart(2, "0")}:${pick(["05", "20", "45"])}`);
          if (at.getTime() > nowMs) continue;
          const checklist: Record<string, boolean> = {};
          let ok = true;
          for (const item of a.checklist) { const v = chance(0.97); checklist[item] = v; ok = ok && v; }
          await ins(db, "cleaning_records", { area_id: a.id, cleaned_at: at, staff_id: pick([...nurses, ...radiographers.slice(1, 5)]), checklist, compliant: ok, notes: ok ? null : "Item not completed – supplies out of stock (demo).",
            verified_by: day < today ? users.supervisor : null, verified_at: day < today ? addMin(at, 240) : null, recorded_by: users.nurse1, is_demo: true });
        }
      }
    }

    // Demo protocols: structure only – sequence parameters intentionally blank (must be entered from scanner).
    const protoDefs: [string, string, string[]][] = [
      ["BRAIN", "Routine brain", ["3-plane localiser", "Sagittal T1", "Axial T2 FSE", "Axial T2 FLAIR", "Axial DWI", "Axial T2* / SWI"]],
      ["BRAIN", "Brain with contrast", ["3-plane localiser", "Axial T2 FSE", "Axial FLAIR", "Axial DWI", "Axial T1 pre-contrast", "Axial T1 post-contrast", "3D T1 post-contrast"]],
      ["SPINE", "Lumbar spine routine", ["3-plane localiser", "Sagittal T1", "Sagittal T2", "Sagittal STIR", "Axial T2"]],
      ["SPINE", "Cervical spine routine", ["3-plane localiser", "Sagittal T1", "Sagittal T2", "Axial T2*", "Axial T2"]],
      ["MSK", "Knee routine", ["3-plane localiser", "Sagittal PD", "Sagittal PD FS", "Coronal PD FS", "Axial PD FS", "Coronal T1"]],
      ["MSK", "Shoulder routine", ["3-plane localiser", "Coronal oblique PD FS", "Sagittal oblique T2 FS", "Axial PD FS", "Coronal oblique T1"]],
      ["ABDOMEN", "MRCP", ["3-plane localiser", "Coronal SSFSE", "Axial T2 FS respiratory-triggered", "3D MRCP", "Thick-slab radial MRCP", "Axial DWI"]],
      ["ABDOMEN", "Liver with contrast", ["3-plane localiser", "Axial in/out-of-phase", "Axial T2 FS", "Axial DWI", "Dynamic 3D T1 FS pre/post contrast"]],
      ["PELVIS", "Female pelvis", ["3-plane localiser", "Sagittal T2", "Axial T2", "Axial T1", "Axial DWI"]],
      ["CARDIAC", "Cardiac function & LGE", ["Localisers", "Cine SSFP short axis", "Cine 2/3/4 chamber", "T2 STIR", "Late gadolinium enhancement"]],
      ["MRA", "Intracranial MRA (TOF)", ["3-plane localiser", "3D TOF MRA"]],
      ["MRV", "Intracranial MRV", ["3-plane localiser", "2D TOF venogram", "Post-contrast 3D T1 (optional)"]],
      ["SPECIAL", "MR Enterography", ["3-plane localiser", "Coronal SSFSE", "Coronal balanced SSFP", "Axial T2 FS", "Axial DWI", "Dynamic coronal T1 FS post contrast"]],
    ];
    for (const [cat, name, seqs] of protoDefs) {
      const p = await ins(db, "mri_protocols", { lineage_id: (await db.query("SELECT gen_random_uuid() AS u")).rows[0].u, version: 1, scanner_model: "GE SIGNA Creator 1.5T", category: cat, name, kind: "DEPARTMENTAL",
        clinical_indication: "To be completed by the department", positioning: null, coil: null, contrast_requirement: name.toLowerCase().includes("contrast") || cat === "CARDIAC" ? "IV gadolinium – per departmental contrast policy" : "None",
        special_instructions: "DRAFT TEMPLATE (demo): sequence list only. Enter TR/TE/TI/flip angle/slice/FOV/matrix/NEX/bandwidth/ETL/parallel imaging from the approved protocol on the scanner before submitting for approval.",
        status: "DRAFT", change_note: "Initial draft template", created_by: users.supervisor });
      for (const [i, s] of seqs.entries()) await ins(db, "protocol_sequences", { protocol_id: p.id, seq_order: i + 1, name: s });
    }
    await ins(db, "mri_protocols", { lineage_id: (await db.query("SELECT gen_random_uuid() AS u")).rows[0].u, version: 1, scanner_model: "Generic 1.5T", category: "BRAIN", name: "Educational reference – principles of brain MRI weighting",
      kind: "EDUCATIONAL_REFERENCE", clinical_indication: "Teaching use only – NOT an approved departmental protocol", special_instructions: "Educational content. Do not use to set up clinical examinations.", status: "DRAFT", created_by: users.supervisor });

    await db.query(`INSERT INTO audit_logs (action, details) VALUES ('system.seed', $1)`, [JSON.stringify({ demo: true, at: new Date().toISOString() })]);
    await db.query("COMMIT");
    log(`Demo data seeded for ${today}. Users (password '${DEMO_PASSWORD}'): ${Object.keys(users).join(", ")}`);
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    db.release();
  }
}

if (process.argv[1]?.endsWith("seed.ts")) {
  seed({ referenceOnly: process.argv.includes("--reference-only") })
    .then(() => getPool().end())
    .catch((e) => { console.error(e); process.exit(1); });
}
