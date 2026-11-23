import Link from "next/link";
import { ScanLine, Timer, Repeat, AlertCircle, Syringe } from "lucide-react";
import { requireActor } from "@/server/auth";
import { q } from "@/lib/db";
import { PageHeader, Card, StatCard, MapBadge, EmptyState, Badge } from "@/components/ui";
import { HospitalLogo } from "@/components/brand";
import { PeriodFilter, resolvePeriod } from "@/components/PeriodFilter";
import { listStaff } from "@/server/queries";
import { PACS_STATUS, labelize } from "@/lib/constants";
import { fmtDateTime, fmtTime, fmtMinutes, minutesBetween, zonedToUtc } from "@/lib/time";

export const metadata = { title: "Scanning Activity Log" };
export default async function ScanningLog({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const actor = await requireActor("scanning.perform", "pacs.view");
  const sp = await searchParams;
  const p = resolvePeriod(sp, 7);
  const params: unknown[] = [zonedToUtc(p.from), zonedToUtc(p.to)];
  let extra = "";
  if (sp.radiographer) { params.push(sp.radiographer); extra += ` AND sr.radiographer_id = $${params.length}`; }
  if (sp.completion) { params.push(sp.completion); extra += ` AND sr.completion_status = $${params.length}`; }
  const rows = await q(`SELECT sr.*, a.id AS appt_id, a.accession_no, a.contrast, p.full_name, p.mrn, e.name AS exam, s.name AS scanner, st.full_name AS radiographer, mp.name AS protocol, pu.status AS pacs_status,
      (SELECT string_agg(ag.name || ' ' || ca.dose_ml || ' mL', '; ') FROM contrast_administrations ca JOIN contrast_agents ag ON ag.id=ca.agent_id WHERE ca.appointment_id=a.id) AS contrast_given
      FROM scan_records sr JOIN appointments a ON a.id=sr.appointment_id JOIN patients p ON p.id=a.patient_id JOIN exam_types e ON e.id=a.exam_type_id JOIN scanners s ON s.id=sr.scanner_id
      JOIN staff st ON st.id=sr.radiographer_id LEFT JOIN mri_protocols mp ON mp.id=sr.protocol_id LEFT JOIN pacs_uploads pu ON pu.appointment_id=a.id
      WHERE sr.started_at >= $1 AND sr.started_at < $2 ${extra} ORDER BY sr.started_at DESC LIMIT 500`, params);
  const done = rows.filter((r) => r.ended_at);
  const avg = done.length ? done.reduce((a, r) => a + minutesBetween(r.started_at, r.ended_at), 0) / done.length : null;
  const rads = await listStaff("radiographers");
  const showNames = actor.permissions.has("patients.view");
  return (
    <div>
      <PageHeader title="Scanning Activity Log" icon={ScanLine} logo={<HospitalLogo size="sm" showName={false} />} description="Every scan: radiographer, times, duration, contrast, additional sequences, protocol modifications and completion." />
      <PeriodFilter sp={sp} extra={<>
        <div><label className="label">Radiographer</label><select name="radiographer" className="input" defaultValue={sp.radiographer ?? ""}><option value="">All</option>{rads.map((r) => <option key={r.id} value={r.id}>{r.full_name}</option>)}</select></div>
        <div><label className="label">Completion</label><select name="completion" className="input" defaultValue={sp.completion ?? ""}><option value="">All</option><option value="COMPLETE">Complete</option><option value="INCOMPLETE">Incomplete</option></select></div></>} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Scans" value={rows.length} icon={ScanLine} tone="brand" />
        <StatCard label="Average duration" value={fmtMinutes(avg)} icon={Timer} tone="accent" />
        <StatCard label="Incomplete" value={rows.filter((r) => r.completion_status === "INCOMPLETE").length} icon={AlertCircle} tone="red" />
        <StatCard label="With repeat sequences" value={rows.filter((r) => r.repeat_sequences > 0).length} icon={Repeat} tone="amber" />
      </div>
      <Card bodyClass="p-0 overflow-x-auto">
        {rows.length === 0 ? <div className="p-4"><EmptyState title="No scans in this period" /></div> : (
          <table className="table text-xs"><thead><tr><th>Start</th><th>Patient</th><th>Examination</th><th>Radiographer</th><th>End</th><th>Duration</th><th>Contrast</th><th>Additional / modifications</th><th>Repeats</th><th>Completion</th><th>PACS</th></tr></thead>
            <tbody>{rows.map((r) => <tr key={r.id}><td className="whitespace-nowrap">{fmtDateTime(r.started_at)}</td><td><Link href={`/appointments/${r.appt_id}`} className="link">{showNames ? r.full_name : r.mrn}</Link><div className="text-slate-500">{r.accession_no}</div></td>
              <td>{r.exam}<div className="text-slate-500">{r.scanner}{r.protocol ? ` · ${r.protocol}` : ""}</div></td><td>{r.radiographer}</td><td>{r.ended_at ? fmtTime(r.ended_at) : <Badge className="bg-indigo-50 text-indigo-700 ring-indigo-200">In progress</Badge>}</td>
              <td>{r.ended_at ? fmtMinutes(minutesBetween(r.started_at, r.ended_at)) : "—"}</td><td>{r.contrast_given ? <span className="inline-flex items-center gap-1"><Syringe className="h-3 w-3 text-violet-600" />{r.contrast_given}</span> : r.contrast ? <span className="text-amber-700">Booked – not recorded</span> : "—"}</td>
              <td className="max-w-[220px]">{r.additional_sequences}{r.protocol_modifications && <div className="text-slate-500">{r.protocol_modifications}</div>}{!r.additional_sequences && !r.protocol_modifications && "—"}</td>
              <td className="tabular-nums">{r.repeat_sequences}</td><td>{r.completion_status ? labelize(r.completion_status) : "—"}{r.incomplete_reason && <div className="text-red-700">{r.incomplete_reason}</div>}</td><td>{r.pacs_status ? <MapBadge map={PACS_STATUS} value={r.pacs_status} /> : "—"}</td></tr>)}</tbody></table>
        )}
      </Card>
    </div>
  );
}
