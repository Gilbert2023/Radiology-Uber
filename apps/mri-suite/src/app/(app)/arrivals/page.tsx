import Link from "next/link";
import { DoorOpen, Hourglass, Users, UserX } from "lucide-react";
import { requireActor } from "@/server/auth";
import { q } from "@/lib/db";
import { APPT_SELECT } from "@/server/queries";
import { getSettings } from "@/server/settings";
import { PageHeader, Card, StatCard, StatusPill, EmptyState } from "@/components/ui";
import { WorkTable } from "@/components/WorkTable";
import { ActionForm, SubmitButton } from "@/components/client/forms";
import { AutoRefresh } from "@/components/client/misc";
import { displayStatus } from "@/lib/status";
import { dayBounds, localDate, fmtTime, fmtMinutes, minutesBetween } from "@/lib/time";
import { arrivalAction, noShowAction } from "../appointments/actions";

export const metadata = { title: "Patient Arrival & Tracking" };

export default async function Arrivals() {
  const actor = await requireActor("arrival.record");
  const settings = await getSettings();
  const [s, e] = dayBounds(localDate());
  const rows = (await q(`${APPT_SELECT} WHERE a.scheduled_start >= $1 AND a.scheduled_start < $2 ORDER BY a.scheduled_start`, [s, e])).map((r) => ({ ...r, ds: displayStatus(r, settings) }));
  const expected = rows.filter((r) => r.status === "BOOKED");
  const onsite = rows.filter((r) => ["ARRIVED", "SCREENING", "PREPARATION", "CLEARED", "SCANNING"].includes(r.status));
  const waits = onsite.filter((r) => r.status !== "SCANNING").map((r) => minutesBetween(r.arrived_at));
  const showNames = actor.permissions.has("patients.view");
  return (
    <div>
      <PageHeader title="Patient Arrival & Tracking" icon={DoorOpen} description="Verify identity with two identifiers, confirm the appointment and record arrival. Waiting time is tracked from arrival." actions={<AutoRefresh seconds={30} />} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Expected (not arrived)" value={expected.length} icon={Users} tone="brand" />
        <StatCard label="On site now" value={onsite.length} icon={DoorOpen} tone="accent" />
        <StatCard label="Longest current wait" value={waits.length ? fmtMinutes(Math.max(...waits)) : "—"} icon={Hourglass} tone={waits.some((w) => w >= settings.waitAlertMinutes) ? "red" : "amber"} />
        <StatCard label="No-shows today" value={rows.filter((r) => r.status === "NO_SHOW").length} icon={UserX} tone="slate" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Expected arrivals" icon={Users} bodyClass="p-0">
          {expected.length === 0 ? <div className="p-4"><EmptyState title="Everyone due today has arrived or been accounted for" /></div> : (
            <ul className="divide-y divide-slate-100">
              {expected.map((r) => (
                <li key={r.id} className="p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div><Link href={`/appointments/${r.id}`} className="link">{showNames ? r.full_name : r.mrn}</Link> <span className="text-xs text-slate-500">{r.mrn} · DOB {r.dob}</span>
                      <div className="text-xs text-slate-600">{fmtTime(r.scheduled_start)} · {r.exam_name}</div></div>
                    <StatusPill status={r.ds} />
                  </div>
                  <ActionForm action={arrivalAction} className="mt-2 flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    <select name="identityMethod" className="input w-auto flex-1 py-1.5 text-xs" aria-label="Identity verification method" defaultValue="Name + date of birth + hospital number (verbal and wristband)">
                      <option>Name + date of birth + hospital number (verbal and wristband)</option><option>Name + date of birth + Ghana Card</option><option>Name + date of birth + NHIS card</option><option>Inpatient wristband checked with ward nurse</option>
                    </select>
                    <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" name="identityVerified" required className="h-4 w-4" />ID verified</label>
                    <SubmitButton className="btn-accent btn-sm">Record arrival</SubmitButton>
                  </ActionForm>
                  {new Date(r.scheduled_start) < new Date() && (
                    <ActionForm action={noShowAction} confirm="Record as no-show?" className="mt-1"><input type="hidden" name="id" value={r.id} /><SubmitButton className="btn-ghost btn-sm text-xs" pendingText="…">Mark no-show</SubmitButton></ActionForm>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Patients on site – live tracking" icon={DoorOpen} bodyClass="p-0">
          <WorkTable rows={onsite} showNames={showNames} waitAlert={settings.waitAlertMinutes} columns={["patient", "exam", "arrival", "wait", "status", "action"]} />
        </Card>
      </div>
    </div>
  );
}
