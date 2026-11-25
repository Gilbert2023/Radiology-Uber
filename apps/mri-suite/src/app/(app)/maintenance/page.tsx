import { clsx } from "clsx";
import { Wrench, Timer, CalendarClock, ShieldCheck, Plus, Power } from "lucide-react";
import { requireActor } from "@/server/auth";
import { q } from "@/lib/db";
import { getSettings } from "@/server/settings";
import { utilisation } from "@/server/analytics";
import { PageHeader, Card, StatCard, MapBadge, Badge, DL, EmptyState } from "@/components/ui";
import { HospitalLogo } from "@/components/brand";
import { ActionForm, SubmitButton, Modal } from "@/components/client/forms";
import { SCANNER_STATUS, labelize } from "@/lib/constants";
import { fmtDate, fmtDateTime, localDate, addDays, toLocalInput, fmtMinutes, minutesBetween } from "@/lib/time";
import { logMaintenanceAction, updateMaintenanceAction, rtsAction, scheduleAction, scannerStatusAction } from "./actions";

export const metadata = { title: "Equipment Maintenance" };
const ST: Record<string, string> = { OPEN: "bg-red-50 text-red-700 ring-red-200", IN_PROGRESS: "bg-amber-50 text-amber-800 ring-amber-200", AWAITING_RTS: "bg-sky-50 text-sky-800 ring-sky-200", CLOSED: "bg-green-100 text-green-800 ring-green-300" };

export default async function Maintenance() {
  const actor = await requireActor("maintenance.view");
  const settings = await getSettings();
  const today = localDate();
  const scanners = await q(`SELECT * FROM scanners ORDER BY name`);
  const events = await q(`SELECT me.*, s.name AS scanner, u.full_name AS rts_name FROM maintenance_events me JOIN scanners s ON s.id=me.scanner_id LEFT JOIN users u ON u.id=me.rts_by ORDER BY me.reported_at DESC LIMIT 100`);
  const schedules = await q(`SELECT ms.*, ms.next_due_on::text AS due, s.name AS scanner FROM maintenance_schedules ms JOIN scanners s ON s.id=ms.scanner_id WHERE ms.is_active ORDER BY ms.next_due_on`);
  const util = await utilisation({ from: addDays(today, -89), to: addDays(today, 1) }, settings);
  const down = util.scanners.reduce((a, s) => a + s.downtimeHours, 0);
  const open = events.filter((e) => e.status !== "CLOSED");
  const can = actor.permissions.has("maintenance.manage");
  return (
    <div>
      <PageHeader title="Equipment Maintenance" icon={Wrench} logo={<HospitalLogo size="sm" showName={false} />} description="Preventive maintenance schedules, breakdowns, engineer visits, downtime and return-to-service authorisation."
        actions={can && <Modal title="Log maintenance / breakdown" wide trigger={<><Plus className="h-4 w-4" />Log event</>} triggerClass="btn-accent">
          <ActionForm action={logMaintenanceAction} className="grid gap-3 md:grid-cols-3">
            <div><label className="label">Scanner *</label><select name="scannerId" className="input">{scanners.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div><label className="label">Type *</label><select name="eventType" className="input">{["BREAKDOWN", "PREVENTIVE", "REPAIR", "INSPECTION", "SOFTWARE_UPDATE"].map((t) => <option key={t} value={t}>{labelize(t)}</option>)}</select></div>
            <div><label className="label">Reported at</label><input type="datetime-local" name="reportedAt" className="input" defaultValue={toLocalInput(new Date())} /></div>
            <div className="md:col-span-3"><label className="label">Fault description</label><textarea name="faultDescription" rows={2} className="input" /></div>
            <div><label className="label">Engineer</label><input name="engineerName" className="input" /></div><div><label className="label">Company</label><input name="engineerCompany" className="input" /></div><div><label className="label">Contact</label><input name="engineerContact" className="input" /></div>
            <div><label className="label">Downtime start</label><input type="datetime-local" name="downtimeStart" className="input" /></div><div><label className="label">Downtime end</label><input type="datetime-local" name="downtimeEnd" className="input" /></div>
            <div><label className="label">Linked schedule</label><select name="scheduleId" className="input"><option value="">—</option>{schedules.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></div>
            <div className="md:col-span-2"><label className="label">Work done</label><input name="workDone" className="input" /></div><div><label className="label">Parts replaced</label><input name="partsReplaced" className="input" /></div>
            <div><label className="label">Status</label><select name="status" className="input"><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="CLOSED">Closed (preventive/inspection only)</option></select></div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm md:col-span-2"><input type="checkbox" name="takeOffline" />Take scanner offline (breakdowns always do)</label>
            <div className="md:col-span-3"><SubmitButton>Log event</SubmitButton></div>
          </ActionForm></Modal>} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Open events" value={open.length} icon={Wrench} tone={open.length ? "red" : "green"} />
        <StatCard label="Downtime (90 days)" value={`${down.toFixed(1)} h`} icon={Timer} tone="amber" />
        <StatCard label={`PM due ≤ ${settings.maintenanceDueDays} d`} value={schedules.filter((s) => s.due <= addDays(today, settings.maintenanceDueDays)).length} icon={CalendarClock} tone="violet" />
        <StatCard label="Overdue PM" value={schedules.filter((s) => s.due < today).length} icon={CalendarClock} tone="red" />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {scanners.map((s) => (
          <Card key={s.id} title={s.name} actions={<MapBadge map={SCANNER_STATUS} value={s.status} />}>
            <DL cols={2} items={[["Model", `${s.manufacturer} ${s.model}`], ["Field strength", `${s.field_strength_t} T`], ["Serial number", s.serial_no ?? <span className="text-amber-700">To be entered</span>], ["Installed", s.installed_on ? fmtDate(s.installed_on) : <span className="text-amber-700">To be entered</span>], ["Service provider", s.service_provider], ["Location", s.location], ["Installation notes", s.installation_notes]]} />
            {(actor.permissions.has("scanner.status") || can) && s.status !== "IN_USE" && (
              <Modal title={`Set status – ${s.name}`} trigger={<><Power className="h-4 w-4" />Change status</>} triggerClass="btn-secondary btn-sm mt-3">
                <ActionForm action={scannerStatusAction} className="space-y-3"><input type="hidden" name="scannerId" value={s.id} />
                  <select name="status" className="input" defaultValue={s.status}><option value="AVAILABLE">Available</option><option value="MAINTENANCE">Under maintenance</option><option value="UNAVAILABLE">Unavailable</option></select>
                  <input name="note" className="input" placeholder="Reason" /><SubmitButton>Update</SubmitButton></ActionForm></Modal>)}
          </Card>
        ))}
        <Card title="Preventive maintenance schedule" icon={CalendarClock} className="xl:col-span-2" actions={can && <Modal title="Add schedule" trigger="Add schedule" triggerClass="btn-secondary btn-sm">
          <ActionForm action={scheduleAction} className="space-y-3"><select name="scannerId" className="input">{scanners.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <input name="title" className="input" placeholder="Title" required /><input name="frequencyDays" type="number" className="input" placeholder="Every N days" required /><input name="provider" className="input" placeholder="Provider" />
            <div><label className="label">Next due</label><input type="date" name="nextDueOn" className="input" required /></div><SubmitButton>Add</SubmitButton></ActionForm></Modal>} bodyClass="p-0">
          <table className="table"><thead><tr><th>Task</th><th>Scanner</th><th>Every</th><th>Provider</th><th>Last done</th><th>Next due</th></tr></thead>
            <tbody>{schedules.map((s) => <tr key={s.id}><td>{s.title}</td><td>{s.scanner}</td><td>{s.frequency_days} d</td><td className="text-xs">{s.provider}</td><td>{fmtDate(s.last_done_on)}</td>
              <td>{fmtDate(s.due)} {s.due < today ? <Badge className="bg-red-100 text-red-800 ring-red-300">Overdue</Badge> : s.due <= addDays(today, settings.maintenanceDueDays) ? <Badge className="bg-amber-50 text-amber-800 ring-amber-200">Due soon</Badge> : null}</td></tr>)}</tbody></table>
        </Card>
      </div>
      <Card title="Service history" className="mt-4" bodyClass="p-0 overflow-x-auto">
        {events.length === 0 ? <div className="p-4"><EmptyState title="No events" /></div> : (
          <table className="table text-xs"><thead><tr><th>Reported</th><th>Scanner</th><th>Type</th><th>Fault / work</th><th>Engineer</th><th>Downtime</th><th>Status</th><th>Return to service</th></tr></thead>
            <tbody>{events.map((e) => <tr key={e.id} className={clsx(e.status !== "CLOSED" && "bg-amber-50/40")}><td className="whitespace-nowrap">{fmtDateTime(e.reported_at)}</td><td>{e.scanner}</td><td>{labelize(e.event_type)}</td>
              <td className="max-w-xs">{e.fault_description}{e.work_done && <div className="text-slate-500">Work: {e.work_done}</div>}{e.parts_replaced && <div className="text-slate-500">Parts: {e.parts_replaced}</div>}</td>
              <td>{e.engineer_name}<div className="text-slate-500">{e.engineer_company}</div></td><td>{e.downtime_start ? fmtMinutes(minutesBetween(e.downtime_start, e.downtime_end ?? new Date())) : "—"}{e.downtime_start && !e.downtime_end && <div className="text-red-600">ongoing</div>}</td>
              <td><Badge className={ST[e.status]}>{labelize(e.status)}</Badge></td>
              <td>{e.rts_at ? <span className="text-green-700">✓ {e.rts_name} · {fmtDateTime(e.rts_at)}<div className="text-slate-500">{e.rts_notes}</div></span> : e.status !== "CLOSED" && (
                <div className="flex flex-col gap-1">
                  {can && <Modal title="Update event" trigger="Update" triggerClass="btn-secondary btn-sm"><ActionForm action={updateMaintenanceAction} className="space-y-3"><input type="hidden" name="id" value={e.id} />
                    <select name="status" className="input" defaultValue={e.status}><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="AWAITING_RTS">Awaiting return to service</option>{!["BREAKDOWN", "REPAIR"].includes(e.event_type) && <option value="CLOSED">Closed</option>}</select>
                    <input name="workDone" className="input" placeholder="Work done" defaultValue={e.work_done ?? ""} /><input name="partsReplaced" className="input" placeholder="Parts replaced" defaultValue={e.parts_replaced ?? ""} />
                    <input name="engineerName" className="input" placeholder="Engineer" defaultValue={e.engineer_name ?? ""} /><input name="engineerCompany" className="input" placeholder="Company" defaultValue={e.engineer_company ?? ""} />
                    <div><label className="label">Downtime end</label><input type="datetime-local" name="downtimeEnd" className="input" /></div><SubmitButton>Save</SubmitButton></ActionForm></Modal>}
                  {actor.permissions.has("maintenance.rts") && <Modal title="Authorise return to service" trigger={<><ShieldCheck className="h-3.5 w-3.5" />Return to service</>} triggerClass="btn-accent btn-sm">
                    <ActionForm action={rtsAction} className="space-y-3"><input type="hidden" name="id" value={e.id} /><label className="label">Checks performed (e.g. post-repair QC passed) *</label><textarea name="notes" className="input" rows={3} required /><SubmitButton className="btn-accent">Authorise</SubmitButton></ActionForm></Modal>}
                </div>)}</td></tr>)}</tbody></table>)}
      </Card>
    </div>
  );
}
