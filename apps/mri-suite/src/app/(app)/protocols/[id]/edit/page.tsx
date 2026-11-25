import { notFound } from "next/navigation";
import { Layers } from "lucide-react";
import { requireActor } from "@/server/auth";
import { one, q } from "@/lib/db";
import { PageHeader, Notice } from "@/components/ui";
import { ProtocolForm } from "@/components/client/ProtocolForm";
import { editProtocolAction } from "../../actions";
export default async function EditProtocol({ params }: { params: Promise<{ id: string }> }) {
  await requireActor("protocols.edit");
  const { id } = await params;
  const p = await one(`SELECT * FROM mri_protocols WHERE id=$1`, [id]);
  if (!p) notFound();
  const seqs = await q(`SELECT * FROM protocol_sequences WHERE protocol_id=$1 ORDER BY seq_order`, [id]);
  const revising = p.status === "APPROVED";
  return (
    <div>
      <PageHeader title={`Edit ${p.name} (v${p.version})`} icon={Layers} crumbs={[{ label: "Protocol Library", href: "/protocols" }, { label: p.name, href: `/protocols/${id}` }, { label: "Edit" }]} />
      {revising && <Notice tone="warning" className="mb-4">This protocol is approved. Saving creates a new draft version; the approved version stays in use until the new one is approved.</Notice>}
      <ProtocolForm action={editProtocolAction} p={p} sequences={seqs} revising={revising} />
    </div>
  );
}
