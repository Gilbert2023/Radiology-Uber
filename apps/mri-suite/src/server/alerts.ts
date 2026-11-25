// Operational alerts – computed live from the database on every request so they can never drift
// from the underlying records. Thresholds come from System Settings.
import { q } from "@/lib/db";
import { localDate, addDays, fmtTime, fmtMinutes, minutesBetween, dayBounds } from "@/lib/time";
import { getSettings } from "./settings";

export type AlertSeverity = "critical" | "warning" | "info";
export interface Alert { id: string; severity: AlertSeverity; category: string; title: string; detail: string; href: string; at?: string }

export async function computeAlerts(opts: { mask?: boolean } = {}): Promise<Alert[]> {
  const s = await getSettings();
  const today = localDate();
  const [dayStart, dayEnd] = dayBounds(today);
  const alerts: Alert[] = [];
  const who = (r: any) => (opts.mask ? `${r.mrn?.slice(-4) ? "MRN …" + String(r.mrn).slice(-4) : "Patient"}` : `${r.full_name} (${r.mrn})`);

  const active = await q(
    `SELECT a.id, a.accession_no, a.status, a.screening_status, a.prep_status, a.arrived_at, a.scheduled_start, p.full_name, p.mrn, e.name AS exam
       FROM appointments a JOIN patients p ON p.id=a.patient_id JOIN exam_types e ON e.id=a.exam_type_id
      WHERE a.scheduled_start >= $1 AND a.scheduled_start < $2 AND a.status IN ('BOOKED','ARRIVED','SCREENING','PREPARATION','CLEARED')`, [dayStart, dayEnd]);
  for (const r of active) {
    if (r.status === "BOOKED" && minutesBetween(r.scheduled_start) > s.lateGraceMinutes)
      alerts.push({ id: `overdue-${r.id}`, severity: "warning", category: "Overdue appointment", title: `${who(r)} not yet arrived`,
        detail: `${r.exam} booked ${fmtTime(r.scheduled_start)} – ${fmtMinutes(minutesBetween(r.scheduled_start))} overdue`, href: `/appointments/${r.id}` });
    if (r.status !== "BOOKED" && r.arrived_at) {
      const waited = minutesBetween(r.arrived_at);
      if (waited >= s.waitAlertMinutes)
        alerts.push({ id: `wait-${r.id}`, severity: waited >= s.waitAlertMinutes * 2 ? "critical" : "warning", category: "Long waiting time",
          title: `${who(r)} waiting ${fmtMinutes(waited)}`, detail: `${r.exam} – arrived ${fmtTime(r.arrived_at)}`, href: `/appointments/${r.id}` });
      if (r.screening_status === "NOT_CLEARED")
        alerts.push({ id: `nc-${r.id}`, severity: "critical", category: "MRI safety", title: `${who(r)} NOT CLEARED for MRI`, detail: `${r.exam} – decision required (rebook/cancel)`, href: `/appointments/${r.id}#screening` });
      else if (r.screening_status !== "CLEAR" && waited >= 15)
        alerts.push({ id: `scr-${r.id}`, severity: "warning", category: "Incomplete safety screening", title: `${who(r)} screening ${r.screening_status === "PENDING" ? "pending decision" : "not started"}`,
          detail: `${r.exam} – arrived ${fmtTime(r.arrived_at)}`, href: `/appointments/${r.id}#screening` });
      if (r.screening_status === "CLEAR" && r.prep_status !== "COMPLETE" && minutesBetween(r.scheduled_start) > 0)
        alerts.push({ id: `prep-${r.id}`, severity: "warning", category: "Incomplete preparation", title: `${who(r)} preparation incomplete`, detail: `${r.exam} – slot was ${fmtTime(r.scheduled_start)}`, href: `/appointments/${r.id}#preparation` });
    }
  }

  const pacs = await q(
    `SELECT pu.id, pu.status, pu.verification_status, pu.failure_reason, sr.ended_at, pu.completed_at, a.id AS appt_id, a.accession_no, p.full_name, p.mrn
       FROM pacs_uploads pu JOIN scan_records sr ON sr.id=pu.scan_record_id JOIN appointments a ON a.id=pu.appointment_id JOIN patients p ON p.id=a.patient_id
      WHERE pu.status <> 'SUCCESSFULLY_UPLOADED' OR pu.verification_status <> 'VERIFIED'`);
  for (const r of pacs) {
    if (r.status === "UPLOAD_FAILED")
      alerts.push({ id: `pf-${r.id}`, severity: "critical", category: "PACS upload failed", title: `${r.accession_no} upload failed`, detail: r.failure_reason || "No reason recorded", href: `/pacs?focus=${r.id}` });
    else if (r.status === "REQUIRES_INVESTIGATION")
      alerts.push({ id: `pi-${r.id}`, severity: "critical", category: "PACS investigation", title: `${r.accession_no} requires investigation`, detail: r.failure_reason || "See PACS record", href: `/pacs?focus=${r.id}` });
    else if (["PENDING_UPLOAD", "UPLOADING"].includes(r.status) && r.ended_at && minutesBetween(r.ended_at) > s.pacsPendingAlertMinutes)
      alerts.push({ id: `pp-${r.id}`, severity: "warning", category: "PACS upload pending", title: `${r.accession_no} pending ${fmtMinutes(minutesBetween(r.ended_at))}`, detail: `Threshold ${s.pacsPendingAlertMinutes} min after scan completion`, href: `/pacs?focus=${r.id}` });
    else if (r.status === "SUCCESSFULLY_UPLOADED" && r.verification_status !== "VERIFIED" && r.completed_at && minutesBetween(r.completed_at) > s.pacsPendingAlertMinutes)
      alerts.push({ id: `pv-${r.id}`, severity: "info", category: "PACS confirmation", title: `${r.accession_no} upload awaiting confirmation`, detail: "Confirm images are visible in PACS to complete the examination", href: `/pacs?focus=${r.id}` });
  }

  const scanners = await q(`SELECT id, name, status, status_note FROM scanners WHERE is_active AND status IN ('MAINTENANCE','UNAVAILABLE')`);
  for (const r of scanners)
    alerts.push({ id: `sc-${r.id}`, severity: "critical", category: "Equipment downtime", title: `${r.name} ${r.status === "MAINTENANCE" ? "under maintenance" : "unavailable"}`, detail: r.status_note || "", href: `/maintenance` });

  const qcFails = await q(
    `SELECT DISTINCT ON (s.scanner_id) s.id, s.overall_result, s.performed_at, sc.name FROM qc_sessions s JOIN scanners sc ON sc.id=s.scanner_id
      WHERE s.performed_at > now() - interval '14 days' ORDER BY s.scanner_id, s.performed_at DESC`);
  for (const r of qcFails) if (r.overall_result === "FAIL")
    alerts.push({ id: `qc-${r.id}`, severity: "critical", category: "QC failure", title: `${r.name}: latest QC failed`, detail: `Recorded ${fmtTime(r.performed_at)} ${localDate(r.performed_at)}`, href: `/qc` });
  const unverifiedQc = await q(`SELECT count(*)::int AS n FROM qc_sessions WHERE verified_at IS NULL AND performed_at > now() - interval '30 days'`);
  if (unverifiedQc[0].n) alerts.push({ id: "qc-unverified", severity: "info", category: "QC verification", title: `${unverifiedQc[0].n} QC session(s) awaiting supervisor verification`, detail: "Last 30 days", href: "/qc" });
  const hours = s.operatingHours[String(new Date(today + "T12:00:00Z").getUTCDay())];
  if (hours) {
    const dailyDone = await q(`SELECT sc.name FROM scanners sc WHERE sc.is_active AND NOT EXISTS (SELECT 1 FROM qc_sessions s WHERE s.scanner_id=sc.id AND s.frequency='DAILY' AND s.performed_at >= $1)`, [dayStart]);
    for (const r of dailyDone) alerts.push({ id: `qcd-${r.name}`, severity: "info", category: "Daily QC", title: `${r.name}: daily QC not yet recorded today`, detail: "", href: "/qc" });
  }

  const maint = await q(`SELECT ms.id, ms.title, ms.next_due_on::text AS due, sc.name FROM maintenance_schedules ms JOIN scanners sc ON sc.id=ms.scanner_id WHERE ms.is_active AND ms.next_due_on <= $1::date`, [addDays(today, s.maintenanceDueDays)]);
  for (const r of maint)
    alerts.push({ id: `pm-${r.id}`, severity: r.due < today ? "critical" : "warning", category: "Maintenance due", title: `${r.name}: ${r.title}`, detail: r.due < today ? `Overdue since ${r.due}` : `Due ${r.due}`, href: "/maintenance" });

  const stock = await q(
    `SELECT ag.id, ag.name, ag.reorder_level, ag.unit, COALESCE(sum(b.current_stock) FILTER (WHERE b.expiry_date >= current_date),0) AS stock
       FROM contrast_agents ag LEFT JOIN contrast_batches b ON b.agent_id=ag.id WHERE ag.is_active GROUP BY ag.id`);
  for (const r of stock) if (r.stock <= r.reorder_level)
    alerts.push({ id: `ls-${r.id}`, severity: r.stock === 0 ? "critical" : "warning", category: "Contrast low stock", title: `${r.name}: ${r.stock} ${r.unit} in date`, detail: `Reorder level ${r.reorder_level} ${r.unit}`, href: "/contrast" });
  const expiring = await q(`SELECT b.id, b.batch_no, b.expiry_date::text AS exp, b.current_stock, ag.name FROM contrast_batches b JOIN contrast_agents ag ON ag.id=b.agent_id
                             WHERE b.current_stock > 0 AND b.expiry_date <= $1::date`, [addDays(today, s.contrastExpiryDays)]);
  for (const r of expiring)
    alerts.push({ id: `ex-${r.id}`, severity: r.exp < today ? "critical" : "warning", category: "Contrast expiry", title: `${r.name} batch ${r.batch_no} ${r.exp < today ? "EXPIRED" : "expiring"}`, detail: `${r.exp} – ${r.current_stock} mL remaining`, href: "/contrast" });

  const inc = await q(`SELECT id, ref_no, category, severity FROM incidents WHERE status <> 'CLOSED' AND severity IN ('SEVERE','CRITICAL')`);
  for (const r of inc) alerts.push({ id: `inc-${r.id}`, severity: "critical", category: "Open serious incident", title: `${r.ref_no} (${r.severity.toLowerCase()})`, detail: r.category.replace(/_/g, " ").toLowerCase(), href: `/incidents/${r.id}` });

  const order = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}
