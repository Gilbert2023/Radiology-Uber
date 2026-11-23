import Link from "next/link";
import { clsx } from "clsx";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Syringe, Zap, AlertOctagon, PhoneCall, Cpu } from "lucide-react";
import { requireActor } from "@/server/auth";
import { q } from "@/lib/db";
import { APPT_SELECT, listScanners, listStaff } from "@/server/queries";
import { getSettings, availableMinutes } from "@/server/settings";
import { PageHeader, Card, StatusPill, Badge, EmptyState } from "@/components/ui";
import { HospitalLogo } from "@/components/brand";
import { ActionForm, SubmitButton } from "@/components/client/forms";
import { DISPLAY_STATUS, BODY_REGIONS, type DisplayStatus } from "@/lib/constants";
import { displayStatus } from "@/lib/status";
import { localDate, addDays, startOfWeek, startOfMonth, endOfMonthExclusive, weekday, dayBounds, fmtTime, fmtLongDate, isDateStr, zonedToUtc, localTime, fmtDate } from "@/lib/time";
import { reminderAction } from "./actions";

export const metadata = { title: "MRI Appointment Scheduling" };
const PX_PER_MIN = 1.5;

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const actor = await requireActor("appointments.view");
  const sp = await searchParams;
  const view = (["day", "week", "month"].includes(sp.view) ? sp.view : "day") as "day" | "week" | "month";
  const date = isDateStr(sp.date) ? sp.date : localDate();
  const group = sp.group === "radiographer" ? "radiographer" : "scanner";
  const settings = await getSettings();
  const scanners = await listScanners();
  const scannerFilter = sp.scanner && scanners.some((s) => s.id === sp.scanner) ? sp.scanner : "";
  const canBook = actor.permissions.has("appointments.manage");
  const showNames = actor.permissions.has("patients.view");

  let from = date, to = addDays(date, 1);
  if (view === "week") { from = startOfWeek(date); to = addDays(from, 7); }
  if (view === "month") { from = startOfMonth(date); to = endOfMonthExclusive(date); }
  const appts = await q(`${APPT_SELECT} WHERE a.scheduled_start >= $1 AND a.scheduled_start < $2 ${scannerFilter ? "AND a.scanner_id = $3" : ""} ORDER BY a.scheduled_start`,
    scannerFilter ? [zonedToUtc(from), zonedToUtc(to), scannerFilter] : [zonedToUtc(from), zonedToUtc(to)]);
  const now = new Date();
  const withStatus = appts.map((a) => ({ ...a, ds: displayStatus(a, settings, now) as DisplayStatus }));

  const step = view === "day" ? 1 : view === "week" ? 7 : 0;
  const prev = view === "month" ? addDays(startOfMonth(date), -1) : addDays(date, -step);
  const next = view === "month" ? endOfMonthExclusive(date) : addDays(date, step);
  const qs = (o: Record<string, string>) => "?" + new URLSearchParams({ view, date, group, ...(scannerFilter ? { scanner: scannerFilter } : {}), ...o }).toString();

  // Summary (for the focused day)
  const [dStart, dEnd] = dayBounds(date);
  const dayAppts = withStatus.filter((a) => new Date(a.scheduled_start) >= dStart && new Date(a.scheduled_start) < dEnd);
  const active = dayAppts.filter((a) => !["CANCELLED", "NO_SHOW"].includes(a.status));
  const availMin = availableMinutes(settings, date, addDays(date, 1), addDays, weekday) * (scannerFilter ? 1 : scanners.length);
  const bookedMin = active.reduce((s, a) => s + (new Date(a.scheduled_end).getTime() - new Date(a.scheduled_start).getTime()) / 60000, 0);
  const openSlots = Math.max(0, Math.floor((availMin - bookedMin) / 30));
  const priorNoShows = active.length ? await q(`SELECT patient_id, count(*)::int AS n FROM appointments WHERE status='NO_SHOW' AND patient_id = ANY($1) GROUP BY 1`, [active.map((a) => a.patient_id)]) : [];
  const risk = new Map(priorNoShows.map((r) => [r.patient_id, r.n]));
  const byRegion: Record<string, number> = {};
  for (const a of active) byRegion[a.body_region] = (byRegion[a.body_region] ?? 0) + 1;
  const statusCounts: Partial<Record<DisplayStatus, number>> = {};
  for (const a of dayAppts) { const k = a.ds as DisplayStatus; statusCounts[k] = (statusCounts[k] ?? 0) + 1; }
  const tomorrow = addDays(localDate(), 1);
  const reminders = actor.permissions.has("appointments.reminders")
    ? await q(`${APPT_SELECT} WHERE a.status='BOOKED' AND a.scheduled_start >= $1 AND a.scheduled_start < $2 AND a.reminder_at IS NULL ORDER BY a.scheduled_start`, [zonedToUtc(tomorrow), zonedToUtc(addDays(tomorrow, 1))])
    : [];

  return (
    <div>
      <PageHeader title="MRI Appointment Scheduling" icon={CalendarDays} description="Book, reschedule and track MRI examinations. Scanner conflicts and double-bookings are prevented automatically."
        crumbs={[{ label: "Patient Management" }, { label: "Appointments" }]}
        logo={<div className="hidden xl:block"><HospitalLogo size="sm" showName={false} /></div>}
        actions={canBook && <Link href={`/appointments/new?date=${date}`} className="btn-accent"><Plus className="h-4 w-4" />New MRI appointment</Link>} />

      <div className="grid gap-4 xl:grid-cols-[230px_minmax(0,1fr)_280px]">
        {/* Left column: mini calendar + legend */}
        <div className="space-y-4">
          <MiniCalendar date={date} hrefFor={(d) => qs({ date: d, view: view === "month" ? "day" : view })} />
          <Card title="Status colour key" bodyClass="p-3">
            <ul className="grid grid-cols-2 gap-1.5 text-xs xl:grid-cols-1">
              {(["CONFIRMED", "ARRIVED", "WAITING", "SAFETY_PENDING", "IN_PREPARATION", "CLEARED", "SCANNING", "PACS_PENDING", "COMPLETED", "INCOMPLETE", "CANCELLED", "NO_SHOW", "DELAYED"] as DisplayStatus[]).map((k) => (
                <li key={k} className="flex items-center gap-2"><span className={clsx("h-2.5 w-2.5 rounded-full", DISPLAY_STATUS[k].dot)} />{DISPLAY_STATUS[k].label}</li>
              ))}
            </ul>
          </Card>
          <Card title="Scanners" bodyClass="p-3">
            <ul className="space-y-1 text-sm">
              <li><Link href={qs({ scanner: "" }).replace(/&?scanner=[^&]*/, "")} className={clsx("block rounded px-2 py-1", !scannerFilter ? "bg-brand-50 font-semibold text-brand-800" : "hover:bg-slate-50")}>All scanners</Link></li>
              {scanners.map((s) => (
                <li key={s.id}><Link href={qs({ scanner: s.id })} className={clsx("flex items-center gap-2 rounded px-2 py-1", scannerFilter === s.id ? "bg-brand-50 font-semibold text-brand-800" : "hover:bg-slate-50")}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.colour }} />{s.name}</Link></li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Main calendar */}
        <div className="min-w-0">
          <div className="card mb-3 flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <Link href={qs({ date: prev })} className="btn-secondary btn-sm" aria-label="Previous"><ChevronLeft className="h-4 w-4" /></Link>
              <Link href={qs({ date: localDate() })} className="btn-secondary btn-sm">Today</Link>
              <Link href={qs({ date: next })} className="btn-secondary btn-sm" aria-label="Next"><ChevronRight className="h-4 w-4" /></Link>
              <h2 className="ml-2 text-base font-semibold text-brand-950">
                {view === "day" ? fmtLongDate(date) : view === "week" ? `Week of ${fmtDate(from)}` : new Date(date + "T12:00:00Z").toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {view === "day" && (
                <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-xs" role="group" aria-label="Columns">
                  {(["scanner", "radiographer"] as const).map((g) => (
                    <Link key={g} href={qs({ group: g })} className={clsx("rounded-md px-2.5 py-1 font-medium", group === g ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-100")}>By {g}</Link>
                  ))}
                </div>
              )}
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-xs" role="group" aria-label="Calendar view">
                {(["day", "week", "month"] as const).map((v) => (
                  <Link key={v} href={qs({ view: v })} className={clsx("rounded-md px-3 py-1 font-medium capitalize", view === v ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-100")}>{v}</Link>
                ))}
              </div>
            </div>
          </div>

          {view === "day" && <DayGrid date={date} appts={withStatus} settings={settings} group={group} scanners={scannerFilter ? scanners.filter((s) => s.id === scannerFilter) : scanners}
            radiographers={group === "radiographer" ? await listStaff("radiographers") : []} canBook={canBook} showNames={showNames} risk={risk} />}
          {view === "week" && <WeekGrid from={from} appts={withStatus} settings={settings} showNames={showNames} canBook={canBook} />}
          {view === "month" && <MonthGrid date={date} appts={withStatus} qs={qs} />}
        </div>

        {/* Right summary */}
        <div className="space-y-4">
          <Card title={view === "day" ? "Day at a glance" : `${fmtDate(date)} at a glance`}>
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-xs text-slate-500">Appointments</div><div className="kpi-num">{active.length}</div></div>
              <div><div className="text-xs text-slate-500">Open 30-min slots</div><div className="kpi-num text-accent-700">{openSlots}</div></div>
              <div><div className="text-xs text-slate-500">No-show risk</div><div className={clsx("kpi-num", risk.size ? "text-red-600" : "")}>{risk.size}</div><div className="text-[10px] text-slate-400">patients with prior no-show</div></div>
              <div><div className="text-xs text-slate-500">Contrast</div><div className="kpi-num">{active.filter((a) => a.contrast).length}</div></div>
            </div>
            <p className="mt-3 text-[11px] text-slate-400">Open slots = (operating minutes − booked minutes) ÷ 30. Operating hours are configured in System Settings.</p>
          </Card>
          <Card title="By body region">
            {Object.keys(byRegion).length === 0 ? <p className="text-sm text-slate-500">No appointments.</p> : (
              <ul className="space-y-2">
                {Object.entries(byRegion).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
                  <li key={k} className="text-xs">
                    <div className="flex justify-between"><span>{BODY_REGIONS[k] ?? k}</span><span className="font-semibold tabular-nums">{n}</span></div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-accent-500" style={{ width: `${(n / Math.max(...Object.values(byRegion))) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Status today">
            <ul className="space-y-1 text-sm">
              {Object.entries(statusCounts).map(([k, n]) => <li key={k} className="flex items-center justify-between"><StatusPill status={k as DisplayStatus} /><span className="font-semibold tabular-nums">{n}</span></li>)}
              {!Object.keys(statusCounts).length && <li className="text-slate-500">—</li>}
            </ul>
          </Card>
          {actor.permissions.has("appointments.reminders") && (
            <Card title={`Reminder calls – ${fmtDate(tomorrow)}`} icon={PhoneCall} subtitle="SMS not connected: record phone reminders here">
              {reminders.length === 0 ? <p className="text-sm text-slate-500">All reminders recorded.</p> : (
                <ul className="divide-y divide-slate-100">
                  {reminders.slice(0, 12).map((r) => (
                    <li key={r.id} className="py-2 text-xs">
                      <div className="flex justify-between gap-2"><Link href={`/appointments/${r.id}`} className="link">{r.full_name}</Link><span className="tabular-nums">{fmtTime(r.scheduled_start)}</span></div>
                      <div className="text-slate-500">{r.phone ?? "No phone"} · {r.exam_name}</div>
                      <ActionForm action={reminderAction} className="mt-1 flex gap-1">
                        <input type="hidden" name="id" value={r.id} />
                        <input name="note" className="input py-1 text-xs" placeholder="Outcome e.g. confirmed" aria-label="Reminder outcome" />
                        <SubmitButton className="btn-secondary btn-sm" pendingText="…">Log</SubmitButton>
                      </ActionForm>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniCalendar({ date, hrefFor }: { date: string; hrefFor: (d: string) => string }) {
  const first = startOfMonth(date);
  const gridStart = startOfWeek(first);
  const today = localDate();
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  return (
    <Card title={new Date(date + "T12:00:00Z").toLocaleDateString("en-GB", { month: "long", year: "numeric" })} bodyClass="p-3"
      actions={<div className="flex gap-1"><Link className="btn-ghost btn-sm" aria-label="Previous month" href={hrefFor(addDays(first, -1))}><ChevronLeft className="h-3.5 w-3.5" /></Link><Link className="btn-ghost btn-sm" aria-label="Next month" href={hrefFor(endOfMonthExclusive(date))}><ChevronRight className="h-3.5 w-3.5" /></Link></div>}>
      <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-slate-400">{["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => <div key={d}>{d}</div>)}</div>
      <div className="mt-1 grid grid-cols-7 gap-0.5 text-center text-xs">
        {days.map((d) => (
          <Link key={d} href={hrefFor(d)} className={clsx("rounded-md py-1 tabular-nums", d.slice(0, 7) !== date.slice(0, 7) && "text-slate-300", d === date && "bg-brand-700 font-bold text-white", d !== date && d === today && "font-bold text-accent-700 ring-1 ring-accent-300", d !== date && "hover:bg-slate-100")}>{Number(d.slice(8))}</Link>
        ))}
      </div>
    </Card>
  );
}

type Row = Record<string, any> & { ds: DisplayStatus };

function hoursRange(date: string, settings: any, appts: Row[]) {
  const h = settings.operatingHours[String(weekday(date))];
  let startMin = h ? Number(h.open.slice(0, 2)) * 60 : 8 * 60;
  let endMin = h ? Math.ceil(Number(h.close.slice(0, 2)) + Number(h.close.slice(3)) / 60) * 60 : 17 * 60;
  for (const a of appts) {
    const s = localTime(a.scheduled_start).split(":").map(Number), e = localTime(a.scheduled_end).split(":").map(Number);
    if (localDate(a.scheduled_start) !== date) continue;
    startMin = Math.min(startMin, Math.floor((s[0] * 60 + s[1]) / 60) * 60);
    endMin = Math.max(endMin, localDate(a.scheduled_end) !== date ? 24 * 60 : Math.ceil((e[0] * 60 + e[1]) / 60) * 60);
  }
  return { startMin, endMin, open: h };
}

function ApptCard({ a, top, height, showNames, risk, compact }: { a: Row; top: number; height: number; showNames: boolean; risk?: number; compact?: boolean }) {
  const s = DISPLAY_STATUS[a.ds];
  return (
    <Link href={`/appointments/${a.id}`} style={{ top, height: Math.max(height - 2, 22) }}
      className={clsx("absolute inset-x-1 overflow-hidden rounded-md border border-l-4 border-slate-200/70 px-1.5 py-1 text-[11px] leading-tight shadow-sm transition hover:z-10 hover:shadow-lift focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-accent-400", s.card)}
      title={`${fmtTime(a.scheduled_start)}–${fmtTime(a.scheduled_end)} ${showNames ? a.full_name : a.mrn} · ${a.exam_name} · ${s.label}`}>
      <div className="flex items-center justify-between gap-1">
        <span className="truncate font-semibold text-slate-900">{showNames ? a.full_name : a.mrn}</span>
        <span className="flex shrink-0 items-center gap-0.5">
          {a.priority !== "ROUTINE" && <Zap className={clsx("h-3 w-3", a.priority === "EMERGENCY" ? "text-red-600" : "text-orange-500")} aria-label={a.priority} />}
          {a.contrast && <Syringe className="h-3 w-3 text-violet-600" aria-label="Contrast" />}
          {a.implant_count > 0 && <Cpu className="h-3 w-3 text-amber-600" aria-label="Implant on record" />}
          {risk ? <AlertOctagon className="h-3 w-3 text-red-500" aria-label="Prior no-show" /> : null}
        </span>
      </div>
      {!compact && height > 34 && <div className="truncate text-slate-600">{a.exam_name}</div>}
      {!compact && height > 50 && (
        <div className="mt-0.5 flex items-center gap-1">
          <span className={clsx("rounded px-1 py-px text-[9px] font-bold uppercase ring-1 ring-inset", s.badge)}>{s.label}</span>
          <span className="truncate text-[10px] text-slate-500">{fmtTime(a.scheduled_start)}</span>
        </div>
      )}
    </Link>
  );
}

function DayGrid({ date, appts, settings, group, scanners, radiographers, canBook, showNames, risk }: {
  date: string; appts: Row[]; settings: any; group: string; scanners: any[]; radiographers: any[]; canBook: boolean; showNames: boolean; risk: Map<string, number>;
}) {
  const { startMin, endMin, open } = hoursRange(date, settings, appts);
  const height = (endMin - startMin) * PX_PER_MIN;
  const cols = group === "radiographer"
    ? [...radiographers.map((r) => ({ id: r.id, name: r.full_name, sub: r.designation, match: (a: Row) => a.radiographer_id === r.id })), { id: "none", name: "Unassigned", sub: "", match: (a: Row) => !a.radiographer_id }]
    : scanners.map((s) => ({ id: s.id, name: s.name, sub: `${s.model} · ${s.field_strength_t}T`, match: (a: Row) => a.scanner_id === s.id, colour: s.colour }));
  const hours = Array.from({ length: (endMin - startMin) / 60 }, (_, i) => startMin + i * 60);
  const nowMin = localDate() === date ? (() => { const [h, m] = localTime(new Date()).split(":").map(Number); return h * 60 + m; })() : null;
  const minOf = (d: string) => { const [h, m] = localTime(d).split(":").map(Number); return localDate(d) !== date ? 24 * 60 : h * 60 + m; };
  return (
    <div className="card overflow-hidden">
      {!open && <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">The department is closed on this day per configured operating hours. Only Urgent/Emergency bookings are permitted.</div>}
      <div className="overflow-x-auto">
        <div style={{ minWidth: 80 + cols.length * 190 }}>
          <div className="sticky top-0 z-10 flex border-b border-slate-200 bg-slate-50/95">
            <div className="w-16 shrink-0" />
            {cols.map((c: any) => (
              <div key={c.id} className="min-w-[190px] flex-1 border-l border-slate-200 px-3 py-2">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">{c.colour && <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.colour }} />}{c.name}</div>
                <div className="text-[11px] text-slate-500">{c.sub} · {appts.filter((a) => c.match(a) && !["CANCELLED", "NO_SHOW"].includes(a.status)).length} booked</div>
              </div>
            ))}
          </div>
          <div className="relative flex" style={{ height }}>
            <div className="relative w-16 shrink-0">
              {hours.map((h) => <div key={h} className="absolute right-2 -translate-y-1/2 text-[10px] font-medium tabular-nums text-slate-400" style={{ top: (h - startMin) * PX_PER_MIN }}>{String(h / 60).padStart(2, "0")}:00</div>)}
            </div>
            {cols.map((c: any) => {
              const items = appts.filter(c.match);
              return (
                <div key={c.id} className="relative min-w-[190px] flex-1 border-l border-slate-200">
                  {/* slot lines and click-to-book */}
                  {Array.from({ length: (endMin - startMin) / 30 }, (_, i) => {
                    const m = startMin + i * 30;
                    const t = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
                    const outside = open ? m < Number(open.open.slice(0, 2)) * 60 + Number(open.open.slice(3)) || m >= Number(open.close.slice(0, 2)) * 60 + Number(open.close.slice(3)) : true;
                    const cls = clsx("absolute inset-x-0 border-t", i % 2 === 0 ? "border-slate-200" : "border-dashed border-slate-100", outside && "bg-slate-50/80");
                    return canBook && group === "scanner"
                      ? <Link key={i} href={`/appointments/new?date=${date}&time=${t}&scannerId=${c.id}`} className={clsx(cls, "group")} style={{ top: i * 30 * PX_PER_MIN, height: 30 * PX_PER_MIN }} aria-label={`Book ${t}`}>
                          <span className="hidden pl-2 pt-1 text-[10px] font-medium text-accent-700 group-hover:block">+ Book {t}</span></Link>
                      : <div key={i} className={cls} style={{ top: i * 30 * PX_PER_MIN, height: 30 * PX_PER_MIN }} />;
                  })}
                  {items.map((a) => {
                    const s = minOf(a.scheduled_start), e = Math.min(endMin, minOf(a.scheduled_end));
                    return <ApptCard key={a.id} a={a} top={(s - startMin) * PX_PER_MIN} height={(e - s) * PX_PER_MIN} showNames={showNames} risk={risk.get(a.patient_id)} />;
                  })}
                </div>
              );
            })}
            {nowMin !== null && nowMin >= startMin && nowMin <= endMin && (
              <div className="pointer-events-none absolute left-12 right-0 z-[5] border-t-2 border-red-500" style={{ top: (nowMin - startMin) * PX_PER_MIN }}>
                <span className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full bg-red-500" />
              </div>
            )}
          </div>
        </div>
      </div>
      {appts.length === 0 && <div className="border-t border-slate-100 p-4"><EmptyState title="No appointments on this day">{canBook ? "Click a time slot or use “New MRI appointment”." : null}</EmptyState></div>}
    </div>
  );
}

function WeekGrid({ from, appts, settings, showNames, canBook }: { from: string; appts: Row[]; settings: any; showNames: boolean; canBook: boolean }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  let startMin = 24 * 60, endMin = 0;
  for (const d of days) { const r = hoursRange(d, settings, appts); if (r.open || appts.some((a) => localDate(a.scheduled_start) === d)) { startMin = Math.min(startMin, r.startMin); endMin = Math.max(endMin, r.endMin); } }
  if (endMin <= startMin) { startMin = 7 * 60; endMin = 20 * 60; }
  const px = 1.1;
  const minOf = (d: string, day: string) => { const [h, m] = localTime(d).split(":").map(Number); return localDate(d) !== day ? 24 * 60 : h * 60 + m; };
  const today = localDate();
  return (
    <div className="card overflow-x-auto">
      <div className="min-w-[900px]">
        <div className="flex border-b border-slate-200 bg-slate-50">
          <div className="w-14 shrink-0" />
          {days.map((d) => (
            <Link key={d} href={`?view=day&date=${d}`} className={clsx("flex-1 border-l border-slate-200 px-2 py-2 text-center hover:bg-slate-100", d === today && "bg-accent-50")}>
              <div className="text-[11px] font-semibold uppercase text-slate-500">{new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short" })}</div>
              <div className={clsx("text-lg font-bold", d === today ? "text-accent-700" : "text-slate-800")}>{Number(d.slice(8))}</div>
              <div className="text-[10px] text-slate-500">{appts.filter((a) => localDate(a.scheduled_start) === d && !["CANCELLED", "NO_SHOW"].includes(a.status)).length} booked</div>
            </Link>
          ))}
        </div>
        <div className="relative flex" style={{ height: (endMin - startMin) * px }}>
          <div className="relative w-14 shrink-0">
            {Array.from({ length: (endMin - startMin) / 60 }, (_, i) => startMin + i * 60).map((h) => <div key={h} className="absolute right-2 text-[10px] tabular-nums text-slate-400" style={{ top: (h - startMin) * px }}>{String(h / 60).padStart(2, "0")}:00</div>)}
          </div>
          {days.map((d) => {
            const open = settings.operatingHours[String(weekday(d))];
            return (
              <div key={d} className={clsx("relative flex-1 border-l border-slate-200", !open && "bg-slate-50")}>
                {Array.from({ length: (endMin - startMin) / 60 }, (_, i) => <div key={i} className="absolute inset-x-0 border-t border-slate-100" style={{ top: i * 60 * px }} />)}
                {appts.filter((a) => localDate(a.scheduled_start) === d).map((a) => {
                  const s = minOf(a.scheduled_start, d), e = Math.min(endMin, minOf(a.scheduled_end, d));
                  return <ApptCard key={a.id} a={a} top={(s - startMin) * px} height={(e - s) * px} showNames={showNames} compact />;
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MonthGrid({ date, appts, qs }: { date: string; appts: Row[]; qs: (o: Record<string, string>) => string }) {
  const first = startOfMonth(date);
  const gridStart = startOfWeek(first);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const today = localDate();
  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-[11px] font-semibold uppercase text-slate-500">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const list = appts.filter((a) => localDate(a.scheduled_start) === d);
          const counts: Partial<Record<DisplayStatus, number>> = {};
          for (const a of list) counts[a.ds] = (counts[a.ds] ?? 0) + 1;
          const booked = list.filter((a) => !["CANCELLED", "NO_SHOW"].includes(a.status)).length;
          return (
            <Link key={d} href={qs({ view: "day", date: d })} className={clsx("min-h-[96px] border-b border-r border-slate-100 p-2 text-xs hover:bg-slate-50", d.slice(0, 7) !== date.slice(0, 7) && "bg-slate-50/60 text-slate-400")}>
              <div className={clsx("mb-1 font-bold tabular-nums", d === today && "inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent-600 text-white")}>{Number(d.slice(8))}</div>
              {booked > 0 && <div className="font-semibold text-slate-700">{booked} exam{booked === 1 ? "" : "s"}</div>}
              <div className="mt-1 flex flex-wrap gap-1">
                {Object.entries(counts).map(([k, n]) => <span key={k} title={`${DISPLAY_STATUS[k as DisplayStatus].label}: ${n}`} className="flex items-center gap-0.5"><span className={clsx("h-2 w-2 rounded-full", DISPLAY_STATUS[k as DisplayStatus].dot)} /><span className="text-[10px]">{n}</span></span>)}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
