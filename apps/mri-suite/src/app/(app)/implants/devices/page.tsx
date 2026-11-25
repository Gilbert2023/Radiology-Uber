import Link from "next/link";
import { Database, Plus } from "lucide-react";
import { requireActor } from "@/server/auth";
import { q } from "@/lib/db";
import { PageHeader, Card, MapBadge, FilterBar, DemoTag } from "@/components/ui";
import { ActionForm, SubmitButton, Modal } from "@/components/client/forms";
import { SAFETY_CLASS, IMPLANT_MATERIALS } from "@/lib/constants";
import { fmtDate } from "@/lib/time";
import { addCategoryAction } from "../actions";
export const metadata = { title: "Implant database" };
export default async function Devices({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const actor = await requireActor("implants.view");
  const sp = await searchParams;
  const rows = await q(`SELECT d.*, ic.name AS category, ic.group_name, u.full_name AS verifier FROM device_references d JOIN implant_categories ic ON ic.id=d.category_id LEFT JOIN users u ON u.id=d.verified_by
     WHERE ($1 = '' OR d.manufacturer ILIKE $2 OR d.model_name ILIKE $2 OR d.model_number ILIKE $2 OR ic.name ILIKE $2) ORDER BY d.manufacturer, d.model_name`, [sp.q ?? "", `%${sp.q ?? ""}%`]);
  const cats = await q(`SELECT group_name, count(*)::int AS n FROM implant_categories GROUP BY 1 ORDER BY 1`);
  const can = actor.permissions.has("implants.configure");
  return (
    <div>
      <PageHeader title="Departmental implant reference database" icon={Database} crumbs={[{ label: "Implant Registry", href: "/implants" }, { label: "Database" }]}
        description="Reference entries for device models. Manufacturer-verified entries are clearly distinguished from user-entered, unverified information."
        actions={can && <>
          <Modal title="Add implant category" trigger="Add category" triggerClass="btn-secondary">
            <ActionForm action={addCategoryAction} className="space-y-3"><div><label className="label">Group</label><input name="groupName" list="groups" className="input" required /><datalist id="groups">{cats.map((c) => <option key={c.group_name} value={c.group_name} />)}</datalist></div><div><label className="label">Category name</label><input name="name" className="input" required /></div><SubmitButton>Add</SubmitButton></ActionForm>
          </Modal>
          <Link href="/implants/devices/new" className="btn-accent"><Plus className="h-4 w-4" />Add device model</Link></>} />
      <FilterBar><div className="min-w-[260px] flex-1"><label className="label">Search manufacturer / model / category</label><input name="q" defaultValue={sp.q} className="input" /></div></FilterBar>
      <Card bodyClass="p-0 overflow-x-auto">
        <table className="table"><thead><tr><th>Manufacturer / model</th><th>Category</th><th>Materials</th><th>Class</th><th>Field strengths</th><th>Information status</th><th>Last verified</th><th>Version</th></tr></thead>
          <tbody>{rows.map((d) => <tr key={d.id}><td><Link href={`/implants/devices/${d.id}`} className="link">{d.manufacturer}</Link> {d.is_demo && <DemoTag />}<div className="text-xs">{d.model_name} {d.model_number ? `(${d.model_number})` : ""}</div></td><td className="text-xs">{d.group_name} · {d.category}</td>
            <td className="text-xs">{(d.materials as string[]).map((m) => IMPLANT_MATERIALS[m]).join(", ")}</td><td><MapBadge map={SAFETY_CLASS} value={d.safety_class} /></td><td className="text-xs">{d.approved_field_strengths ?? "—"}</td>
            <td className="text-xs">{d.info_status === "MANUFACTURER_VERIFIED" ? <span className="font-semibold text-green-700">Manufacturer-verified</span> : <span className="font-semibold text-amber-700">User-entered (unverified)</span>}</td>
            <td className="text-xs">{d.last_verified_at ? `${fmtDate(d.last_verified_at)} · ${d.verifier}` : "—"}</td><td>v{d.version}</td></tr>)}</tbody></table>
      </Card>
    </div>
  );
}
