import { notFound } from "next/navigation";
import { UserCog } from "lucide-react";
import { requireActor } from "@/server/auth";
import { one } from "@/lib/db";
import { PageHeader, Card } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/client/forms";
import { PatientFields } from "@/components/PatientFields";
import { updatePatientAction } from "../../actions";
export default async function EditPatient({ params }: { params: Promise<{ id: string }> }) {
  await requireActor("patients.manage");
  const { id } = await params;
  const p = await one(`SELECT *, dob::text AS dob FROM patients WHERE id=$1`, [id]);
  if (!p) notFound();
  return (
    <div className="max-w-4xl">
      <PageHeader title={`Edit ${p.full_name}`} icon={UserCog} crumbs={[{ label: "Patients", href: "/patients" }, { label: p.full_name, href: `/patients/${id}` }, { label: "Edit" }]} />
      <Card><ActionForm action={updatePatientAction} className="space-y-4"><input type="hidden" name="id" value={id} /><PatientFields p={p} /><SubmitButton>Save changes</SubmitButton></ActionForm></Card>
    </div>
  );
}
