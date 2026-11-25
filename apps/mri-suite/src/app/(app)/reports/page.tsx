import { FileText, FileDown, FileSpreadsheet } from "lucide-react";
import { requireActor } from "@/server/auth";
import { q } from "@/lib/db";
import { REPORTS } from "@/server/reports";
import { PageHeader, Card, Notice, FilterBar } from "@/components/ui";
import { HospitalLogo } from "@/components/brand";
import { localDate, addDays, fmtDateTime, startOfMonth, endOfMonthExclusive } from "@/lib/time";
export const metadata = { title: "Monthly Departmental Reports" };
export default async function Reports({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const actor = await requireActor("analytics.view");
  const sp = await searchParams;
  const today = localDate();
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month : today.slice(0, 7);
  const from = `${month}-01`, to = endOfMonthExclusive(from);
  const canExport = actor.permissions.has("reports.export");
  const recent = await q(`SELECT r.*, u.full_name FROM report_exports r LEFT JOIN users u ON u.id=r.user_id ORDER BY at DESC LIMIT 15`);
  const lastMonth = addDays(startOfMonth(today), -1).slice(0, 7);
  const links = (key: string, extra = "") => canExport ? (
    <div className="flex gap-2"><a className="btn-secondary btn-sm" href={`/api/export/${key}?from=${from}&to=${to}${extra}&format=pdf`}><FileDown className="h-3.5 w-3.5" />PDF</a><a className="btn-secondary btn-sm" href={`/api/export/${key}?from=${from}&to=${to}${extra}&format=xlsx`}><FileSpreadsheet className="h-3.5 w-3.5" />Excel</a></div>) : null;
  return (
    <div>
      <PageHeader title="Departmental Reports" icon={FileText} logo={<HospitalLogo size="sm" />} description="Branded daily, weekly, monthly and annual reports generated from live data. Every export is logged in the audit trail." />
      {!canExport && <Notice className="mb-4">Your role can view analytics but not export reports.</Notice>}
      <FilterBar><div><label className="label">Reporting month</label><input type="month" name="month" defaultValue={month} className="input" /></div><a className="btn-ghost" href={`?month=${lastMonth}`}>Last month</a></FilterBar>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Object.entries(REPORTS).filter(([k, r]) => !["register", "appointments"].includes(k) && r.perm.some((p) => actor.permissions.has(p))).map(([k, r]) => (
          <Card key={k} title={r.label} subtitle={`Period: ${month}`}>{links(k)}</Card>
        ))}
        <Card title="Daily register & appointment list" subtitle={`Today (${today})`}><div className="space-y-2">{canExport && <><div className="flex gap-2"><a className="btn-secondary btn-sm" href={`/api/export/register?date=${today}&format=pdf`}>Register PDF</a><a className="btn-secondary btn-sm" href={`/api/export/register?date=${today}&format=xlsx`}>Register Excel</a></div>
          <div className="flex gap-2"><a className="btn-secondary btn-sm" href={`/api/export/appointments?date=${addDays(today, 1)}&format=pdf`}>Tomorrow's list PDF</a></div></>}</div></Card>
        <Card title="Weekly & annual" subtitle="Departmental performance report over other periods">{canExport && <div className="flex flex-wrap gap-2">
          <a className="btn-secondary btn-sm" href={`/api/export/monthly?from=${addDays(today, -6)}&to=${addDays(today, 1)}&format=pdf`}>Last 7 days PDF</a>
          <a className="btn-secondary btn-sm" href={`/api/export/monthly?from=${today.slice(0, 4)}-01-01&to=${addDays(today, 1)}&format=pdf`}>Year to date PDF</a>
          <a className="btn-secondary btn-sm" href={`/api/export/monthly?from=${today.slice(0, 4)}-01-01&to=${addDays(today, 1)}&format=xlsx`}>Year to date Excel</a></div>}</Card>
      </div>
      <Card title="Recent exports" className="mt-4" bodyClass="p-0"><table className="table text-xs"><thead><tr><th>When</th><th>Report</th><th>Format</th><th>By</th><th>Parameters</th></tr></thead>
        <tbody>{recent.map((r) => <tr key={r.id}><td>{fmtDateTime(r.at)}</td><td>{REPORTS[r.report]?.label ?? r.report}</td><td>{r.format}</td><td>{r.full_name}</td><td className="font-mono">{JSON.stringify(r.params)}</td></tr>)}</tbody></table></Card>
    </div>
  );
}
