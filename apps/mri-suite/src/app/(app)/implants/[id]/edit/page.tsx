import { notFound } from "next/navigation";
import { Cpu } from "lucide-react";
import { requireActor } from "@/server/auth";
import { one, q } from "@/lib/db";
import { listImplantCategories } from "@/server/queries";
import { PageHeader, Card, Notice } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/client/forms";
import { ImplantFields } from "@/components/ImplantFields";
import { updateImplantAction } from "../../actions";
export default async function EditImplant({ params }: { params: Promise<{ id: string }> }) {
  await requireActor("implants.manage");
  const { id } = await params;
  const i = await one(`SELECT pi.*, pi.implanted_on::text AS implanted_on, p.full_name FROM patient_implants pi JOIN patients p ON p.id=pi.patient_id WHERE pi.id=$1`, [id]);
  if (!i) notFound();
  const [categories, devices] = await Promise.all([listImplantCategories(), q(`SELECT id, manufacturer, model_name, model_number, safety_class, info_status FROM device_references ORDER BY manufacturer`)]);
  return (
    <div className="max-w-5xl">
      <PageHeader title={`Edit: ${i.device_name}`} icon={Cpu} description={i.full_name} crumbs={[{ label: "Implant Registry", href: "/implants" }, { label: i.device_name, href: `/implants/${id}` }, { label: "Edit" }]} />
      <Notice tone="warning" className="mb-4">Changing identity or safety information on a verified implant returns it to “Under review” and resets any exam-specific proceed decisions for active examinations.</Notice>
      <Card><ActionForm action={updateImplantAction} className="space-y-4">
        <input type="hidden" name="id" value={id} /><input type="hidden" name="patientId" value={i.patient_id} />
        <ImplantFields i={i} categories={categories} devices={devices} />
        <div><label className="label">Implant status</label><select name="isPresent" className="input max-w-xs" defaultValue={i.is_present ? "true" : "false"}><option value="true">Present in patient</option><option value="false">Removed / explanted (kept for history)</option></select></div>
        <SubmitButton>Save changes</SubmitButton>
      </ActionForm></Card>
    </div>
  );
}
