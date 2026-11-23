import { TriangleAlert } from "lucide-react";
import { requireActor } from "@/server/auth";
import { PageHeader, Card, Notice } from "@/components/ui";
import { HospitalLogo } from "@/components/brand";
import { ActionForm, SubmitButton } from "@/components/client/forms";
import { INCIDENT_CATEGORIES, INCIDENT_SEVERITY } from "@/lib/constants";
import { toLocalInput } from "@/lib/time";
import { reportIncidentAction } from "../actions";
export default async function NewIncident() {
  await requireActor("incidents.report");
  return (
    <div className="max-w-3xl">
      <PageHeader title="Report an incident" icon={TriangleAlert} logo={<HospitalLogo size="sm" showName={false} />} crumbs={[{ label: "Incidents", href: "/incidents" }, { label: "Report" }]} />
      <Notice className="mb-4">Report facts, not blame. Make the situation safe first. Contrast reactions and extravasation recorded during administration are reported automatically.</Notice>
      <Card><ActionForm action={reportIncidentAction} className="grid gap-3 md:grid-cols-2">
        <div><label className="label">Date & time *</label><input type="datetime-local" name="occurredAt" className="input" required defaultValue={toLocalInput(new Date())} /></div>
        <div><label className="label">Location</label><input name="location" className="input" defaultValue="MRI suite" /></div>
        <div><label className="label">Category *</label><select name="category" className="input" required>{Object.entries(INCIDENT_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label className="label">Severity *</label><select name="severity" className="input" required>{Object.entries(INCIDENT_SEVERITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
        <div className="md:col-span-2"><label className="label">Description *</label><textarea name="description" rows={4} className="input" required /></div>
        <div className="md:col-span-2"><label className="label">Immediate action taken</label><textarea name="immediateAction" rows={2} className="input" /></div>
        <div><label className="label">Persons involved</label><input name="personsInvolved" className="input" /></div>
        <div><label className="label">Patient MRN (if a patient was involved)</label><input name="patientMrn" className="input" /></div>
        <div className="md:col-span-2"><SubmitButton>Submit report</SubmitButton></div>
      </ActionForm></Card>
    </div>
  );
}
