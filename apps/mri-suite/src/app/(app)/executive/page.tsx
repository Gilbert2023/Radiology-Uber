import Link from "next/link";
import { LayoutDashboard, ScanLine, Activity, Timer, UploadCloud, ShieldCheck, Users, FileDown, FileSpreadsheet, Percent, CheckCircle2, Syringe, TriangleAlert, Gauge, SprayCan, UserX, XCircle, Clock } from "lucide-react";
import { requireActor } from "@/server/auth";
import { examVolume, volumeSeries, utilisation, waitingTimes, pacsKpis, qualitySafety, staffWorkload, DEFINITIONS } from "@/server/analytics";
import { PageHeader, Card, StatCard, Pct, Notice } from "@/components/ui";
import { HospitalLogo } from "@/components/brand";
import { PeriodFilter, resolvePeriod } from "@/components/PeriodFilter";
import { Bars, Lines, Donut } from "@/components/client/charts";
import { BODY_REGIONS } from "@/lib/constants";
import { fmtMinutes, addDays, localDate } from "@/lib/time";

export const metadata = { title: "MRI Supervisor Executive Dashboard" };
export default async function Executive({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const actor = await requireActor("dashboard.executive");
  const sp = await searchParams;
  const p = resolvePeriod(sp);
  const today = localDate();
  const [vol, util, waits, pacs, quality, staff, weekly, monthly, annual] = await Promise.all([
    examVolume(p), utilisation(p), waitingTimes(p), pacsKpis(p), qualitySafety(p), staffWorkload(p),
    volumeSeries("week", { from: addDays(today, -7 * 12), to: addDays(today, 1) }), volumeSeries("month", { from: addDays(today, -365), to: addDays(today, 1) }), volumeSeries("year", { from: addDays(today, -365 * 5), to: addDays(today, 1) }),
  ]);
  const u = util.scanners.reduce((a, s) => ({ avail: a.avail + s.availableHours, scan: a.scan + s.scanningHours, down: a.down + s.downtimeHours, idle: a.idle + s.idleHours, n: a.n + s.examinations }), { avail: 0, scan: 0, down: 0, idle: 0, n: 0 });
  const t = vol.totals;
  const exp = (fmt: string) => `/api/export/monthly?from=${p.from}&to=${p.to}&format=${fmt}`;
  return (
    <div>
      <PageHeader title="MRI Supervisor Executive Dashboard" icon={LayoutDashboard} logo={<HospitalLogo size="sm" />} description={`Departmental performance ${p.from} to ${p.toIncl}. All figures are calculated from database records.`}
        actions={actor.permissions.has("reports.export") && <><a className="btn-secondary" href={exp("pdf")}><FileDown className="h-4 w-4" />PDF</a><a className="btn-secondary" href={exp("xlsx")}><FileSpreadsheet className="h-4 w-4" />Excel</a></>} />
      <PeriodFilter sp={sp} />
      <h2 className="mb-2 mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">Examination volume</h2>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <StatCard label="Examinations performed" value={t.total} icon={ScanLine} tone="brand" href="/analytics/performance" />
        <StatCard label="Completed (PACS confirmed)" value={t.completed} icon={CheckCircle2} tone="green" />
        <StatCard label="Incomplete" value={t.incomplete} icon={XCircle} tone="red" />
        <StatCard label="Contrast / non-contrast" value={`${t.contrast} / ${t.non_contrast}`} icon={Syringe} tone="violet" />
        <StatCard label="Inpatient / outpatient" value={`${t.inpatient} / ${t.outpatient}`} icon={Users} tone="sky" hint={t.emergency ? `${t.emergency} emergency` : undefined} />
        <StatCard label="Per operating day" value={util.scanners[0]?.examsPerOperatingDay?.toFixed(1) ?? "—"} icon={Activity} tone="accent" />
      </div>
      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        <Card title="Daily examination volume" className="xl:col-span-2"><Bars data={vol.byDay.map((d: any) => ({ ...d, nc: d.n - d.contrast }))} x="day" stacked series={[{ key: "nc", label: "Non-contrast", color: "#2c3135" }, { key: "contrast", label: "Contrast", color: "#8b5cf6" }]} height={240} /></Card>
        <Card title="By body region"><Donut data={vol.byRegion.map((r: any) => ({ name: BODY_REGIONS[r.key] ?? r.key, value: r.n }))} height={240} /></Card>
        <Card title="Weekly volume (12 weeks)"><Bars data={weekly} x="bucket" series={[{ key: "n", label: "Examinations" }]} height={200} /></Card>
        <Card title="Monthly volume (12 months)"><Bars data={monthly} x="bucket" series={[{ key: "n", label: "Examinations", color: "#16a34a" }]} height={200} /></Card>
        <Card title="Annual volume"><Bars data={annual.map((a: any) => ({ ...a, bucket: a.bucket.slice(0, 4) }))} x="bucket" series={[{ key: "n", label: "Examinations", color: "#0ea5e9" }]} height={200} /></Card>
        <Card title="By referring department" className="xl:col-span-2"><Bars data={vol.byDept.slice(0, 10)} x="key" horizontal series={[{ key: "n", label: "Examinations" }]} height={260} /></Card>
        <Card title="Completed vs incomplete"><Donut data={[{ name: "Completed", value: t.completed }, { name: "Awaiting PACS", value: t.awaiting_pacs }, { name: "Incomplete", value: t.incomplete }]} height={260} /></Card>
      </div>

      <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Scanner utilisation</h2>
      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          {[["Available hours", u.avail.toFixed(1)], ["Actual scanning hours", u.scan.toFixed(1)], ["Utilisation", u.avail ? `${((u.scan / u.avail) * 100).toFixed(1)}%` : "—"], ["Avg exam duration", fmtMinutes(util.scanners[0]?.avgExamMinutes)], ["Idle hours", u.idle.toFixed(1)], ["Equipment downtime", `${u.down.toFixed(1)} h`], ["Operating days", util.scanners[0]?.operatingDays ?? 0]].map(([k, v]) => (
            <div key={k as string}><div className="text-xs text-slate-500">{k}</div><div className="kpi-num">{v}</div></div>))}
        </div>
        <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-900"><strong>{DEFINITIONS.utilisation}</strong> {DEFINITIONS.availableHours} <Link href="/analytics/utilisation" className="link">Details →</Link></p>
      </Card>

      <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Patient waiting time</h2>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 2xl:grid-cols-7">
        <StatCard label="Booking lead time" value={waits.booking_lead_days !== null ? `${waits.booking_lead_days.toFixed(1)} d` : "—"} icon={Timer} tone="brand" />
        <StatCard label="Arrival → screening" value={fmtMinutes(waits.arrival_to_screening)} icon={Timer} tone="sky" />
        <StatCard label="Screening → scan" value={fmtMinutes(waits.screening_to_scan)} icon={Timer} tone="violet" />
        <StatCard label="Total journey" value={fmtMinutes(waits.journey)} icon={Clock} tone="accent" />
        <StatCard label="Delayed" value={waits.delayed} icon={Clock} tone="amber" />
        <StatCard label="No-shows" value={waits.no_shows} icon={UserX} tone="slate" />
        <StatCard label="Cancellations" value={waits.cancellations} icon={XCircle} tone="slate" />
      </div>

      <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">PACS performance</h2>
      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Success rate" value={<Pct v={pacs.successRate} />} icon={Percent} tone="green" href="/pacs" />
          <StatCard label="Failure rate" value={<Pct v={pacs.failureRate} />} icon={Percent} tone="red" />
          <StatCard label="Pending" value={pacs.pending} icon={UploadCloud} tone="amber" />
          <StatCard label="Failed + investigation" value={pacs.failed + pacs.investigation} icon={UploadCloud} tone="red" alert={pacs.failed + pacs.investigation > 0} />
          <StatCard label="Avg scan → upload" value={fmtMinutes(pacs.avg_minutes)} icon={Timer} tone="sky" />
          <StatCard label="Uploaded" value={`${pacs.success}/${pacs.total}`} icon={CheckCircle2} tone="accent" />
        </div>
        <Card title="Upload trend" className="xl:col-span-2"><Bars data={pacs.daily} x="bucket" stacked height={230} series={[{ key: "success", label: "Uploaded", color: "#16a34a" }, { key: "pending", label: "Pending", color: "#f59e0b" }, { key: "failed", label: "Failed", color: "#ef4444" }]} /></Card>
      </div>

      <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Quality & safety</h2>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Screening compliance" value={<Pct v={quality.screening.compliancePct} />} icon={ShieldCheck} tone="green" />
        <StatCard label="Contrast reactions" value={quality.contrast.reactions} icon={Syringe} tone="red" />
        <StatCard label="Extravasations" value={quality.contrast.extravasations} icon={Syringe} tone="amber" />
        <StatCard label="Incomplete exams" value={quality.scans.incomplete} icon={XCircle} tone="red" />
        <StatCard label="Repeat sequences" value={quality.scans.repeats} icon={ScanLine} tone="slate" hint={`${quality.scans.with_repeats} exams`} />
        <StatCard label="Daily QC compliance" value={<Pct v={quality.qc[0]?.compliancePct} />} icon={Gauge} tone="accent" />
        <StatCard label="Safety incidents" value={quality.incidentTotal} icon={TriangleAlert} tone="red" href="/incidents" />
        <StatCard label="Infection control" value={<Pct v={quality.cleaning.compliancePct} />} icon={SprayCan} tone="green" />
      </div>

      <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Staff workload</h2>
      <Card bodyClass="p-0 overflow-x-auto" className="mb-4">
        <Notice className="m-3">Workload is shown with rostered hours, case-mix and attendance for context. It is deliberately not a ranking – compare examinations per rostered hour alongside complexity and shifts worked.</Notice>
        <table className="table"><thead><tr><th>Staff</th><th>Exams</th><th>Contrast</th><th>Complex*</th><th>Scan hours</th><th>Shifts</th><th>Rostered h</th><th>Exams / rostered h</th><th>Present / late / absent</th><th>Training</th><th>Competencies</th></tr></thead>
          <tbody>{staff.filter((s: any) => s.exams || s.shifts).map((s: any) => <tr key={s.staffId}><td>{s.name}<div className="text-xs text-slate-500">{s.designation}</div></td><td className="tabular-nums">{s.exams}</td><td className="tabular-nums">{s.contrast_exams}</td><td className="tabular-nums">{s.complex_exams}</td><td className="tabular-nums">{s.scan_hours.toFixed(1)}</td><td className="tabular-nums">{s.shifts}{s.onCall ? ` +${s.onCall} on-call` : ""}</td><td className="tabular-nums">{s.rosteredHours.toFixed(1)}</td><td className="tabular-nums">{s.examsPerRosteredHour?.toFixed(2) ?? "—"}</td><td className="tabular-nums">{s.present} / {s.late} / {s.absent}</td><td className="tabular-nums">{s.trainingCount}</td><td className="tabular-nums">{s.competencies}{s.expiredCompetencies ? <span className="text-red-600"> ({s.expiredCompetencies} expired)</span> : ""}</td></tr>)}</tbody></table>
        <p className="px-3 pb-3 text-[11px] text-slate-500">*Complex = cardiac, abdominal, pelvic and vascular examinations. Rostered hours use standard shift lengths (morning 6.5 h, afternoon 6 h, night 11.5 h; on-call not counted).</p>
      </Card>
    </div>
  );
}
