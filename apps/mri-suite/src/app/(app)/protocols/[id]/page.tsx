import Link from "next/link";
import { notFound } from "next/navigation";
import { Layers, Pencil, GitCompare } from "lucide-react";
import { requireActor } from "@/server/auth";
import { one, q } from "@/lib/db";
import { PageHeader, Card, DL, MapBadge, Notice } from "@/components/ui";
import { HospitalLogo } from "@/components/brand";
import { ActionForm, SubmitButton } from "@/components/client/forms";
import { PrintButton } from "@/components/client/misc";
import { PROTOCOL_CATEGORIES, PROTOCOL_STATUS } from "@/lib/constants";
import { fmtDateTime } from "@/lib/time";
import { protocolStatusAction } from "../actions";
export default async function Protocol({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor("protocols.view");
  const { id } = await params;
  const p = await one(`SELECT p.*, u.full_name AS approver, c.full_name AS creator FROM mri_protocols p LEFT JOIN users u ON u.id=p.approved_by LEFT JOIN users c ON c.id=p.created_by WHERE p.id=$1`, [id]);
  if (!p) notFound();
  const [seqs, versions] = await Promise.all([q(`SELECT * FROM protocol_sequences WHERE protocol_id=$1 ORDER BY seq_order`, [id]), q(`SELECT id, version, status, change_note, created_at FROM mri_protocols WHERE lineage_id=$1 ORDER BY version DESC`, [p.lineage_id])]);
  const op = (o: string, label: string, cls = "btn-secondary") => <ActionForm action={protocolStatusAction} confirm={`${label}?`}><input type="hidden" name="id" value={id} /><input type="hidden" name="op" value={o} /><SubmitButton className={cls}>{label}</SubmitButton></ActionForm>;
  return (
    <div>
      <PageHeader title={p.name} icon={Layers} logo={<HospitalLogo size="sm" showName={false} />} description={`${PROTOCOL_CATEGORIES[p.category]} · ${p.scanner_model} · version ${p.version}`} crumbs={[{ label: "Protocol Library", href: "/protocols" }, { label: p.name }]}
        actions={<><MapBadge map={PROTOCOL_STATUS} value={p.status} /><PrintButton />
          {actor.permissions.has("protocols.edit") && !["ARCHIVED", "SUPERSEDED"].includes(p.status) && <Link className="btn-secondary" href={`/protocols/${id}/edit`}><Pencil className="h-4 w-4" />{p.status === "APPROVED" ? "Revise" : "Edit"}</Link>}
          {actor.permissions.has("protocols.edit") && p.status === "DRAFT" && op("SUBMIT", "Submit for approval")}
          {actor.permissions.has("protocols.approve") && ["DRAFT", "PENDING_APPROVAL"].includes(p.status) && p.kind === "DEPARTMENTAL" && op("APPROVE", "Approve", "btn-accent")}
          {actor.permissions.has("protocols.approve") && p.status === "PENDING_APPROVAL" && op("REJECT", "Return to draft")}
          {actor.permissions.has("protocols.approve") && !["ARCHIVED"].includes(p.status) && op("ARCHIVE", "Archive")}</>} />
      {p.kind === "EDUCATIONAL_REFERENCE" ? <Notice tone="warning" className="mb-4" title="Educational reference – NOT an approved departmental protocol">Do not use to set up clinical examinations.</Notice>
        : p.status !== "APPROVED" ? <Notice tone="warning" className="mb-4" title="Not approved">This protocol is not approved for clinical use.</Notice>
        : <Notice tone="success" className="mb-4">Approved by {p.approver} · {fmtDateTime(p.approved_at)}</Notice>}
      <Card title="Protocol details" className="mb-4"><DL cols={3} items={[["Clinical indication", p.clinical_indication], ["Patient positioning", p.positioning], ["Coil", p.coil], ["Contrast requirement", p.contrast_requirement], ["Created by", `${p.creator ?? "—"} · ${fmtDateTime(p.created_at)}`], ["Change note", p.change_note], ["Special instructions", p.special_instructions]]} /></Card>
      <Card title="Sequences" className="mb-4" bodyClass="p-0 overflow-x-auto">
        <table className="table text-xs"><thead><tr><th>#</th><th>Sequence</th><th>Plane</th><th>TR</th><th>TE</th><th>TI</th><th>Flip</th><th>Slice</th><th>FOV</th><th>Matrix</th><th>NEX</th><th>BW</th><th>ETL</th><th>Parallel</th><th>Notes</th></tr></thead>
          <tbody>{seqs.map((s) => <tr key={s.id}><td>{s.seq_order}</td><td className="font-medium">{s.name}</td>{["plane", "tr", "te", "ti", "flip_angle", "slice_thickness", "fov", "matrix", "nex", "bandwidth", "etl", "parallel_imaging", "notes"].map((f) => <td key={f} className={s[f] ? "" : "text-slate-300"}>{s[f] ?? "—"}</td>)}</tr>)}</tbody></table>
      </Card>
      <Card title="Version history" actions={versions.length > 1 && <Link className="btn-secondary btn-sm" href={`/protocols/compare?a=${versions[1].id}&b=${versions[0].id}`}><GitCompare className="h-3.5 w-3.5" />Compare latest two</Link>} bodyClass="p-0">
        <table className="table"><thead><tr><th>Version</th><th>Status</th><th>Created</th><th>Change note</th></tr></thead>
          <tbody>{versions.map((v) => <tr key={v.id}><td><Link className="link" href={`/protocols/${v.id}`}>v{v.version}</Link></td><td><MapBadge map={PROTOCOL_STATUS} value={v.status} /></td><td>{fmtDateTime(v.created_at)}</td><td>{v.change_note}</td></tr>)}</tbody></table>
      </Card>
    </div>
  );
}
