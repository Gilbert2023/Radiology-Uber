import { ScrollText } from "lucide-react";
import { requireActor } from "@/server/auth";
import { q } from "@/lib/db";
import { PageHeader, Card, FilterBar } from "@/components/ui";
import { fmtDateTime } from "@/lib/time";
export const metadata = { title: "Audit Logs" };
export default async function Audit({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireActor("admin.audit");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const rows = await q(`SELECT * FROM audit_logs WHERE ($1='' OR action ILIKE $2) AND ($3='' OR username ILIKE $4) AND ($5='' OR entity=$5 OR entity_id=$5) ORDER BY at DESC LIMIT 100 OFFSET $6`,
    [sp.action ?? "", `%${sp.action ?? ""}%`, sp.user ?? "", `%${sp.user ?? ""}%`, sp.entity ?? "", (page - 1) * 100]);
  const qs = (n: number) => `?${new URLSearchParams({ ...sp, page: String(n) })}`;
  return (
    <div>
      <PageHeader title="Audit Logs" icon={ScrollText} description="Append-only record of sign-ins, record views, data changes, safety decisions, exports and permission changes (database-enforced immutability)." />
      <FilterBar><div><label className="label">Action contains</label><input name="action" defaultValue={sp.action} className="input" placeholder="e.g. screening, login, export" /></div><div><label className="label">User</label><input name="user" defaultValue={sp.user} className="input" /></div><div><label className="label">Entity type or ID</label><input name="entity" defaultValue={sp.entity} className="input" /></div></FilterBar>
      <Card bodyClass="p-0 overflow-x-auto"><table className="table text-xs"><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th><th>IP</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id}><td className="whitespace-nowrap">{fmtDateTime(r.at)}</td><td>{r.username ?? "system"}</td><td className="font-mono">{r.action}</td><td>{r.entity}<div className="font-mono text-[10px] text-slate-400">{r.entity_id}</div></td><td className="max-w-md truncate font-mono text-[10px]" title={JSON.stringify(r.details)}>{r.details ? JSON.stringify(r.details) : ""}</td><td>{r.ip}</td></tr>)}</tbody></table></Card>
      <div className="mt-3 flex gap-2">{page > 1 && <a className="btn-secondary btn-sm" href={qs(page - 1)}>Newer</a>}{rows.length === 100 && <a className="btn-secondary btn-sm" href={qs(page + 1)}>Older</a>}</div>
    </div>
  );
}
