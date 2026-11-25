import { ListChecks, ClipboardCheck, BadgeCheck } from "lucide-react";
import { requireActor } from "@/server/auth";
import { q } from "@/lib/db";
import { APPT_SELECT } from "@/server/queries";
import { getSettings } from "@/server/settings";
import { PageHeader, Card, TabLinks, Badge, Notice } from "@/components/ui";
import { WorkTable } from "@/components/WorkTable";
import { ActionForm, SubmitButton, Modal } from "@/components/client/forms";
import { displayStatus } from "@/lib/status";
import { fmtDateTime } from "@/lib/time";
import { savePrepProtocolAction, approvePrepProtocolAction } from "./actions";

export const metadata = { title: "Patient Preparation" };

export default async function Preparation({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const actor = await requireActor("prep.manage", "prep.protocols.manage");
  const sp = await searchParams;
  const tab = sp.tab === "protocols" ? "protocols" : "queue";
  const settings = await getSettings();
  const rows = (await q(`${APPT_SELECT} WHERE a.status IN ('ARRIVED','SCREENING','PREPARATION','CLEARED') ORDER BY a.scheduled_start`)).map((r) => ({ ...r, ds: displayStatus(r, settings) }));
  const protocols = await q(`SELECT p.*, u.full_name AS approved_by_name, (SELECT string_agg(name, ', ' ORDER BY name) FROM exam_types e WHERE e.prep_protocol_id=p.id) AS exams FROM prep_protocols p LEFT JOIN users u ON u.id=p.approved_by ORDER BY p.name`);
  const canEdit = actor.permissions.has("prep.protocols.manage"), canApprove = actor.permissions.has("prep.protocols.approve");
  return (
    <div>
      <PageHeader title="Patient Preparation" icon={ListChecks} description="Examination-specific preparation: fasting, renal function, cannulation, oral contrast, metal removal and MRI-safe clothing." />
      <TabLinks active={tab} tabs={[{ key: "queue", label: "Preparation queue", href: "?tab=queue", count: rows.filter((r) => r.prep_status !== "COMPLETE").length }, { key: "protocols", label: "Preparation protocols", href: "?tab=protocols", count: protocols.length }]} />
      {tab === "queue" ? (
        <div className="space-y-4">
          <Card title="Patients requiring preparation" icon={ClipboardCheck} bodyClass="p-0"><WorkTable rows={rows.filter((r) => r.prep_status !== "COMPLETE")} showNames={actor.permissions.has("patients.view")} waitAlert={settings.waitAlertMinutes} columns={["slot", "patient", "exam", "arrival", "wait", "screening", "prep", "action"]} /></Card>
          <Card title="Preparation complete – awaiting scan" bodyClass="p-0"><WorkTable rows={rows.filter((r) => r.prep_status === "COMPLETE")} showNames={actor.permissions.has("patients.view")} waitAlert={settings.waitAlertMinutes} columns={["slot", "patient", "exam", "wait", "screening", "prep", "status", "action"]} /></Card>
        </div>
      ) : (
        <div className="space-y-3">
          <Notice tone="warning">Protocols are generic templates supplied with the system and remain <strong>Draft</strong> until reviewed and approved by the department. Editing an approved protocol returns it to draft for re-approval.</Notice>
          <div className="grid gap-3 lg:grid-cols-2">
            {protocols.map((p) => (
              <Card key={p.id} title={p.name} subtitle={`${p.exam_category} · v${p.version}`} actions={<Badge className={p.status === "APPROVED" ? "bg-green-100 text-green-800 ring-green-300" : "bg-amber-50 text-amber-800 ring-amber-200"}>{p.status === "APPROVED" ? "Approved" : "Draft"}</Badge>}>
                <p className="text-sm text-slate-700">{p.instructions}</p>
                <ul className="mt-2 flex flex-wrap gap-1 text-xs">
                  {p.fasting_hours && <Badge>Fasting {p.fasting_hours} h</Badge>}{p.requires_egfr && <Badge>eGFR (contrast)</Badge>}{p.iv_cannula && <Badge>IV cannula</Badge>}{p.oral_contrast && <Badge>Oral contrast</Badge>}
                  {(p.checklist as any[]).map((c) => <Badge key={c.key} className="bg-sky-50 text-sky-800 ring-sky-200">{c.label}</Badge>)}
                </ul>
                <p className="mt-2 text-xs text-slate-500">Used by: {p.exams ?? "—"}{p.approved_at ? ` · Approved by ${p.approved_by_name} ${fmtDateTime(p.approved_at)}` : ""}</p>
                <div className="mt-3 flex gap-2">
                  {canEdit && (
                    <Modal title={`Edit: ${p.name}`} trigger="Edit" triggerClass="btn-secondary btn-sm" wide>
                      <ActionForm action={savePrepProtocolAction} className="grid gap-3 md:grid-cols-2">
                        <input type="hidden" name="id" value={p.id} />
                        <div><label className="label">Name</label><input name="name" className="input" defaultValue={p.name} required /></div>
                        <div><label className="label">Examination category</label><input name="examCategory" className="input" defaultValue={p.exam_category} required /></div>
                        <div><label className="label">Fasting (hours)</label><input name="fastingHours" type="number" step="0.5" className="input" defaultValue={p.fasting_hours ?? ""} /></div>
                        <div className="flex flex-wrap items-end gap-4 pb-2 text-sm">
                          <label className="flex items-center gap-1.5"><input type="checkbox" name="requiresEgfr" defaultChecked={p.requires_egfr} />eGFR for contrast</label>
                          <label className="flex items-center gap-1.5"><input type="checkbox" name="ivCannula" defaultChecked={p.iv_cannula} />IV cannula</label>
                          <label className="flex items-center gap-1.5"><input type="checkbox" name="oralContrast" defaultChecked={p.oral_contrast} />Oral contrast</label>
                        </div>
                        <div className="md:col-span-2"><label className="label">Instructions</label><textarea name="instructions" rows={3} className="input" defaultValue={p.instructions ?? ""} /></div>
                        <div className="md:col-span-2"><label className="label">Medication preparation</label><input name="medicationNotes" className="input" defaultValue={p.medication_notes ?? ""} /></div>
                        <div className="md:col-span-2"><label className="label">Checklist items (one per line)</label><textarea name="checklistText" rows={4} className="input" defaultValue={(p.checklist as any[]).map((c) => c.label).join("\n")} /></div>
                        <div className="md:col-span-2"><SubmitButton>Save as draft</SubmitButton></div>
                      </ActionForm>
                    </Modal>
                  )}
                  {canApprove && p.status === "DRAFT" && <ActionForm action={approvePrepProtocolAction} confirm="Approve this preparation protocol for departmental use?"><input type="hidden" name="id" value={p.id} /><SubmitButton className="btn-accent btn-sm"><BadgeCheck className="h-3.5 w-3.5" />Approve</SubmitButton></ActionForm>}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
