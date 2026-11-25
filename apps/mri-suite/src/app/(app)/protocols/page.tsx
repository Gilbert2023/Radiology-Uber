import Link from "next/link";
import { Layers, Plus, GitCompare } from "lucide-react";
import { requireActor } from "@/server/auth";
import { q } from "@/lib/db";
import { PageHeader, Card, MapBadge, Badge, FilterBar, Notice, EmptyState } from "@/components/ui";
import { PROTOCOL_CATEGORIES, PROTOCOL_STATUS } from "@/lib/constants";
import { fmtDate } from "@/lib/time";
export const metadata = { title: "MRI Protocol Library" };
export default async function Protocols({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const actor = await requireActor("protocols.view");
  const sp = await searchParams;
  const rows = await q(`SELECT p.*, (SELECT count(*) FROM protocol_sequences s WHERE s.protocol_id=p.id)::int AS seqs, u.full_name AS approver FROM mri_protocols p LEFT JOIN users u ON u.id=p.approved_by
     WHERE ($1='' OR p.name ILIKE $2 OR p.clinical_indication ILIKE $2) AND ($3='' OR p.category=$3) AND ($4='' OR p.kind=$4) AND ($5='1' OR p.status NOT IN ('ARCHIVED','SUPERSEDED'))
     ORDER BY p.category, p.name, p.version DESC`, [sp.q ?? "", `%${sp.q ?? ""}%`, sp.category ?? "", sp.kind ?? "", sp.archived ?? ""]);
  const cats = Object.keys(PROTOCOL_CATEGORIES).filter((c) => rows.some((r) => r.category === c));
  return (
    <div>
      <PageHeader title="MRI Protocol Library" icon={Layers} description="Departmental protocols for the GE SIGNA Creator 1.5T with version control and approval. Educational references are clearly separated."
        actions={<><Link href="/protocols/compare" className="btn-secondary"><GitCompare className="h-4 w-4" />Compare</Link>{actor.permissions.has("protocols.edit") && <Link href="/protocols/new" className="btn-accent"><Plus className="h-4 w-4" />New protocol</Link>}</>} />
      <Notice tone="warning" className="mb-4">Seeded protocols are <strong>draft templates</strong> containing sequence names only. No sequence parameters have been invented: enter values from the scanner's approved protocols, then submit for approval.</Notice>
      <FilterBar>
        <div className="min-w-[220px] flex-1"><label className="label">Search</label><input name="q" defaultValue={sp.q} className="input" /></div>
        <div><label className="label">Category</label><select name="category" className="input" defaultValue={sp.category ?? ""}><option value="">All</option>{Object.entries(PROTOCOL_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label className="label">Type</label><select name="kind" className="input" defaultValue={sp.kind ?? ""}><option value="">All</option><option value="DEPARTMENTAL">Departmental</option><option value="EDUCATIONAL_REFERENCE">Educational reference</option></select></div>
        <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="archived" value="1" defaultChecked={sp.archived === "1"} />Include archived / superseded</label>
      </FilterBar>
      {rows.length === 0 && <EmptyState title="No protocols match" />}
      <div className="space-y-4">
        {cats.map((c) => (
          <Card key={c} title={PROTOCOL_CATEGORIES[c]} bodyClass="p-0">
            <table className="table"><thead><tr><th>Protocol</th><th>Type</th><th>Version</th><th>Sequences</th><th>Status</th><th>Approved</th></tr></thead>
              <tbody>{rows.filter((r) => r.category === c).map((r) => <tr key={r.id}><td><Link href={`/protocols/${r.id}`} className="link">{r.name}</Link><div className="text-xs text-slate-500">{r.scanner_model}</div></td>
                <td>{r.kind === "DEPARTMENTAL" ? <Badge className="bg-brand-50 text-brand-800 ring-brand-200">Departmental</Badge> : <Badge className="bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-200">Educational reference</Badge>}</td>
                <td>v{r.version}</td><td className="tabular-nums">{r.seqs}</td><td><MapBadge map={PROTOCOL_STATUS} value={r.status} /></td><td className="text-xs">{r.approved_at ? `${fmtDate(r.approved_at)} · ${r.approver}` : "—"}</td></tr>)}</tbody></table>
          </Card>
        ))}
      </div>
    </div>
  );
}
