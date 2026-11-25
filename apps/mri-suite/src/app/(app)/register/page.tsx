import Link from "next/link";
import { BookOpen, FileSpreadsheet, FileDown } from "lucide-react";
import { requireActor } from "@/server/auth";
import { q } from "@/lib/db";
import { APPT_SELECT } from "@/server/queries";
import { getSettings } from "@/server/settings";
import { PageHeader, Card, StatusPill, MapBadge, FilterBar, EmptyState } from "@/components/ui";
import { HospitalLogo } from "@/components/brand";
import { AutoSubmit, PrintButton } from "@/components/client/misc";
import { displayStatus } from "@/lib/status";
import { PACS_STATUS, BODY_REGIONS, labelize } from "@/lib/constants";
import { dayBounds, localDate, isDateStr, fmtTime, fmtLongDate, fmtMinutes, minutesBetween, ageFromDob } from "@/lib/time";

export const metadata = { title: "Daily MRI Examination Register" };
export default async function Register({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const actor = await requireActor("scanning.perform", "pacs.view", "analytics.view");
  const sp = await searchParams;
  const date = isDateStr(sp.date) ? sp.date : localDate();
  const settings = await getSettings();
  const [s, e] = dayBounds(date);
  const rows = (await q(`${APPT_SELECT} WHERE a.scheduled_start >= $1 AND a.scheduled_start < $2 ${sp.status ? "AND a.status = $3" : ""} ORDER BY a.scheduled_start`, sp.status ? [s, e, sp.status] : [s, e]))
    .map((r) => ({ ...r, ds: displayStatus(r, settings) }));
  const showNames = actor.permissions.has("patients.view");
  const performed = rows.filter((r) => r.scan_started_at);
  return (
    <div>
      <PageHeader title="Daily MRI Examination Register" icon={BookOpen} logo={<HospitalLogo size="sm" />} description={`${fmtLongDate(date)} · ${performed.length} examination(s) performed · ${rows.length} booked`}
        actions={<><PrintButton />{actor.permissions.has("reports.export") && <><a className="btn-secondary" href={`/api/export/register?date=${date}&format=xlsx`}><FileSpreadsheet className="h-4 w-4" />Excel</a><a className="btn-secondary" href={`/api/export/register?date=${date}&format=pdf`}><FileDown className="h-4 w-4" />PDF</a></>}</>} />
      <div className="no-print"><FilterBar><AutoSubmit><div><label className="label">Date</label><input type="date" name="date" defaultValue={date} className="input" /></div>
        <div><label className="label">Status</label><select name="status" defaultValue={sp.status ?? ""} className="input"><option value="">All</option>{["BOOKED", "ARRIVED", "SCREENING", "PREPARATION", "CLEARED", "SCANNING", "SCANNED", "COMPLETED", "INCOMPLETE", "CANCELLED", "NO_SHOW"].map((x) => <option key={x} value={x}>{labelize(x)}</option>)}</select></div></AutoSubmit></FilterBar></div>
      <Card bodyClass="p-0 overflow-x-auto">
        {rows.length === 0 ? <div className="p-4"><EmptyState title="No examinations for this date" /></div> : (
          <table className="table text-xs">
            <thead><tr><th>#</th><th>Accession</th><th>Patient</th><th>Age/Sex</th><th>Type</th><th>Examination</th><th>Region</th><th>C+</th><th>Referrer</th><th>Radiographer</th><th>Scan</th><th>Duration</th><th>PACS</th><th>Status</th></tr></thead>
            <tbody>{rows.map((r, i) => (
              <tr key={r.id}><td>{i + 1}</td><td><Link className="link font-mono" href={`/appointments/${r.id}`}>{r.accession_no}</Link></td><td>{showNames ? r.full_name : "—"}<div className="text-slate-500">{r.mrn}</div></td>
                <td>{ageFromDob(r.dob)}/{r.sex[0]}</td><td>{labelize(r.patient_type)}</td><td>{r.exam_name}</td><td>{BODY_REGIONS[r.body_region]}</td><td>{r.contrast ? "Yes" : "—"}</td>
                <td>{r.referring_department}<div className="text-slate-500">{r.referring_doctor}</div></td><td>{r.radiographer_name ?? "—"}</td>
                <td className="tabular-nums">{r.scan_started_at ? `${fmtTime(r.scan_started_at)}–${fmtTime(r.scan_ended_at)}` : "—"}</td><td>{r.scan_ended_at ? fmtMinutes(minutesBetween(r.scan_started_at, r.scan_ended_at)) : "—"}</td>
                <td>{r.pacs_status ? <MapBadge map={PACS_STATUS} value={r.pacs_status} /> : "—"}</td><td><StatusPill status={r.ds} /></td></tr>))}</tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
