import { notFound } from "next/navigation";
import { Database, BadgeCheck } from "lucide-react";
import { requireActor } from "@/server/auth";
import { one, q } from "@/lib/db";
import { listImplantCategories } from "@/server/queries";
import { PageHeader, Card, Notice, MapBadge } from "@/components/ui";
import { ActionForm, SubmitButton, Modal } from "@/components/client/forms";
import { DeviceFields } from "@/components/DeviceFields";
import { SAFETY_CLASS } from "@/lib/constants";
import { fmtDateTime } from "@/lib/time";
import { saveDeviceAction, verifyDeviceAction } from "../../actions";
export default async function Device({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor("implants.view");
  const { id } = await params;
  const d = await one(`SELECT d.*, u.full_name AS verifier FROM device_references d LEFT JOIN users u ON u.id=d.verified_by WHERE d.id=$1`, [id]);
  if (!d) notFound();
  const versions = await q(`SELECT v.*, u.full_name FROM device_reference_versions v LEFT JOIN users u ON u.id=v.changed_by WHERE device_reference_id=$1 ORDER BY version DESC`, [id]);
  const usage = await one(`SELECT count(*)::int AS n FROM patient_implants WHERE device_reference_id=$1`, [id]);
  return (
    <div className="max-w-5xl">
      <PageHeader title={`${d.manufacturer} · ${d.model_name}`} icon={Database} crumbs={[{ label: "Implant Registry", href: "/implants" }, { label: "Database", href: "/implants/devices" }, { label: d.model_name }]}
        actions={<><MapBadge map={SAFETY_CLASS} value={d.safety_class} />{actor.permissions.has("devices.verify") && d.info_status !== "MANUFACTURER_VERIFIED" && (
          <ActionForm action={verifyDeviceAction} confirm="Confirm this entry has been checked against the cited manufacturer documentation?"><input type="hidden" name="id" value={id} /><SubmitButton className="btn-accent"><BadgeCheck className="h-4 w-4" />Mark manufacturer-verified</SubmitButton></ActionForm>)}</>} />
      {d.info_status === "MANUFACTURER_VERIFIED" ? <Notice tone="success" className="mb-4">Manufacturer-verified · {fmtDateTime(d.last_verified_at)} by {d.verifier}. Linked to {usage!.n} patient implant record(s).</Notice>
        : <Notice tone="warning" className="mb-4">User-entered, unverified information. Do not rely on it for clearance without checking the manufacturer documentation.</Notice>}
      {actor.permissions.has("implants.configure") ? (
        <Card title={`Edit (version ${d.version}) – saving creates a new version and resets verification`}><ActionForm action={saveDeviceAction} className="space-y-4"><input type="hidden" name="id" value={id} /><DeviceFields d={d} categories={await listImplantCategories()} /><SubmitButton>Save new version</SubmitButton></ActionForm></Card>
      ) : <Card title="Details"><pre className="whitespace-pre-wrap text-xs">{JSON.stringify(d.conditions, null, 2)}</pre></Card>}
      <Card className="mt-4" title="Version history" bodyClass="p-0">
        <table className="table"><thead><tr><th>Version</th><th>Changed</th><th>By</th><th>Note</th><th>Snapshot</th></tr></thead>
          <tbody>{versions.map((v) => <tr key={v.id}><td>v{v.version}</td><td>{fmtDateTime(v.changed_at)}</td><td>{v.full_name}</td><td>{v.change_note}</td><td><Modal title={`Version ${v.version}`} trigger="View" triggerClass="btn-ghost btn-sm" wide><pre className="whitespace-pre-wrap text-xs">{JSON.stringify(v.snapshot, null, 2)}</pre></Modal></td></tr>)}
            {versions.length === 0 && <tr><td colSpan={5} className="text-slate-500">No previous versions.</td></tr>}</tbody></table>
      </Card>
    </div>
  );
}
