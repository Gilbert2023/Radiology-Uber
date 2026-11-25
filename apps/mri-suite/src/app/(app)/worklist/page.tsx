import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { requireActor } from "@/server/auth";
import { q } from "@/lib/db";
import { APPT_SELECT } from "@/server/queries";
import { getSettings } from "@/server/settings";
import { PageHeader, Card, TabLinks, FilterBar } from "@/components/ui";
import { WorkTable } from "@/components/WorkTable";
import { AutoRefresh, AutoSubmit } from "@/components/client/misc";
import { displayStatus } from "@/lib/status";
import { dayBounds, localDate, isDateStr, fmtLongDate } from "@/lib/time";

export const metadata = { title: "Patient Worklist" };
const TABS: Record<string, { label: string; filter: (r: any) => boolean }> = {
  active: { label: "All active", filter: (r) => !["CANCELLED", "NO_SHOW", "COMPLETED"].includes(r.status) },
  booked: { label: "Awaiting arrival", filter: (r) => r.status === "BOOKED" },
  screening: { label: "Safety screening", filter: (r) => ["ARRIVED", "SCREENING"].includes(r.status) },
  prep: { label: "Preparation", filter: (r) => r.status === "PREPARATION" },
  cleared: { label: "Cleared", filter: (r) => r.status === "CLEARED" },
  scanning: { label: "Scanning", filter: (r) => r.status === "SCANNING" },
  pacs: { label: "Awaiting PACS", filter: (r) => r.status === "SCANNED" },
  exceptions: { label: "Exceptions", filter: (r) => r.status === "INCOMPLETE" || r.screening_status === "NOT_CLEARED" || ["UPLOAD_FAILED", "REQUIRES_INVESTIGATION"].includes(r.pacs_status) },
  done: { label: "Completed", filter: (r) => r.status === "COMPLETED" },
  all: { label: "All", filter: () => true },
};

export default async function Worklist({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const actor = await requireActor("appointments.view");
  const sp = await searchParams;
  const date = isDateStr(sp.date) ? sp.date : localDate();
  const tab = sp.tab && TABS[sp.tab] ? sp.tab : "active";
  const settings = await getSettings();
  const [s, e] = dayBounds(date);
  const rows = (await q(`${APPT_SELECT} WHERE a.scheduled_start >= $1 AND a.scheduled_start < $2 ORDER BY a.scheduled_start`, [s, e])).map((r) => ({ ...r, ds: displayStatus(r, settings) }));
  return (
    <div>
      <PageHeader title="Patient Worklist" icon={ClipboardList} description={`MRI worklist for ${fmtLongDate(date)}. Every booking appears here automatically; select a patient to progress their journey.`}
        actions={<><AutoRefresh seconds={45} />{actor.permissions.has("appointments.manage") && <Link href={`/appointments/new?date=${date}`} className="btn-accent"><Plus className="h-4 w-4" />New appointment</Link>}</>} />
      <FilterBar><AutoSubmit><div><label className="label">Date</label><input type="date" name="date" defaultValue={date} className="input" /></div></AutoSubmit><input type="hidden" name="tab" value={tab} /></FilterBar>
      <TabLinks active={tab} tabs={Object.entries(TABS).map(([k, t]) => ({ key: k, label: t.label, href: `?date=${date}&tab=${k}`, count: rows.filter(t.filter).length }))} />
      <Card bodyClass="p-0"><WorkTable rows={rows.filter(TABS[tab].filter)} showNames={actor.permissions.has("patients.view")} waitAlert={settings.waitAlertMinutes}
        columns={["slot", "patient", "exam", "radiographer", "arrival", "wait", "screening", "prep", "pacs", "status", "action"]} /></Card>
    </div>
  );
}
