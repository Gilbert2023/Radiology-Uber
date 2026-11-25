import Link from "next/link";
import { Cpu, Plus, Database, ShieldAlert, ShieldQuestion, ShieldX, ShieldCheck, AlertTriangle } from "lucide-react";
import { requireActor } from "@/server/auth";
import { q } from "@/lib/db";
import { PageHeader, Card, StatCard, TabLinks, MapBadge, EmptyState, FilterBar, DemoTag, Notice } from "@/components/ui";
import { HospitalLogo } from "@/components/brand";
import { SAFETY_CLASS, VERIFICATION_STATUS, labelize } from "@/lib/constants";
import { fmtDate } from "@/lib/time";

export const metadata = { title: "MRI Implant & Device Registry" };
const TABS: Record<string, { label: string; where: string }> = {
  worklist: { label: "Verification worklist", where: "pi.verification_status IN ('NOT_STARTED','PENDING_DOCUMENTATION','UNDER_REVIEW')" },
  pending_docs: { label: "Pending documentation", where: "pi.verification_status = 'PENDING_DOCUMENTATION'" },
  escalated: { label: "Escalated / unsuccessful", where: "pi.verification_status IN ('ESCALATED','UNSUCCESSFUL')" },
  conditional: { label: "MR Conditional", where: "pi.safety_class = 'MR_CONDITIONAL'" },
  unsafe: { label: "MR Unsafe", where: "pi.safety_class = 'MR_UNSAFE'" },
  unknown: { label: "Unknown status", where: "pi.safety_class = 'UNKNOWN'" },
  verified: { label: "Previously verified", where: "pi.verification_status = 'VERIFIED'" },
  all: { label: "All implants", where: "true" },
};

export default async function Implants({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const actor = await requireActor("implants.view");
  const sp = await searchParams;
  const tab = TABS[sp.tab] ? sp.tab : "worklist";
  const params: unknown[] = [];
  let filter = "";
  if (sp.q) { params.push(`%${sp.q}%`); filter += ` AND (p.full_name ILIKE $${params.length} OR p.mrn ILIKE $${params.length} OR pi.device_name ILIKE $${params.length} OR pi.manufacturer ILIKE $${params.length} OR pi.model_name ILIKE $${params.length} OR pi.model_number ILIKE $${params.length} OR ic.name ILIKE $${params.length})`; }
  if (sp.cls) { params.push(sp.cls); filter += ` AND pi.safety_class = $${params.length}`; }
  const base = `FROM patient_implants pi JOIN patients p ON p.id=pi.patient_id JOIN implant_categories ic ON ic.id=pi.category_id WHERE true ${filter}`;
  const rows = await q(`SELECT pi.*, p.full_name, p.mrn, ic.name AS category, ic.group_name,
      (SELECT count(*) FROM documents d WHERE d.owner_type='IMPLANT' AND d.owner_id=pi.id)::int AS docs,
      (SELECT max(verified_at) FROM implant_verifications v WHERE v.implant_id=pi.id) AS last_verified ${base} AND ${TABS[tab].where} ORDER BY pi.updated_at DESC LIMIT 300`, params);
  const counts = await q(`SELECT ${Object.entries(TABS).map(([k, t]) => `count(*) FILTER (WHERE ${t.where})::int AS ${k}`).join(", ")} ${base}`, params);
  const byCat = await q(`SELECT ic.group_name AS k, count(*)::int AS n FROM patient_implants pi JOIN implant_categories ic ON ic.id=pi.category_id GROUP BY 1 ORDER BY 2 DESC`);
  const byMan = await q(`SELECT COALESCE(NULLIF(manufacturer,''),'Not documented') AS k, count(*)::int AS n FROM patient_implants GROUP BY 1 ORDER BY 2 DESC LIMIT 8`);
  const byLoc = await q(`SELECT COALESCE(anatomical_location,'Not recorded') AS k, count(*)::int AS n FROM patient_implants GROUP BY 1 ORDER BY 2 DESC LIMIT 8`);
  const c = counts[0];
  const showNames = actor.permissions.has("patients.view");
  return (
    <div>
      <PageHeader title="MRI Implant & Device Registry" icon={Cpu} logo={<HospitalLogo size="sm" showName={false} />}
        description="Document, classify, verify and monitor implants, devices and metallic foreign bodies. Decision-support only – not an automatic clearance engine."
        actions={<><Link href="/implants/devices" className="btn-secondary"><Database className="h-4 w-4" />Implant database</Link>{actor.permissions.has("implants.manage") && <Link href="/implants/new" className="btn-accent"><Plus className="h-4 w-4" />Register new implant</Link>}</>} />
      <Notice tone="warning" className="mb-4" title="Critical safety restriction">MRI safety is never inferred from material, category or a previous assessment. Titanium is not automatically MR Safe; stainless steel is not automatically MR Unsafe. Final clearance follows manufacturer-approved conditions, institutional policy and authorised MR safety personnel.</Notice>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Pending verification" value={c.worklist} icon={ShieldQuestion} tone="amber" href="?tab=worklist" />
        <StatCard label="Escalated / unsuccessful" value={c.escalated} icon={ShieldAlert} tone="red" href="?tab=escalated" />
        <StatCard label="MR Conditional" value={c.conditional} icon={AlertTriangle} tone="violet" href="?tab=conditional" />
        <StatCard label="MR Unsafe" value={c.unsafe} icon={ShieldX} tone="red" href="?tab=unsafe" />
        <StatCard label="Verified" value={c.verified} icon={ShieldCheck} tone="green" href="?tab=verified" />
      </div>
      <FilterBar>
        <input type="hidden" name="tab" value={tab} />
        <div className="min-w-[260px] flex-1"><label className="label">Search patient, implant type, manufacturer, model</label><input name="q" defaultValue={sp.q} className="input" /></div>
        <div><label className="label">Safety class</label><select name="cls" defaultValue={sp.cls ?? ""} className="input"><option value="">All</option>{Object.entries(SAFETY_CLASS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
      </FilterBar>
      <TabLinks active={tab} tabs={Object.entries(TABS).map(([k, t]) => ({ key: k, label: t.label, href: `?tab=${k}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}${sp.cls ? `&cls=${sp.cls}` : ""}`, count: c[k] }))} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <Card bodyClass="p-0 overflow-x-auto">
          {rows.length === 0 ? <div className="p-4"><EmptyState title="No implants in this list" icon={Cpu} /></div> : (
            <table className="table"><thead><tr><th>Patient</th><th>Device</th><th>Manufacturer / model</th><th>Location</th><th>Class</th><th>Verification</th><th>Docs</th><th>Source</th></tr></thead>
              <tbody>{rows.map((i) => (
                <tr key={i.id}>
                  <td>{showNames ? i.full_name : "—"}<div className="font-mono text-xs text-slate-500">{i.mrn}</div></td>
                  <td><Link href={`/implants/${i.id}`} className="link">{i.device_name}</Link> {i.is_demo && <DemoTag />}<div className="text-xs text-slate-500">{i.group_name} · {i.category}</div>{!i.is_present && <div className="text-xs text-slate-400">Removed</div>}</td>
                  <td className="text-xs">{i.manufacturer ?? <span className="text-red-600">Not documented</span>}<div>{i.model_name ?? ""} {i.model_number ? `(${i.model_number})` : ""}</div></td>
                  <td className="text-xs">{i.anatomical_location ?? "—"}{i.side ? ` · ${labelize(i.side)}` : ""}</td>
                  <td><MapBadge map={SAFETY_CLASS} value={i.safety_class} /></td>
                  <td><MapBadge map={VERIFICATION_STATUS} value={i.verification_status} /><div className="text-[11px] text-slate-500">{i.last_verified ? fmtDate(i.last_verified) : ""}</div></td>
                  <td className="tabular-nums">{i.docs || <span className="text-red-600">0</span>}</td>
                  <td className="text-[11px]">{i.info_source === "MANUFACTURER_VERIFIED" ? <span className="font-semibold text-green-700">Manufacturer-verified</span> : <span className="text-amber-700">User-entered</span>}</td>
                </tr>))}</tbody></table>
          )}
        </Card>
        <div className="space-y-4">
          {[["By category", byCat], ["By manufacturer", byMan], ["By location", byLoc]].map(([t, list]: any) => (
            <Card key={t} title={t}><ul className="space-y-1 text-xs">{list.map((r: any) => <li key={r.k} className="flex justify-between gap-2"><span className="truncate">{r.k}</span><span className="font-semibold tabular-nums">{r.n}</span></li>)}</ul></Card>
          ))}
        </div>
      </div>
    </div>
  );
}
