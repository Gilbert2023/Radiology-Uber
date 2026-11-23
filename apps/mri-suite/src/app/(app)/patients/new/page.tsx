import Link from "next/link";
import { UserPlus } from "lucide-react";
import { requireActor } from "@/server/auth";
import { PageHeader, Card } from "@/components/ui";
import { HospitalLogo } from "@/components/brand";
import { ActionForm, SubmitButton } from "@/components/client/forms";
import { PatientFields } from "@/components/PatientFields";
import { createPatientAction } from "../actions";
export const metadata = { title: "Register patient" };
export default async function NewPatient() {
  await requireActor("patients.manage");
  return (
    <div className="max-w-4xl">
      <PageHeader title="Register patient" icon={UserPlus} crumbs={[{ label: "Patients", href: "/patients" }, { label: "Register" }]} logo={<HospitalLogo size="sm" showName={false} />}
        description="Use synthetic data only in demonstration environments. Patient information is confidential (Data Protection Act, 2012 – Act 843)." />
      <Card>
        <ActionForm action={createPatientAction} className="space-y-4">
          <PatientFields />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirmPossibleDuplicate" className="h-4 w-4" />Confirm this is a different patient (only if warned about a possible duplicate)</label>
          <div className="flex flex-wrap gap-2"><SubmitButton name="returnTo" value="view">Register patient</SubmitButton><SubmitButton className="btn-accent" name="returnTo" value="book">Register &amp; book appointment</SubmitButton><Link href="/patients" className="btn-secondary">Cancel</Link></div>
        </ActionForm>
      </Card>
    </div>
  );
}
