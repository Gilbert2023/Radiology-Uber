import { clsx } from "clsx";
import { GitCompare } from "lucide-react";
import { requireActor } from "@/server/auth";
import { q, one } from "@/lib/db";
import { PageHeader, Card, FilterBar } from "@/components/ui";
const F = ["plane", "tr", "te", "ti", "flip_angle", "slice_thickness", "fov", "matrix", "nex", "bandwidth", "etl", "parallel_imaging"];
export default async function Compare({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireActor("protocols.view");
  const sp = await searchParams;
  const all = await q(`SELECT id, name, version, status FROM mri_protocols ORDER BY name, version DESC`);
  const load = async (id?: string) => (id ? { p: await one(`SELECT * FROM mri_protocols WHERE id=$1`, [id]), s: await q(`SELECT * FROM protocol_sequences WHERE protocol_id=$1 ORDER BY seq_order`, [id]) } : null);
  const [A, B] = await Promise.all([load(sp.a), load(sp.b)]);
  const names = [...new Set([...(A?.s ?? []).map((x: any) => x.name), ...(B?.s ?? []).map((x: any) => x.name)])];
  return (
    <div>
      <PageHeader title="Compare protocols" icon={GitCompare} crumbs={[{ label: "Protocol Library", href: "/protocols" }, { label: "Compare" }]} description="Side-by-side comparison of sequences and parameters. Differences are highlighted." />
      <FilterBar>{(["a", "b"] as const).map((k) => <div key={k} className="min-w-[280px] flex-1"><label className="label">Protocol {k.toUpperCase()}</label><select name={k} className="input" defaultValue={sp[k] ?? ""}><option value="">Select…</option>{all.map((p) => <option key={p.id} value={p.id}>{p.name} · v{p.version} ({p.status.toLowerCase()})</option>)}</select></div>)}</FilterBar>
      {A?.p && B?.p && (
        <Card title={`${A.p.name} v${A.p.version}  ↔  ${B.p.name} v${B.p.version}`} bodyClass="p-0 overflow-x-auto">
          <table className="table text-xs"><thead><tr><th>Sequence</th><th>Side</th>{F.map((f) => <th key={f}>{f.replace("_", " ")}</th>)}</tr></thead>
            <tbody>{names.map((n) => {
              const a = A.s.find((x: any) => x.name === n), b = B.s.find((x: any) => x.name === n);
              return ([["A", a], ["B", b]] as const).map(([side, s]) => (
                <tr key={n + side} className={side === "B" ? "border-b-2 border-slate-200" : ""}><td className="font-medium">{side === "A" ? n : ""}</td><td>{side}</td>
                  {F.map((f) => <td key={f} className={clsx((a?.[f] ?? null) !== (b?.[f] ?? null) && "bg-amber-100 font-semibold")}>{s ? s[f] ?? "—" : <span className="text-red-600">absent</span>}</td>)}</tr>));
            })}</tbody></table>
        </Card>
      )}
    </div>
  );
}
