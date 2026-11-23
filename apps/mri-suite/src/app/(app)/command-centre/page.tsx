import Link from "next/link";
import { clsx } from "clsx";
import {
  MonitorDot, CalendarDays, DoorOpen, Hourglass, ListChecks, ShieldCheck, ScanLine, CheckCircle2, UploadCloud, CloudOff, XCircle, Clock,
  Eye, EyeOff, Activity, AlertTriangle, Bell,
} from "lucide-react";
import { requireActor } from "@/server/auth";
import { q } from "@/lib/db";
import { APPT_SELECT } from "@/server/queries";
import { computeAlerts } from "@/server/alerts";
import { getSettings } from "@/server/settings";
import { PageHeader, Card, StatCard, StatusPill, MapBadge, EmptyState, Badge } from "@/components/ui";
import { HospitalLogo } from "@/components/brand";
import { AutoRefresh } from "@/components/client/misc";
import { SCANNER_STATUS, JOURNEY_STAGES, type DisplayStatus } from "@/lib/constants";
import { displayStatus, journeyIndex } from "@/lib/status";
import { dayBounds, localDate, fmtTime, fmtMinutes, minutesBetween, fmtLongDate } from "@/lib/time";

export const metadata = { title: "MRI Suite Command Centre" };

export default async function CommandCentre({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const actor = await requireActor("dashboard.command");
  const sp = await searchParams;
  const settings = await getSettings();
  const monitor = sp.monitor ? sp.monitor === "1" : settings.monitorModeDefault;
  const mask = monitor || !actor.permissions.has("patients.view");
  const today = localDate();
  const [start, end] = dayBounds(today);
  const rows = await q(`${APPT_SELECT} WHERE a.scheduled_start >= $1 AND a.scheduled_start < $2 ORDER BY a.scheduled_start`, [start, end]);
  const pendingPacsAll = await q(`SELECT pu.status, count(*)::int AS n FROM pacs_uploads pu WHERE pu.status <> 'SUCCESSFULLY_UPLOADED' OR pu.verification_status <> 'VERIFIED' GROUP BY 1`);
  const scanners = await q(`SELECT s.*, (SELECT row_to_json(x) FROM (
        SELECT a.id, a.accession_no, p.full_name, p.mrn, e.name AS exam, e.default_duration_min, sr.started_at, st.full_name AS radiographer, a.scheduled_end
          FROM appointments a JOIN patients p ON p.id=a.patient_id JOIN exam_types e ON e.id=a.exam_type_id JOIN scan_records sr ON sr.appointment_id=a.id JOIN staff st ON st.id=sr.radiographer_id
         WHERE a.scanner_id = s.id AND a.status='SCANNING' LIMIT 1) x) AS current,
        (SELECT row_to_json(m) FROM (SELECT event_type, fault_description, reported_at FROM maintenance_events WHERE scanner_id=s.id AND status<>'CLOSED' ORDER BY reported_at DESC LIMIT 1) m) AS open_event
      FROM scanners s WHERE s.is_active ORDER BY s.name`);
  const alerts = await computeAlerts({ mask });
  const now = new Date();
  const list = rows.map((r) => ({ ...r, ds: displayStatus(r, settings, now) as DisplayStatus }));
  const count = (f: (r: any) => boolean) => list.filter(f).length;
  const pacsCount = (s: string[]) => pendingPacsAll.filter((r) => s.includes(r.status)).reduce((a, b) => a + b.n, 0);
  const ident = (r: any) => (mask ? `${r.full_name.split(/\s+/).map((w: string) => w[0]).join("")} · …${String(r.mrn).slice(-4)}` : r.full_name);
  const waiting = (r: any) => (r.arrived_at && ["ARRIVED", "SCREENING", "PREPARATION", "CLEARED"].includes(r.status) ? minutesBetween(r.arrived_at) : null);

  const cards = [
    { label: "Today's appointments", value: count((r) => !["CANCELLED"].includes(r.status)), icon: CalendarDays, tone: "brand" as const, href: "/appointments" },
    { label: "Patients arrived", value: count((r) => !!r.arrived_at), icon: DoorOpen, tone: "sky" as const, href: "/arrivals" },
    { label: "Patients waiting", value: count((r) => ["ARRIVED", "SCREENING"].includes(r.status)), icon: Hourglass, tone: "amber" as const, href: "/worklist" },
    { label: "In preparation", value: count((r) => r.status === "PREPARATION"), icon: ListChecks, tone: "violet" as const, href: "/preparation" },
    { label: "Cleared for scanning", value: count((r) => r.status === "CLEARED"), icon: ShieldCheck, tone: "accent" as const, href: "/worklist" },
    { label: "Being scanned", value: count((r) => r.status === "SCANNING"), icon: ScanLine, tone: "indigo" as const, href: "/scanning" },
    { label: "Completed exams", value: count((r) => r.status === "COMPLETED"), icon: CheckCircle2, tone: "green" as const, href: "/register" },
    { label: "Pending PACS uploads", value: pacsCount(["PENDING_UPLOAD", "UPLOADING"]), icon: UploadCloud, tone: "sky" as const, href: "/pacs?status=PENDING", hint: "all dates" },
    { label: "Failed PACS uploads", value: pacsCount(["UPLOAD_FAILED", "REQUIRES_INVESTIGATION"]), icon: CloudOff, tone: "red" as const, href: "/pacs?status=FAILED", hint: "incl. investigation", alert: pacsCount(["UPLOAD_FAILED", "REQUIRES_INVESTIGATION"]) > 0 },
    { label: "Cancelled today", value: count((r) => r.status === "CANCELLED"), icon: XCircle, tone: "slate" as const, href: "/register?status=CANCELLED" },
    { label: "Delayed examinations", value: count((r) => r.ds === "DELAYED"), icon: Clock, tone: "red" as const, href: "/worklist", alert: count((r) => r.ds === "DELAYED") > 0 },
  ];
  const tracking = list.filter((r) => !["CANCELLED"].includes(r.status)).sort((a, b) => {
    const rank = (s: string) => ({ SCANNING: 0, CLEARED: 1, PREPARATION: 2, SCREENING: 3, ARRIVED: 4, BOOKED: 5, SCANNED: 6, INCOMPLETE: 7, COMPLETED: 8, NO_SHOW: 9 } as any)[s] ?? 10;
    return rank(a.status) - rank(b.status) || new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime();
  });

  return (
    <div>
      <PageHeader title="MRI Suite Command Centre" icon={MonitorDot} description={`Live departmental overview · ${fmtLongDate(today)}`}
        logo={<HospitalLogo size="sm" />}
        actions={<>
          <Link href={`?monitor=${monitor ? "0" : "1"}`} className={clsx("btn-sm", monitor ? "btn-accent" : "btn-secondary")} title="Minimise identifiable information on shared screens">
            {monitor ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{monitor ? "Shared monitor mode ON" : "Shared monitor mode"}
          </Link>
          <AutoRefresh seconds={30} />
        </>} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
        {cards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="Scanner status" icon={Activity}>
          <ul className="space-y-3">
            {scanners.map((s) => (
              <li key={s.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <ScannerGlyph status={s.status} />
                    <div><div className="font-semibold">{s.name}</div><div className="text-xs text-slate-500">{s.manufacturer} {s.model} · {s.field_strength_t}T</div></div>
                  </div>
                  <MapBadge map={SCANNER_STATUS} value={s.status} />
                </div>
                {s.open_event && <p className="mt-2 text-xs text-amber-800">Open {s.open_event.event_type.toLowerCase()}: {s.open_event.fault_description ?? "—"}</p>}
                {s.status_note && !s.open_event && <p className="mt-2 text-xs text-slate-600">{s.status_note}</p>}
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Current examination" icon={ScanLine}>
          {scanners.filter((s) => s.current).length === 0 ? <EmptyState title="No examination in progress" icon={ScanLine} /> : scanners.filter((s) => s.current).map((s) => {
            const c = s.current;
            const elapsed = minutesBetween(c.started_at);
            const expected = new Date(new Date(c.started_at).getTime() + c.default_duration_min * 60000);
            const pct = Math.min(100, (elapsed / c.default_duration_min) * 100);
            return (
              <div key={s.id} className="space-y-2">
                <div className="flex items-center justify-between"><Link href={`/appointments/${c.id}`} className="text-lg font-bold text-brand-900 hover:underline">{mask ? `${c.full_name.split(/\s+/).map((w: string) => w[0]).join("")} · …${String(c.mrn).slice(-4)}` : c.full_name}</Link><Badge className="bg-indigo-50 text-indigo-700 ring-indigo-200">Scanning</Badge></div>
                <div className="text-sm text-slate-600">{c.exam} · {s.name}</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div><div className="text-slate-500">Radiographer</div><div className="font-semibold">{c.radiographer}</div></div>
                  <div><div className="text-slate-500">Started</div><div className="font-semibold tabular-nums">{fmtTime(c.started_at)}</div></div>
                  <div><div className="text-slate-500">Expected end*</div><div className="font-semibold tabular-nums">{fmtTime(expected)}</div></div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={clsx("h-full rounded-full", pct >= 100 ? "bg-red-500" : "bg-indigo-500")} style={{ width: `${pct}%` }} /></div>
                <p className="text-[11px] text-slate-400">Elapsed {fmtMinutes(elapsed)}. *Expected end uses the configured default duration for this examination type.</p>
              </div>
            );
          })}
        </Card>
        <Card title={`Alerts & notifications (${alerts.length})`} icon={Bell} bodyClass="p-0">
          {alerts.length === 0 ? <div className="p-4"><EmptyState title="No active alerts" icon={CheckCircle2} /></div> : (
            <ul className="max-h-[340px] divide-y divide-slate-100 overflow-y-auto">
              {alerts.map((al) => (
                <li key={al.id}><Link href={al.href} className="flex gap-2.5 px-4 py-2.5 hover:bg-slate-50">
                  <AlertTriangle className={clsx("mt-0.5 h-4 w-4 shrink-0", al.severity === "critical" ? "text-red-500" : al.severity === "warning" ? "text-amber-500" : "text-sky-500")} />
                  <span className="min-w-0"><span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">{al.category}</span><span className="block text-sm font-medium text-slate-800">{al.title}</span>{al.detail && <span className="block text-xs text-slate-500">{al.detail}</span>}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-4" title="Live patient tracking" icon={Activity} subtitle={mask ? "Shared monitor mode: initials and last four MRN digits only" : undefined} bodyClass="overflow-x-auto">
        {tracking.length === 0 ? <EmptyState title="No patients scheduled today" /> : (
          <table className="table">
            <thead><tr><th>Patient</th><th>Examination</th><th>Slot</th><th>Arrival</th><th>Workflow stage</th><th>Radiographer</th><th>Waiting</th><th>Status</th></tr></thead>
            <tbody>
              {tracking.map((r) => {
                const w = waiting(r);
                const stage = JOURNEY_STAGES[journeyIndex(r.status)];
                return (
                  <tr key={r.id}>
                    <td><Link href={`/appointments/${r.id}`} className="link">{ident(r)}</Link>{!mask && <div className="text-xs text-slate-500">{r.mrn}</div>}</td>
                    <td>{r.exam_name}{r.contrast && <span className="ml-1 text-[10px] font-semibold text-violet-600">+C</span>}</td>
                    <td className="tabular-nums">{fmtTime(r.scheduled_start)}</td>
                    <td className="tabular-nums">{fmtTime(r.arrived_at)}</td>
                    <td><span className="text-xs font-medium">{r.status === "NO_SHOW" ? "—" : `${journeyIndex(r.status) + 1}. ${stage.label}`}</span>
                      {r.pacs_status && r.status !== "COMPLETED" && <div className="text-[11px] text-slate-500">PACS: {r.pacs_status.replace(/_/g, " ").toLowerCase()}</div>}</td>
                    <td>{r.radiographer_name ?? "—"}</td>
                    <td className={clsx("tabular-nums", w !== null && w >= settings.waitAlertMinutes && "font-bold text-red-600")}>{w !== null ? fmtMinutes(w) : "—"}</td>
                    <td><StatusPill status={r.ds} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function ScannerGlyph({ status }: { status: string }) {
  const c = { AVAILABLE: "#10b981", IN_USE: "#6366f1", MAINTENANCE: "#f59e0b", UNAVAILABLE: "#ef4444" }[status] ?? "#94a3b8";
  return (
    <svg viewBox="0 0 48 40" className="h-10 w-12" aria-hidden>
      <rect x="2" y="2" width="44" height="30" rx="9" fill="#eef3fb" stroke="#b3c6e8" />
      <circle cx="24" cy="17" r="9.5" fill="#fff" stroke={c} strokeWidth="3" />
      <rect x="10" y="30" width="28" height="4" rx="2" fill="#7f9fd4" />
      <circle cx="41" cy="8" r="3" fill={c} />
    </svg>
  );
}
