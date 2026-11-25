// Appointment audit trail – rows are written automatically by the `appointments_audit_trail`
// database trigger (migration 003). This module only reads and formats them.
import { q } from "@/lib/db";
import { fmtDateTime, zonedToUtc } from "@/lib/time";
import { BODY_REGIONS, labelize } from "@/lib/constants";

export const FIELD_LABELS: Record<string, string> = {
  accession_no: "Accession", patient_id: "Patient", exam_type_id: "Examination", body_region: "Body region", clinical_indication: "Clinical indication",
  referring_doctor: "Referring doctor", referring_department: "Referring department", patient_type: "Patient type", contrast: "Contrast",
  priority: "Priority", preferred_date: "Preferred date", scheduled_start: "Scheduled start", scheduled_end: "Scheduled end", scanner_id: "Scanner",
  radiographer_id: "Radiographer", notes: "Notes", status: "Status", screening_status: "Safety screening", prep_status: "Preparation",
  arrived_at: "Arrival time", arrival_received_by: "Arrival received by", identity_verified: "Identity verified", identity_method: "Identity method",
  completed_at: "Completed at", cancelled_at: "Cancelled at", cancel_reason: "Cancellation reason", no_show_at: "No-show recorded",
  reminder_at: "Reminder at", reminder_by: "Reminder by", reminder_note: "Reminder note", reschedule_count: "Times rescheduled", booked_by: "Booked by",
};
const HIDDEN = new Set(["id", "hospital_id", "updated_at", "is_demo", "created_at"]);
const CREATE_SUMMARY = ["accession_no", "patient_id", "exam_type_id", "scheduled_start", "scanner_id", "priority", "contrast", "referring_doctor", "referring_department", "radiographer_id", "status"];

export interface Lookups { scanners: Map<string, string>; staff: Map<string, string>; exams: Map<string, string>; users: Map<string, string>; patients: Map<string, string> }

export async function loadLookups(patientIds: string[] = []): Promise<Lookups> {
  const [sc, st, ex, us, pt] = await Promise.all([
    q(`SELECT id, name FROM scanners`), q(`SELECT id, full_name AS name FROM staff`), q(`SELECT id, name FROM exam_types`), q(`SELECT id, full_name AS name FROM users`),
    patientIds.length ? q(`SELECT id, full_name || ' (' || mrn || ')' AS name FROM patients WHERE id = ANY($1)`, [patientIds]) : Promise.resolve([]),
  ]);
  const m = (rows: any[]) => new Map(rows.map((r) => [r.id, r.name]));
  return { scanners: m(sc), staff: m(st), exams: m(ex), users: m(us), patients: m(pt) };
}

export function formatValue(field: string, v: unknown, lk: Lookups): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  const s = String(v);
  switch (field) {
    case "scanner_id": return lk.scanners.get(s) ?? s;
    case "radiographer_id": return lk.staff.get(s) ?? s;
    case "exam_type_id": return lk.exams.get(s) ?? s;
    case "booked_by": case "arrival_received_by": case "reminder_by": return lk.users.get(s) ?? s;
    case "patient_id": return lk.patients.get(s) ?? "(patient record)";
    case "body_region": return BODY_REGIONS[s] ?? s;
    case "status": case "screening_status": case "prep_status": case "priority": case "patient_type": return labelize(s);
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return fmtDateTime(s);
  return s;
}

export interface Change { field: string; label: string; from: string; to: string }
export function describeChanges(row: any, lk: Lookups): Change[] {
  if (row.operation === "UPDATED") {
    return Object.entries(row.changed_fields ?? {}).filter(([k]) => !HIDDEN.has(k))
      .map(([k, v]: [string, any]) => ({ field: k, label: FIELD_LABELS[k] ?? labelize(k), from: formatValue(k, v.from, lk), to: formatValue(k, v.to, lk) }));
  }
  const snap = row.snapshot ?? {};
  return CREATE_SUMMARY.filter((k) => snap[k] !== null && snap[k] !== undefined && snap[k] !== "")
    .map((k) => ({ field: k, label: FIELD_LABELS[k], from: "", to: formatValue(k, snap[k], lk) }));
}

export interface AuditFilter { appointmentId?: string; from?: string; to?: string; user?: string; term?: string; operation?: string; limit?: number; offset?: number }
export async function getAppointmentAudit(f: AuditFilter) {
  const where: string[] = [], p: unknown[] = [];
  const add = (sql: string, v: unknown) => { p.push(v); where.push(sql.replaceAll("?", `$${p.length}`)); };
  if (f.appointmentId) add("aa.appointment_id = ?", f.appointmentId);
  if (f.from) add("aa.at >= ?", zonedToUtc(f.from));
  if (f.to) add("aa.at < ?", zonedToUtc(f.to));
  if (f.user) add("aa.changed_by_name ILIKE ?", `%${f.user}%`);
  if (f.operation) add("aa.operation = ?", f.operation);
  if (f.term) add("(aa.accession_no ILIKE ? OR p.mrn ILIKE ? OR p.full_name ILIKE ?)", `%${f.term}%`);
  p.push(f.limit ?? 200, f.offset ?? 0);
  return q(`SELECT aa.*, p.full_name, p.mrn FROM appointment_audit aa LEFT JOIN patients p ON p.id = aa.patient_id
      ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY aa.at ${f.appointmentId ? "ASC" : "DESC"}, aa.id LIMIT $${p.length - 1} OFFSET $${p.length}`, p);
}

/** Human summary of what an entry did, e.g. "Status: Booked → Arrived". */
export function headline(row: any, changes: Change[]): string {
  if (row.operation === "CREATED") return "Appointment created";
  if (row.operation === "DELETED") return "Appointment record deleted";
  const st = changes.find((c) => c.field === "status");
  if (st) return `Status: ${st.from} → ${st.to}`;
  if (changes.some((c) => c.field === "scheduled_start" || c.field === "scanner_id")) return "Rescheduled";
  return `${changes.length} field(s) changed`;
}
export const actorLabel = (row: any) => row.changed_by_name ? `${row.changed_by_name}${row.changed_by_role ? ` (${row.changed_by_role})` : ""}` : "Unattributed";
