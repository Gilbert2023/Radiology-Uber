import Link from "next/link";
import { Cpu } from "lucide-react";
import { requireActor } from "@/server/auth";
import { one, q } from "@/lib/db";
import { listImplantCategories } from "@/server/queries";
import { PageHeader, Card, Notice } from "@/components/ui";
import { HospitalLogo } from "@/components/brand";
import { ActionForm, SubmitButton } from "@/components/client/forms";
import { PatientPicker } from "@/components/client/AppointmentForm";
import { ImplantFields } from "@/components/ImplantFields";
import { createImplantAction } from "../actions";
export const metadata = { title: "Register implant" };
export default async function NewImplant({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireActor("implants.manage");
  const sp = await searchParams;
  const patient = sp.patientId ? await one(`SELECT id, mrn, full_name, dob::text AS dob, sex FROM patients WHERE id=$1`, [sp.patientId]) : null;
  const [categories, devices] = await Promise.all([listImplantCategories(), q(`SELECT id, manufacturer, model_name, model_number, safety_class, info_status FROM device_references ORDER BY manufacturer, model_name`)]);
  return (
    <div className="max-w-5xl">
      <PageHeader title="Register new implant / device" icon={Cpu} logo={<HospitalLogo size="sm" showName={false} />} crumbs={[{ label: "Implant Registry", href: "/implants" }, { label: "Register" }]} />
      {sp.appointmentId && <Notice className="mb-4">This implant was declared during MRI safety screening. Once saved, it will require an exam-specific assessment before the patient can be cleared.</Notice>}
      <Card>
        <ActionForm action={createImplantAction} className="space-y-4">
          {sp.appointmentId && <input type="hidden" name="appointmentId" value={sp.appointmentId} />}
          <div><label className="label">Patient *</label><PatientPicker initial={patient as any} /></div>
          <ImplantFields categories={categories} devices={devices} />
          <div className="flex gap-2"><SubmitButton>Register implant</SubmitButton><Link href="/implants" className="btn-secondary">Cancel</Link></div>
        </ActionForm>
      </Card>
    </div>
  );
}
