import Link from "next/link";
import { notFound } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { requireActor, auditView } from "@/server/auth";
import { one } from "@/lib/db";
import { PageHeader, Card, DL, MapBadge } from "@/components/ui";
import { HospitalLogo } from "@/components/brand";
import { ActionForm, SubmitButton } from "@/components/client/forms";
import { PrintButton } from "@/components/client/misc";
import { INCIDENT_CATEGORIES, INCIDENT_SEVERITY, INCIDENT_STATUS } from "@/lib/constants";
import { fmtDateTime } from "@/lib/time";
import { updateIncidentAction } from "../actions";
export default async function Incident({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor("incidents.view");
  const { id } = await params;
  const i = await one(`SELECT i.*, u.full_name AS reporter, p.mrn, a.accession_no FROM incidents i LEFT JOIN users u ON u.id=i.reported_by LEFT JOIN patients p ON p.id=i.patient_id LEFT JOIN appointments a ON a.id=i.appointment_id WHERE i.id=$1`, [id]);
  if (!i) notFound();
  await auditView(actor, "incident", id);
  return (
    <div>
      <PageHeader title={`Incident ${i.ref_no}`} icon={TriangleAlert} logo={<HospitalLogo size="sm" />} description={`${INCIDENT_CATEGORIES[i.category]} · ${fmtDateTime(i.occurred_at)} · CONFIDENTIAL`}
        crumbs={[{ label: "Incidents", href: "/incidents" }, { label: i.ref_no }]} actions={<><MapBadge map={INCIDENT_SEVERITY} value={i.severity} /><MapBadge map={INCIDENT_STATUS} value={i.status} /><PrintButton /></>} />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Report"><DL cols={2} items={[["Occurred", fmtDateTime(i.occurred_at)], ["Location", i.location], ["Reported by", `${i.reporter ?? "—"} · ${fmtDateTime(i.created_at)}`], ["Persons involved", i.persons_involved],
          ["Patient", i.mrn], ["Examination", i.accession_no ? <Link key="a" className="link" href={`/appointments/${i.appointment_id}`}>{i.accession_no}</Link> : null], ["Description", i.description], ["Immediate action", i.immediate_action],
          ["Closed", fmtDateTime(i.closed_at)]]} /></Card>
        <Card title="Investigation & CAPA">
          {actor.permissions.has("incidents.manage") ? (
            <ActionForm action={updateIncidentAction} className="space-y-3"><input type="hidden" name="id" value={id} />
              <div className="grid grid-cols-2 gap-3"><div><label className="label">Status</label><select name="status" className="input" defaultValue={i.status}>{Object.entries(INCIDENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
                <div><label className="label">Severity</label><select name="severity" className="input" defaultValue={i.severity}>{Object.entries(INCIDENT_SEVERITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div></div>
              <div><label className="label">Investigation findings</label><textarea name="investigation" rows={3} className="input" defaultValue={i.investigation ?? ""} /></div>
              <div><label className="label">Corrective action</label><textarea name="correctiveAction" rows={2} className="input" defaultValue={i.corrective_action ?? ""} /></div>
              <div><label className="label">Preventive action</label><textarea name="preventiveAction" rows={2} className="input" defaultValue={i.preventive_action ?? ""} /></div>
              <div><label className="label">Responsible officer</label><input name="responsibleOfficer" className="input" defaultValue={i.responsible_officer ?? ""} /></div>
              <div><label className="label">Closure notes</label><textarea name="closureNotes" rows={2} className="input" defaultValue={i.closure_notes ?? ""} /></div>
              <SubmitButton>Save</SubmitButton>
            </ActionForm>
          ) : <DL cols={1} items={[["Investigation", i.investigation], ["Corrective action", i.corrective_action], ["Preventive action", i.preventive_action], ["Responsible officer", i.responsible_officer], ["Closure notes", i.closure_notes]]} />}
        </Card>
      </div>
    </div>
  );
}
