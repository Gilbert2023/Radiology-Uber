import { UserCheck } from "lucide-react";
import { requireActor } from "@/server/auth";
import { staffWorkload } from "@/server/analytics";
import { PageHeader, Card, Notice } from "@/components/ui";
import { PeriodFilter, resolvePeriod } from "@/components/PeriodFilter";
import { Bars } from "@/components/client/charts";
export const metadata = { title: "Staff Performance" };
export default async function StaffPerf({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireActor("analytics.view");
  const sp = await searchParams;
  const p = resolvePeriod(sp);
  const rows = (await staffWorkload(p)).filter((s: any) => s.exams || s.shifts || s.trainingCount);
  return (
    <div>
      <PageHeader title="Staff Performance & Workload" icon={UserCheck} description="Workload distribution, attendance, training and competencies – presented in context, not as a league table." />
      <PeriodFilter sp={sp} />
      <Notice className="mb-4">Examination counts depend on shifts worked, examination complexity and non-scanning duties (screening, supervision, QC). Use exams per rostered hour and case-mix together; this view intentionally contains no ranking.</Notice>
      <div className="mb-4 grid gap-4 xl:grid-cols-2">
        <Card title="Workload distribution (examinations)"><Bars data={rows.filter((r: any) => r.exams).map((r: any) => ({ ...r, simple: r.exams - r.complex_exams }))} x="name" horizontal stacked height={280} series={[{ key: "complex_exams", label: "Complex", color: "#8b5cf6" }, { key: "simple", label: "Other", color: "#1f3f7a" }]} /></Card>
        <Card title="Rostered hours vs scanning hours"><Bars data={rows.map((r: any) => ({ ...r, rh: +r.rosteredHours.toFixed(1), sh: +r.scan_hours.toFixed(1) }))} x="name" horizontal height={280} series={[{ key: "rh", label: "Rostered h", color: "#cbd5e1" }, { key: "sh", label: "Scanning h", color: "#179f8b" }]} /></Card>
      </div>
      <Card bodyClass="p-0 overflow-x-auto"><table className="table"><thead><tr><th>Staff</th><th>Exams</th><th>Contrast</th><th>Complex</th><th>Scan h</th><th>Shifts</th><th>On-call</th><th>Rostered h</th><th>Exams/rostered h</th><th>Present</th><th>Late</th><th>Absent</th><th>Training (h)</th><th>Competencies</th></tr></thead>
        <tbody>{rows.map((s: any) => <tr key={s.staffId}><td>{s.name}<div className="text-xs text-slate-500">{s.designation}</div></td><td>{s.exams}</td><td>{s.contrast_exams}</td><td>{s.complex_exams}</td><td>{s.scan_hours.toFixed(1)}</td><td>{s.shifts}</td><td>{s.onCall}</td><td>{s.rosteredHours.toFixed(1)}</td><td>{s.examsPerRosteredHour?.toFixed(2) ?? "—"}</td><td>{s.present}</td><td>{s.late}</td><td>{s.absent}</td><td>{s.trainingCount} ({s.trainingHours})</td><td>{s.competencies}{s.expiredCompetencies ? <span className="text-red-600"> ({s.expiredCompetencies} expired)</span> : ""}</td></tr>)}</tbody></table></Card>
    </div>
  );
}
