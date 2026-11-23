// Report builders produce a format-neutral structure rendered to branded PDF or Excel.
import { q } from "@/lib/db";
import { examVolume, utilisation, waitingTimes, pacsKpis, qualitySafety, staffWorkload, DEFINITIONS, type Period } from "./analytics";
import { BODY_REGIONS, INCIDENT_CATEGORIES, labelize } from "@/lib/constants";
import { fmtDate, fmtDateTime, fmtMinutes, fmtTime, minutesBetween, zonedToUtc, dayBounds, ageFromDob } from "@/lib/time";
import type { Permission } from "@/lib/rbac";

export interface Section { heading: string; kpis?: [string, string | number][]; table?: { columns: string[]; rows: (string | number | null)[][] }; note?: string }
export interface Report { title: string; subtitle: string; sections: Section[]; confidential?: boolean }

const pct = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${v.toFixed(1)}%`);
const n1 = (v: number | null | undefined) => (v === null || v === undefined ? "—" : v.toFixed(1));

export const REPORTS: Record<string, { label: string; perm: Permission[]; build: (p: Period & { date?: string }) => Promise<Report> }> = {
  monthly: { label: "Departmental performance report", perm: ["analytics.view"], build: departmental },
  register: { label: "Daily examination register", perm: ["scanning.perform", "pacs.view", "analytics.view"], build: register },
  pacs: { label: "PACS upload performance report", perm: ["pacs.view"], build: pacsReport },
  contrast: { label: "Contrast media usage report", perm: ["contrast.view"], build: contrastReport },
  incidents: { label: "Incident report", perm: ["incidents.view"], build: incidentReport },
  cleaning: { label: "Cleaning & infection-control compliance", perm: ["cleaning.view"], build: cleaningReport },
  qc: { label: "Equipment QC report", perm: ["qc.view"], build: qcReport },
  staff: { label: "Staff operational report", perm: ["analytics.view"], build: staffReport },
  volume: { label: "Examination volume report", perm: ["analytics.view"], build: volumeReport },
  appointments: { label: "Appointment list", perm: ["appointments.view"], build: appointmentList },
};

const period = (p: Period) => `${fmtDate(p.from)} – ${fmtDate(new Date(zonedToUtc(p.to).getTime() - 1))}`;

async function departmental(p: Period): Promise<Report> {
  const [v, u, w, k, qs, staff] = await Promise.all([examVolume(p), utilisation(p), waitingTimes(p), pacsKpis(p), qualitySafety(p), staffWorkload(p)]);
  const t = v.totals;
  return {
    title: "MRI Departmental Performance Report", subtitle: period(p),
    sections: [
      { heading: "Examination volume", kpis: [["Examinations performed", t.total], ["Completed (PACS confirmed)", t.completed], ["Incomplete", t.incomplete], ["Contrast", t.contrast], ["Non-contrast", t.non_contrast], ["Inpatient", t.inpatient], ["Outpatient", t.outpatient], ["Emergency", t.emergency]],
        table: { columns: ["Body region", "Examinations"], rows: v.byRegion.map((r: any) => [BODY_REGIONS[r.key] ?? r.key, r.n]) } },
      { heading: "Examinations by referring department", table: { columns: ["Department", "Examinations"], rows: v.byDept.map((r: any) => [r.key, r.n]) } },
      { heading: "Scanner utilisation", note: `${DEFINITIONS.utilisation} ${DEFINITIONS.availableHours}`,
        table: { columns: ["Scanner", "Available h", "Scanning h", "Utilisation", "Exams", "Exams/day", "Avg duration", "Downtime h", "Idle h"],
          rows: u.scanners.map((s) => [s.scanner, n1(s.availableHours), n1(s.scanningHours), pct(s.utilisationPct), s.examinations, n1(s.examsPerOperatingDay), fmtMinutes(s.avgExamMinutes), n1(s.downtimeHours), n1(s.idleHours)]) } },
      { heading: "Patient waiting times", kpis: [["Booking lead time (days)", n1(w.booking_lead_days)], ["Arrival → screening", fmtMinutes(w.arrival_to_screening)], ["Screening → scan", fmtMinutes(w.screening_to_scan)], ["Total journey", fmtMinutes(w.journey)], ["Delayed starts", w.delayed], ["No-shows", w.no_shows], ["Cancellations", w.cancellations]] },
      { heading: "PACS upload performance", note: `${DEFINITIONS.pacsSuccess} ${DEFINITIONS.pacsTime} Uploads are confirmed manually (PACS integration not connected).`,
        kpis: [["Completed examinations", k.completedExams], ["Successfully uploaded", k.success], ["Failed", k.failed], ["Pending", k.pending], ["Requires investigation", k.investigation], ["Success rate", pct(k.successRate)], ["Failure rate", pct(k.failureRate)], ["Avg scan → upload", fmtMinutes(k.avg_minutes)]] },
      { heading: "Quality & safety", kpis: [["Screening compliance", pct(qs.screening.compliancePct)], ["Contrast administrations", qs.contrast.administrations], ["Contrast reactions", qs.contrast.reactions], ["Extravasations", qs.contrast.extravasations], ["Incomplete examinations", qs.scans.incomplete], ["Repeat sequences", qs.scans.repeats], ["Safety incidents", qs.incidentTotal], ["Infection-control compliance", pct(qs.cleaning.compliancePct)], ...qs.qc.map((x: any) => [`Daily QC compliance – ${x.scanner}`, pct(x.compliancePct)] as [string, string])] },
      { heading: "Staff workload (context, not ranking)", table: { columns: ["Staff", "Exams", "Complex", "Scan h", "Shifts", "Rostered h", "Exams/rostered h", "Present/Late/Absent"],
        rows: staff.filter((s: any) => s.exams || s.shifts).map((s: any) => [s.name, s.exams, s.complex_exams, n1(s.scan_hours), s.shifts, n1(s.rosteredHours), s.examsPerRosteredHour?.toFixed(2) ?? "—", `${s.present}/${s.late}/${s.absent}`]) } },
    ],
  };
}

async function register(p: Period & { date?: string }): Promise<Report> {
  const date = p.date ?? p.from;
  const [s, e] = dayBounds(date);
  const rows = await q(`SELECT a.accession_no, a.status, a.patient_type, a.contrast, a.referring_department, p.full_name, p.mrn, p.dob::text AS dob, p.sex, e.name AS exam, a.body_region, st.full_name AS rad, sr.started_at, sr.ended_at, pu.status AS pacs
      FROM appointments a JOIN patients p ON p.id=a.patient_id JOIN exam_types e ON e.id=a.exam_type_id LEFT JOIN staff st ON st.id=a.radiographer_id LEFT JOIN scan_records sr ON sr.appointment_id=a.id LEFT JOIN pacs_uploads pu ON pu.appointment_id=a.id
      WHERE a.scheduled_start >= $1 AND a.scheduled_start < $2 ORDER BY a.scheduled_start`, [s, e]);
  return { title: "Daily MRI Examination Register", subtitle: fmtDate(date), confidential: true, sections: [{ heading: `${rows.length} appointment(s)`, table: {
    columns: ["Accession", "Patient", "MRN", "Age/Sex", "Examination", "Region", "C+", "Referrer", "Radiographer", "Scan", "PACS", "Status"],
    rows: rows.map((r) => [r.accession_no, r.full_name, r.mrn, `${ageFromDob(r.dob)}/${r.sex[0]}`, r.exam, BODY_REGIONS[r.body_region], r.contrast ? "Yes" : "", r.referring_department, r.rad, r.started_at ? `${fmtTime(r.started_at)}–${fmtTime(r.ended_at)}` : "", labelize(r.pacs), labelize(r.status)]) } }] };
}

async function pacsReport(p: Period): Promise<Report> {
  const k = await pacsKpis(p);
  const ex = await q(`SELECT a.accession_no, e.name AS exam, sr.ended_at, pu.status, pu.failure_reason, pu.corrective_action, st.full_name FROM pacs_uploads pu JOIN appointments a ON a.id=pu.appointment_id JOIN exam_types e ON e.id=a.exam_type_id
      JOIN scan_records sr ON sr.id=pu.scan_record_id JOIN staff st ON st.id=sr.radiographer_id WHERE pu.status <> 'SUCCESSFULLY_UPLOADED' OR pu.verification_status <> 'VERIFIED' ORDER BY sr.ended_at`);
  return { title: "PACS Upload Performance Report", subtitle: period(p), sections: [
    { heading: "Key indicators", note: "Statuses recorded by manual staff confirmation – PACS integration not connected.", kpis: [["Completed examinations", k.completedExams], ["Successfully uploaded", k.success], ["Confirmed", k.verified], ["Failed", k.failed], ["Pending", k.pending], ["Requires investigation", k.investigation], ["Success rate", pct(k.successRate)], ["Failure rate", pct(k.failureRate)], ["Avg scan → upload", fmtMinutes(k.avg_minutes)]] },
    { heading: "Daily trend", table: { columns: ["Date", "Total", "Uploaded", "Pending", "Failed"], rows: k.daily.map((d: any) => [d.bucket, d.total, d.success, d.pending, d.failed]) } },
    { heading: "By radiographer", table: { columns: ["Radiographer", "Total", "Uploaded", "Failed", "Pending", "Avg time"], rows: k.byRadiographer.map((r: any) => [r.radiographer, r.total, r.success, r.failed, r.pending, fmtMinutes(r.avg_minutes)]) } },
    { heading: "Outstanding exceptions (all dates)", table: { columns: ["Accession", "Examination", "Scan ended", "Status", "Reason", "Corrective action", "Radiographer"], rows: ex.map((r) => [r.accession_no, r.exam, fmtDateTime(r.ended_at), labelize(r.status), r.failure_reason, r.corrective_action, r.full_name]) } },
  ] };
}

async function contrastReport(p: Period): Promise<Report> {
  const [f, t] = [zonedToUtc(p.from), zonedToUtc(p.to)];
  const byAgent = await q(`SELECT ag.name, count(*)::int AS n, sum(dose_ml) AS ml, count(*) FILTER (WHERE adverse_reaction)::int AS r, count(*) FILTER (WHERE extravasation)::int AS x FROM contrast_administrations ca JOIN contrast_agents ag ON ag.id=ca.agent_id WHERE administered_at >= $1 AND administered_at < $2 GROUP BY 1`, [f, t]);
  const byExam = await q(`SELECT e.name, count(*)::int AS n, sum(ca.dose_ml) AS ml FROM contrast_administrations ca JOIN appointments a ON a.id=ca.appointment_id JOIN exam_types e ON e.id=a.exam_type_id WHERE administered_at >= $1 AND administered_at < $2 GROUP BY 1 ORDER BY 3 DESC`, [f, t]);
  const stock = await q(`SELECT ag.name, b.batch_no, b.expiry_date::text AS exp, b.current_stock FROM contrast_batches b JOIN contrast_agents ag ON ag.id=b.agent_id WHERE b.current_stock > 0 ORDER BY ag.name, b.expiry_date`);
  return { title: "Contrast Media Usage Report", subtitle: period(p), sections: [
    { heading: "By agent", table: { columns: ["Agent", "Administrations", "Total mL", "Reactions", "Extravasations"], rows: byAgent.map((r) => [r.name, r.n, n1(r.ml), r.r, r.x]) } },
    { heading: "Consumption by examination", table: { columns: ["Examination", "Administrations", "Total mL", "Mean mL"], rows: byExam.map((r) => [r.name, r.n, n1(r.ml), n1(r.ml / r.n)]) } },
    { heading: "Current stock by batch", table: { columns: ["Agent", "Batch", "Expiry", "Stock (mL)"], rows: stock.map((r) => [r.name, r.batch_no, fmtDate(r.exp), r.current_stock]) } },
  ] };
}

async function incidentReport(p: Period): Promise<Report> {
  const rows = await q(`SELECT ref_no, occurred_at, category, severity, status, description, corrective_action FROM incidents WHERE occurred_at >= $1 AND occurred_at < $2 ORDER BY occurred_at`, [zonedToUtc(p.from), zonedToUtc(p.to)]);
  const byCat: Record<string, number> = {};
  for (const r of rows) byCat[r.category] = (byCat[r.category] ?? 0) + 1;
  return { title: "MRI Incident & Safety Report", subtitle: period(p), confidential: true, sections: [
    { heading: "Summary", kpis: [["Incidents", rows.length], ["Open", rows.filter((r) => r.status !== "CLOSED").length], ["Severe / critical", rows.filter((r) => ["SEVERE", "CRITICAL"].includes(r.severity)).length], ...Object.entries(byCat).map(([k, n]) => [INCIDENT_CATEGORIES[k], n] as [string, number])] },
    { heading: "Incident log", table: { columns: ["Ref", "Occurred", "Category", "Severity", "Status", "Description", "Corrective action"], rows: rows.map((r) => [r.ref_no, fmtDateTime(r.occurred_at), INCIDENT_CATEGORIES[r.category], labelize(r.severity), labelize(r.status), r.description, r.corrective_action]) } },
  ] };
}

async function cleaningReport(p: Period): Promise<Report> {
  const rows = await q(`SELECT a.name, count(*)::int AS n, count(*) FILTER (WHERE compliant)::int AS ok, count(*) FILTER (WHERE verified_at IS NOT NULL)::int AS v FROM cleaning_records c JOIN cleaning_areas a ON a.id=c.area_id WHERE cleaned_at >= $1 AND cleaned_at < $2 GROUP BY a.name, a.sort_order ORDER BY a.sort_order`, [zonedToUtc(p.from), zonedToUtc(p.to)]);
  const nc = await q(`SELECT c.cleaned_at, a.name, c.notes, st.full_name FROM cleaning_records c JOIN cleaning_areas a ON a.id=c.area_id JOIN staff st ON st.id=c.staff_id WHERE NOT compliant AND cleaned_at >= $1 AND cleaned_at < $2 ORDER BY cleaned_at`, [zonedToUtc(p.from), zonedToUtc(p.to)]);
  const tot = rows.reduce((a, r) => a + r.n, 0), ok = rows.reduce((a, r) => a + r.ok, 0);
  return { title: "Cleaning & Infection Control Compliance Report", subtitle: period(p), sections: [
    { heading: "Summary", kpis: [["Records", tot], ["Compliant", ok], ["Compliance", pct(tot ? (ok / tot) * 100 : null)]], note: DEFINITIONS.cleaningCompliance },
    { heading: "By area", table: { columns: ["Area", "Records", "Compliant", "Compliance", "Verified"], rows: rows.map((r) => [r.name, r.n, r.ok, pct(r.n ? (r.ok / r.n) * 100 : null), r.v]) } },
    { heading: "Non-compliant records", table: { columns: ["Time", "Area", "Staff", "Notes"], rows: nc.map((r) => [fmtDateTime(r.cleaned_at), r.name, r.full_name, r.notes]) } },
  ] };
}

async function qcReport(p: Period): Promise<Report> {
  const qs = await qualitySafety(p);
  const rows = await q(`SELECT s.performed_at, sc.name, s.frequency, s.overall_result, st.full_name, s.corrective_action, s.verified_at FROM qc_sessions s JOIN scanners sc ON sc.id=s.scanner_id JOIN staff st ON st.id=s.performed_by WHERE performed_at >= $1 AND performed_at < $2 ORDER BY performed_at`, [zonedToUtc(p.from), zonedToUtc(p.to)]);
  return { title: "Equipment Quality Control Report", subtitle: period(p), sections: [
    { heading: "Compliance", note: DEFINITIONS.qcCompliance, table: { columns: ["Scanner", "Operating days", "Days with daily QC", "Compliance", "Sessions", "Failures", "Verified"], rows: qs.qc.map((x: any) => [x.scanner, x.operatingDays, x.daysWithDailyQc, pct(x.compliancePct), x.sessions, x.fails, x.verified]) } },
    { heading: "QC sessions", table: { columns: ["Performed", "Scanner", "Frequency", "Result", "By", "Corrective action", "Verified"], rows: rows.map((r) => [fmtDateTime(r.performed_at), r.name, labelize(r.frequency), labelize(r.overall_result), r.full_name, r.corrective_action, r.verified_at ? "Yes" : "No"]) } },
  ] };
}

async function staffReport(p: Period): Promise<Report> {
  const s = await staffWorkload(p);
  return { title: "Staff Operational Report", subtitle: period(p), sections: [{ heading: "Workload, attendance and training", note: "Context for workload review – not a ranking.", table: {
    columns: ["Staff", "Designation", "Exams", "Contrast", "Complex", "Scan h", "Shifts", "On-call", "Rostered h", "Present", "Late", "Absent", "Training", "Competencies"],
    rows: s.map((r: any) => [r.name, r.designation, r.exams, r.contrast_exams, r.complex_exams, n1(r.scan_hours), r.shifts, r.onCall, n1(r.rosteredHours), r.present, r.late, r.absent, r.trainingCount, r.competencies]) } }] };
}

async function volumeReport(p: Period): Promise<Report> {
  const v = await examVolume(p);
  return { title: "Examination Volume Report", subtitle: period(p), sections: [
    { heading: "Daily", table: { columns: ["Date", "Examinations", "Contrast"], rows: v.byDay.map((d: any) => [d.day, d.n, d.contrast]) } },
    { heading: "By examination", table: { columns: ["Examination", "Count"], rows: v.byExam.map((r: any) => [r.key, r.n]) } },
    { heading: "By referring department", table: { columns: ["Department", "Count"], rows: v.byDept.map((r: any) => [r.key, r.n]) } },
  ] };
}

async function appointmentList(p: Period & { date?: string }): Promise<Report> {
  const date = p.date ?? p.from;
  const [s, e] = dayBounds(date);
  const rows = await q(`SELECT a.scheduled_start, a.accession_no, p.full_name, p.mrn, p.phone, e.name AS exam, a.priority, a.contrast, a.status FROM appointments a JOIN patients p ON p.id=a.patient_id JOIN exam_types e ON e.id=a.exam_type_id
      WHERE a.scheduled_start >= $1 AND a.scheduled_start < $2 AND a.status <> 'CANCELLED' ORDER BY a.scheduled_start`, [s, e]);
  return { title: "MRI Appointment List", subtitle: fmtDate(date), confidential: true, sections: [{ heading: `${rows.length} appointment(s)`, table: { columns: ["Time", "Accession", "Patient", "MRN", "Phone", "Examination", "Priority", "Contrast", "Status"],
    rows: rows.map((r) => [fmtTime(r.scheduled_start), r.accession_no, r.full_name, r.mrn, r.phone, r.exam, labelize(r.priority), r.contrast ? "Yes" : "", labelize(r.status)]) } }] };
}
