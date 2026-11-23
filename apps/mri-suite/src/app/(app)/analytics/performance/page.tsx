import { BarChart3, FileSpreadsheet } from "lucide-react";
import { requireActor } from "@/server/auth";
import { examVolume, qualitySafety, volumeSeries } from "@/server/analytics";
import { PageHeader, Card, StatCard, Pct } from "@/components/ui";
import { PeriodFilter, resolvePeriod } from "@/components/PeriodFilter";
import { Bars, Donut, Lines } from "@/components/client/charts";
import { BODY_REGIONS, INCIDENT_CATEGORIES } from "@/lib/constants";
export const metadata = { title: "MRI Performance Analytics" };
export default async function Performance({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const actor = await requireActor("analytics.view");
  const sp = await searchParams;
  const p = resolvePeriod(sp);
  const [v, qs, wk] = await Promise.all([examVolume(p), qualitySafety(p), volumeSeries("week", p)]);
  const t = v.totals;
  return (
    <div>
      <PageHeader title="MRI Performance Analytics" icon={BarChart3} description="Examination volume, case-mix, referral sources and quality indicators."
        actions={actor.permissions.has("reports.export") && <a className="btn-secondary" href={`/api/export/volume?from=${p.from}&to=${p.to}&format=xlsx`}><FileSpreadsheet className="h-4 w-4" />Export</a>} />
      <PeriodFilter sp={sp} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-6">
        <StatCard label="Examinations" value={t.total} tone="brand" /><StatCard label="Completed" value={t.completed} tone="green" /><StatCard label="Incomplete" value={t.incomplete} tone="red" />
        <StatCard label="Contrast %" value={<Pct v={t.total ? (t.contrast / t.total) * 100 : null} />} tone="violet" /><StatCard label="Inpatient %" value={<Pct v={t.total ? (t.inpatient / t.total) * 100 : null} />} tone="sky" />
        <StatCard label="Exams with repeats" value={t.with_repeats} tone="amber" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Daily volume"><Lines area data={v.byDay} x="day" series={[{ key: "n", label: "Examinations" }, { key: "contrast", label: "Contrast" }]} /></Card>
        <Card title="Weekly volume"><Bars data={wk} x="bucket" series={[{ key: "n", label: "Examinations", color: "#179f8b" }]} /></Card>
        <Card title="By body region"><Donut data={v.byRegion.map((r: any) => ({ name: BODY_REGIONS[r.key] ?? r.key, value: r.n }))} height={280} /></Card>
        <Card title="By examination type"><Bars data={v.byExam.slice(0, 12)} x="key" horizontal series={[{ key: "n", label: "Examinations" }]} height={320} /></Card>
        <Card title="By referring department"><Bars data={v.byDept} x="key" horizontal series={[{ key: "n", label: "Examinations", color: "#0ea5e9" }]} height={320} /></Card>
        <Card title="Patient type"><Donut data={[{ name: "Outpatient", value: t.outpatient }, { name: "Inpatient", value: t.inpatient }, { name: "Emergency", value: t.emergency }]} height={280} /></Card>
        <Card title="Safety incidents by category"><Bars data={qs.incidents.map((i: any) => ({ ...i, key: INCIDENT_CATEGORIES[i.key] }))} x="key" horizontal series={[{ key: "n", label: "Incidents", color: "#ef4444" }]} height={240} /></Card>
        <Card title="Quality indicators"><ul className="grid grid-cols-2 gap-3 text-sm">
          {[["Screening compliance", <Pct key="1" v={qs.screening.compliancePct} />], ["Contrast administrations", qs.contrast.administrations], ["Contrast reactions", qs.contrast.reactions], ["Extravasations", qs.contrast.extravasations], ["Repeat sequences", qs.scans.repeats], ["Cleaning compliance", <Pct key="2" v={qs.cleaning.compliancePct} />]].map(([k, v]) => <li key={k as string} className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">{k}</div><div className="kpi-num">{v}</div></li>)}</ul></Card>
      </div>
    </div>
  );
}
