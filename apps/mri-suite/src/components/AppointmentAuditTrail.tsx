import Link from "next/link";
import { clsx } from "clsx";
import { describeChanges, headline, actorLabel, type Lookups } from "@/server/appointmentAudit";
import { fmtDateTime } from "@/lib/time";
import { EmptyState } from "./ui";

const OP: Record<string, string> = { CREATED: "bg-green-100 text-green-800 ring-green-300", UPDATED: "bg-sky-50 text-sky-800 ring-sky-200", DELETED: "bg-red-50 text-red-700 ring-red-200" };

/** Field-level audit entries (written automatically by the database trigger). */
export function AppointmentAuditTrail({ rows, lookups, showAppointment, showNames = true }: { rows: any[]; lookups: Lookups; showAppointment?: boolean; showNames?: boolean }) {
  if (!rows.length) return <EmptyState title="No audit entries" />;
  return (
    <ol className="divide-y divide-slate-100">
      {rows.map((r) => {
        const changes = describeChanges(r, lookups);
        return (
          <li key={r.id} className="px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className={clsx("badge", OP[r.operation])}>{r.operation === "CREATED" ? "Created" : r.operation === "UPDATED" ? "Changed" : "Deleted"}</span>
              <span className="font-semibold text-slate-800">{headline(r, changes)}</span>
              {showAppointment && <Link href={`/appointments/${r.appointment_id}`} className="link font-mono text-xs">{r.accession_no}</Link>}
              {showAppointment && r.mrn && <span className="text-xs text-slate-500">{showNames ? `${r.full_name} · ` : ""}{r.mrn}</span>}
              <span className="ml-auto text-xs tabular-nums text-slate-500">{fmtDateTime(r.at)}</span>
            </div>
            <div className="mt-0.5 text-xs text-slate-600">By <span className="font-medium">{actorLabel(r)}</span> · {r.source}</div>
            {changes.length > 0 && (
              <table className="mt-2 w-full text-xs">
                <tbody>{changes.map((c) => (
                  <tr key={c.field} className="border-t border-slate-100">
                    <td className="w-44 py-1 pr-2 font-medium text-slate-600">{c.label}</td>
                    {r.operation === "UPDATED" ? <td className="py-1"><span className="text-red-700 line-through decoration-red-300">{c.from}</span> <span className="text-slate-400">→</span> <span className="font-medium text-green-800">{c.to}</span></td>
                      : <td className="py-1">{c.to}</td>}
                  </tr>))}</tbody>
              </table>
            )}
          </li>
        );
      })}
    </ol>
  );
}
