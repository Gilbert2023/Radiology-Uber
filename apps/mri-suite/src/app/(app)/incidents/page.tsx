import Link from "next/link";
import { TriangleAlert, Plus, Lock, FileDown } from "lucide-react";
import { requireActor } from "@/server/auth";
import { q } from "@/lib/db";
import { PageHeader, Card, StatCard, MapBadge, Notice, EmptyState, DemoTag } from "@/components/ui";
import { HospitalLogo } from "@/components/brand";
import { Bars } from "@/components/client/charts";
import { INCIDENT_CATEGORIES, INCIDENT_SEVERITY, INCIDENT_STATUS } from "@/lib/constants";
import { fmtDateTime } from "@/lib/time";
export const metadata = { title: "MRI Incident & Safety Reporting" };
export default async function Incidents() {
  const actor = await requireActor("incidents.report", "incidents.view");
  const canView = actor.permissions.has("incidents.view");
  const rows = await q(`SELECT i.* FROM incidents i WHERE $1 OR i.reported_by=$2 ORDER BY occurred_at DESC LIMIT 300`, [canView, actor.userId]);
  const trend = canView ? await q(`SELECT to_char(date_trunc('month', occurred_at AT TIME ZONE 'Africa/Accra'),'YYYY-MM') AS m, ${Object.keys(INCIDENT_CATEGORIES).map((c) => `count(*) FILTER (WHERE category='${c}')::int AS "${c}"`).join(", ")} FROM incidents WHERE occurred_at > now() - interval '12 months' GROUP BY 1 ORDER BY 1`) : [];
  return (
    <div>
      <PageHeader title="MRI Incident & Safety Reporting" icon={TriangleAlert} logo={<HospitalLogo size="sm" showName={false} />} description="Confidential reporting of patient incidents, contrast reactions, projectile events, burns, falls, near misses and equipment failures."
        actions={<>{actor.permissions.has("reports.export") && canView && <a className="btn-secondary" href="/api/export/incidents?format=pdf"><FileDown className="h-4 w-4" />PDF report</a>}<Link href="/incidents/new" className="btn-accent"><Plus className="h-4 w-4" />Report incident</Link></>} />
      {!canView && <Notice className="mb-4" title="Confidential"><Lock className="mr-1 inline h-4 w-4" />You can see incidents you reported. Full incident data is restricted to authorised personnel.</Notice>}
      {canView && <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Open" value={rows.filter((r) => r.status !== "CLOSED").length} icon={TriangleAlert} tone="red" />
        <StatCard label="Severe / critical open" value={rows.filter((r) => r.status !== "CLOSED" && ["SEVERE", "CRITICAL"].includes(r.severity)).length} icon={TriangleAlert} tone="red" />
        <StatCard label="Near misses (12 m)" value={rows.filter((r) => r.category === "NEAR_MISS").length} icon={TriangleAlert} tone="amber" />
        <StatCard label="Closed" value={rows.filter((r) => r.status === "CLOSED").length} icon={TriangleAlert} tone="green" />
      </div>}
      {canView && <Card title="Incident trend by category (12 months)" className="mb-4"><Bars data={trend} x="m" stacked series={Object.entries(INCIDENT_CATEGORIES).map(([k, v]) => ({ key: k, label: v }))} /></Card>}
      <Card bodyClass="p-0 overflow-x-auto">{rows.length === 0 ? <div className="p-4"><EmptyState title="No incidents" /></div> : (
        <table className="table"><thead><tr><th>Reference</th><th>Occurred</th><th>Category</th><th>Severity</th><th>Summary</th><th>Status</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id}><td>{canView ? <Link className="link" href={`/incidents/${r.id}`}>{r.ref_no}</Link> : r.ref_no} {r.is_demo && <DemoTag />}</td><td className="whitespace-nowrap">{fmtDateTime(r.occurred_at)}</td><td>{INCIDENT_CATEGORIES[r.category]}</td><td><MapBadge map={INCIDENT_SEVERITY} value={r.severity} /></td><td className="max-w-md truncate">{r.description}</td><td><MapBadge map={INCIDENT_STATUS} value={r.status} /></td></tr>)}</tbody></table>)}</Card>
    </div>
  );
}
