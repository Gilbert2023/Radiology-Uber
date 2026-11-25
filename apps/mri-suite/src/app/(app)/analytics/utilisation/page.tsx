import { Activity } from "lucide-react";
import { requireActor } from "@/server/auth";
import { utilisation, DEFINITIONS } from "@/server/analytics";
import { PageHeader, Card, Notice, Pct } from "@/components/ui";
import { PeriodFilter, resolvePeriod } from "@/components/PeriodFilter";
import { Bars, Lines } from "@/components/client/charts";
import { fmtMinutes } from "@/lib/time";
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const metadata = { title: "Scanner Utilisation" };
export default async function Util({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireActor("analytics.view");
  const sp = await searchParams;
  const p = resolvePeriod(sp);
  const u = await utilisation(p);
  return (
    <div>
      <PageHeader title="Scanner Utilisation" icon={Activity} description="Available versus actual scanning hours per scanner." />
      <PeriodFilter sp={sp} />
      <Notice className="mb-4" title="Calculation">
        <p className="font-mono text-sm">Scanner utilisation (%) = Actual scanning hours ÷ Available scanner hours × 100</p>
        <p className="mt-1">{DEFINITIONS.availableHours} {DEFINITIONS.scanningHours} {DEFINITIONS.idle}</p>
        <p className="mt-1">Configured operating hours: {Object.entries(u.operatingHours).map(([d, h]: any) => `${DAYS[+d].slice(0, 3)} ${h ? `${h.open}–${h.close}` : "closed"}`).join(" · ")}</p>
      </Notice>
      <Card className="mb-4" bodyClass="p-0 overflow-x-auto"><table className="table"><thead><tr><th>Scanner</th><th>Operating days</th><th>Available h</th><th>Scanning h</th><th>Utilisation</th><th>Exams</th><th>Exams / day</th><th>Avg duration</th><th>Downtime h (in hours)</th><th>Idle h</th></tr></thead>
        <tbody>{u.scanners.map((s) => <tr key={s.scannerId}><td>{s.scanner}<div className="text-xs text-slate-500">{s.model}</div></td><td>{s.operatingDays}</td><td className="tabular-nums">{s.availableHours.toFixed(1)}</td><td className="tabular-nums">{s.scanningHours.toFixed(1)}</td><td className="font-semibold"><Pct v={s.utilisationPct} /></td><td>{s.examinations}</td><td>{s.examsPerOperatingDay?.toFixed(1) ?? "—"}</td><td>{fmtMinutes(s.avgExamMinutes)}</td><td className="tabular-nums">{s.downtimeHours.toFixed(1)} ({s.downtimeOperatingHours.toFixed(1)})</td><td className="tabular-nums">{s.idleHours.toFixed(1)}</td></tr>)}</tbody></table></Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Daily utilisation %"><Lines data={u.daily} x="day" unit="%" series={[{ key: "pct", label: "Utilisation %" }]} /></Card>
        <Card title="Scanning vs available hours per day"><Bars data={u.daily} x="day" series={[{ key: "availableHours", label: "Available h", color: "#cbd5e1" }, { key: "scanningHours", label: "Scanning h", color: "#2c3135" }]} /></Card>
        <Card title="Scans started by hour of day" className="xl:col-span-2"><Bars data={u.byHour.map((h: any) => ({ ...h, hour: `${String(h.hour).padStart(2, "0")}:00` }))} x="hour" series={[{ key: "n", label: "Scans", color: "#16a34a" }]} /></Card>
      </div>
    </div>
  );
}
