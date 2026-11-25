import Link from "next/link";
import { clsx } from "clsx";
import { Syringe, Zap, Cpu, ArrowRight } from "lucide-react";
import { StatusPill, MapBadge, EmptyState } from "./ui";
import { SCREENING_STATUS, PREP_STATUS, PACS_STATUS, type DisplayStatus } from "@/lib/constants";
import { fmtTime, fmtMinutes, minutesBetween } from "@/lib/time";

export function nextAction(r: any): { label: string; href: string } {
  const base = `/appointments/${r.id}`;
  switch (r.status) {
    case "BOOKED": return { label: "Record arrival", href: `${base}` };
    case "ARRIVED": case "SCREENING": return { label: r.screening_status === "PENDING" ? "Safety decision" : "Screen patient", href: `${base}#screening` };
    case "PREPARATION": return { label: "Prepare patient", href: `${base}#preparation` };
    case "CLEARED": return { label: "Start scan", href: base };
    case "SCANNING": return { label: "End scan", href: base };
    case "SCANNED": return { label: "Update PACS", href: base };
    default: return { label: "Open", href: base };
  }
}

export function WorkTable({ rows, showNames, waitAlert, columns = ["slot", "patient", "exam", "arrival", "wait", "screening", "prep", "pacs", "status", "action"] }: {
  rows: (any & { ds: DisplayStatus })[]; showNames: boolean; waitAlert: number; columns?: string[];
}) {
  if (!rows.length) return <EmptyState title="No patients in this list" />;
  const has = (c: string) => columns.includes(c);
  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead><tr>
          {has("slot") && <th>Slot</th>}{has("patient") && <th>Patient</th>}{has("exam") && <th>Examination</th>}{has("radiographer") && <th>Radiographer</th>}
          {has("arrival") && <th>Arrived</th>}{has("wait") && <th>Waiting</th>}{has("screening") && <th>Screening</th>}{has("prep") && <th>Prep</th>}
          {has("pacs") && <th>PACS</th>}{has("status") && <th>Status</th>}{has("action") && <th className="text-right">Next step</th>}
        </tr></thead>
        <tbody>
          {rows.map((r) => {
            const w = r.arrived_at && ["ARRIVED", "SCREENING", "PREPARATION", "CLEARED"].includes(r.status) ? minutesBetween(r.arrived_at) : null;
            const na = nextAction(r);
            return (
              <tr key={r.id}>
                {has("slot") && <td className="tabular-nums font-medium">{fmtTime(r.scheduled_start)}</td>}
                {has("patient") && <td><Link href={`/appointments/${r.id}`} className="link">{showNames ? r.full_name : r.mrn}</Link><div className="text-xs text-slate-500">{r.mrn} · {r.accession_no}</div></td>}
                {has("exam") && <td><span>{r.exam_name}</span><span className="ml-1 inline-flex gap-0.5 align-middle">
                  {r.contrast && <Syringe className="h-3.5 w-3.5 text-violet-600" aria-label="Contrast" />}
                  {r.priority !== "ROUTINE" && <Zap className={clsx("h-3.5 w-3.5", r.priority === "EMERGENCY" ? "text-red-600" : "text-orange-500")} aria-label={r.priority} />}
                  {r.implant_count > 0 && <Cpu className="h-3.5 w-3.5 text-amber-600" aria-label="Implant on record" />}</span>
                  <div className="text-xs text-slate-500">{r.scanner_name}</div></td>}
                {has("radiographer") && <td>{r.radiographer_name ?? "—"}</td>}
                {has("arrival") && <td className="tabular-nums">{fmtTime(r.arrived_at)}</td>}
                {has("wait") && <td className={clsx("tabular-nums", w !== null && w >= waitAlert && "font-bold text-red-600")}>{w !== null ? fmtMinutes(w) : "—"}</td>}
                {has("screening") && <td><MapBadge map={SCREENING_STATUS} value={r.screening_status} /></td>}
                {has("prep") && <td><MapBadge map={PREP_STATUS} value={r.prep_status} /></td>}
                {has("pacs") && <td>{r.pacs_status ? <MapBadge map={PACS_STATUS} value={r.pacs_status} /> : "—"}</td>}
                {has("status") && <td><StatusPill status={r.ds} /></td>}
                {has("action") && <td className="text-right"><Link href={na.href} className="btn-secondary btn-sm whitespace-nowrap">{na.label}<ArrowRight className="h-3 w-3" /></Link></td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
