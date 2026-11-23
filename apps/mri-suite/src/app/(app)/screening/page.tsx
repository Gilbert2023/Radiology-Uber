import Link from "next/link";
import { ShieldCheck, ShieldAlert, Cpu, ShieldX } from "lucide-react";
import { requireActor } from "@/server/auth";
import { q } from "@/lib/db";
import { APPT_SELECT } from "@/server/queries";
import { getSettings } from "@/server/settings";
import { PageHeader, Card, StatCard, Notice, MapBadge } from "@/components/ui";
import { WorkTable } from "@/components/WorkTable";
import { AutoRefresh } from "@/components/client/misc";
import { displayStatus } from "@/lib/status";
import { dayBounds, localDate, fmtDateTime } from "@/lib/time";
import { ASSESSMENT_DECISION, SAFETY_CLASS } from "@/lib/constants";

export const metadata = { title: "MRI Safety Screening" };

export default async function ScreeningQueue() {
  const actor = await requireActor("screening.view");
  const settings = await getSettings();
  const [s, e] = dayBounds(localDate());
  const rows = (await q(`${APPT_SELECT} WHERE a.status IN ('ARRIVED','SCREENING','PREPARATION','CLEARED') OR (a.scheduled_start >= $1 AND a.scheduled_start < $2) ORDER BY a.scheduled_start`, [s, e]))
    .map((r) => ({ ...r, ds: displayStatus(r, settings) }));
  const awaiting = rows.filter((r) => ["ARRIVED", "SCREENING"].includes(r.status) && r.screening_status !== "NOT_CLEARED");
  const notCleared = rows.filter((r) => r.screening_status === "NOT_CLEARED" && !["CANCELLED"].includes(r.status));
  const cleared = rows.filter((r) => r.screening_status === "CLEAR");
  const pendingAssess = await q(`SELECT ia.id, ia.decision, a.id AS appt_id, a.accession_no, p.full_name, p.mrn, pi.device_name, pi.safety_class, a.scheduled_start
      FROM implant_assessments ia JOIN appointments a ON a.id=ia.appointment_id JOIN patients p ON p.id=a.patient_id JOIN patient_implants pi ON pi.id=ia.implant_id
     WHERE ia.decision IN ('PENDING','DEFER_SPECIALIST') AND a.status IN ('ARRIVED','SCREENING','PREPARATION','CLEARED','BOOKED') ORDER BY a.scheduled_start`);
  const compliance = await q(`SELECT count(*)::int AS scans, count(*) FILTER (WHERE ss.status='CLEAR' AND ss.decision_at <= sr.started_at)::int AS ok
      FROM scan_records sr LEFT JOIN safety_screenings ss ON ss.appointment_id=sr.appointment_id WHERE sr.started_at > now() - interval '30 days'`);
  const showNames = actor.permissions.has("patients.view");
  return (
    <div>
      <PageHeader title="MRI Safety Screening" icon={ShieldCheck} description="Electronic MRI safety questionnaire, implant assessment and clearance. Unresolved safety issues block progression to scanning." actions={<AutoRefresh seconds={45} />} />
      <Notice className="mb-4" title="Clearance rules enforced by the system">
        Routine clearance (radiographer) is only possible when every answer is negative, pregnancy status is acceptable and no implant is on record. Any positive/uncertain answer or implant requires a documented decision by authorised MR safety personnel, with an exam-specific assessment of every device. Previous assessments are never reused automatically.
      </Notice>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Awaiting screening / decision" value={awaiting.length} icon={ShieldAlert} tone="amber" />
        <StatCard label="Not cleared" value={notCleared.length} icon={ShieldX} tone="red" alert={notCleared.length > 0} />
        <StatCard label="Implant assessments pending" value={pendingAssess.length} icon={Cpu} tone="violet" />
        <StatCard label="Screening compliance (30 d)" value={compliance[0].scans ? `${((compliance[0].ok / compliance[0].scans) * 100).toFixed(1)}%` : "—"} icon={ShieldCheck} tone="green" hint="CLEAR decision before scan start" />
      </div>
      <div className="space-y-4">
        <Card title="Awaiting screening or safety decision" bodyClass="p-0"><WorkTable rows={awaiting} showNames={showNames} waitAlert={settings.waitAlertMinutes} columns={["slot", "patient", "exam", "arrival", "wait", "screening", "status", "action"]} /></Card>
        {pendingAssess.length > 0 && (
          <Card title="Implant / device assessments awaiting MR safety personnel" icon={Cpu} bodyClass="p-0">
            <table className="table"><thead><tr><th>Patient</th><th>Accession</th><th>Device</th><th>Class</th><th>Decision</th><th /></tr></thead>
              <tbody>{pendingAssess.map((x) => <tr key={x.id}><td>{showNames ? x.full_name : x.mrn}</td><td>{x.accession_no}<div className="text-xs text-slate-500">{fmtDateTime(x.scheduled_start)}</div></td><td>{x.device_name}</td><td><MapBadge map={SAFETY_CLASS} value={x.safety_class} /></td><td><MapBadge map={ASSESSMENT_DECISION} value={x.decision} /></td><td className="text-right"><Link className="btn-secondary btn-sm" href={`/appointments/${x.appt_id}#screening`}>Assess</Link></td></tr>)}</tbody></table>
          </Card>
        )}
        {notCleared.length > 0 && <Card title="Not cleared – action required" bodyClass="p-0"><WorkTable rows={notCleared} showNames={showNames} waitAlert={settings.waitAlertMinutes} columns={["slot", "patient", "exam", "screening", "status", "action"]} /></Card>}
        <Card title="Cleared (active)" bodyClass="p-0"><WorkTable rows={cleared.filter((r) => ["PREPARATION", "CLEARED"].includes(r.status))} showNames={showNames} waitAlert={settings.waitAlertMinutes} columns={["slot", "patient", "exam", "screening", "prep", "status", "action"]} /></Card>
      </div>
    </div>
  );
}
