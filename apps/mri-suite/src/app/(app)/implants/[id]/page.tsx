import Link from "next/link";
import { notFound } from "next/navigation";
import { Cpu, Pencil, FileText, ClipboardCheck, History, Upload } from "lucide-react";
import { requireActor, auditView } from "@/server/auth";
import { one, q } from "@/lib/db";
import { PageHeader, Card, DL, MapBadge, EmptyState, Notice, Badge, DemoTag } from "@/components/ui";
import { HospitalLogo } from "@/components/brand";
import { ActionForm, SubmitButton, Modal } from "@/components/client/forms";
import { SAFETY_CLASS, VERIFICATION_STATUS, VERIFICATION_CHECKLIST, CONDITION_FIELDS, IMPLANT_MATERIALS, ASSESSMENT_DECISION, labelize } from "@/lib/constants";
import { fmtDate, fmtDateTime } from "@/lib/time";
import { verifyImplantAction, uploadDocumentAction } from "../actions";

export default async function ImplantPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor("implants.view");
  const { id } = await params;
  const i = await one(`SELECT pi.*, pi.implanted_on::text AS implanted_on, p.full_name, p.mrn, p.id AS pid, ic.name AS category, ic.group_name, dr.manufacturer AS ref_man, dr.model_name AS ref_model, dr.info_status AS ref_status
      FROM patient_implants pi JOIN patients p ON p.id=pi.patient_id JOIN implant_categories ic ON ic.id=pi.category_id LEFT JOIN device_references dr ON dr.id=pi.device_reference_id WHERE pi.id=$1`, [id]);
  if (!i) notFound();
  await auditView(actor, "implant", id);
  const [verifs, docs, assess] = await Promise.all([
    q(`SELECT v.*, u.full_name FROM implant_verifications v LEFT JOIN users u ON u.id=v.verified_by WHERE implant_id=$1 ORDER BY verified_at DESC`, [id]),
    q(`SELECT d.*, u.full_name FROM documents d LEFT JOIN users u ON u.id=d.uploaded_by WHERE owner_type='IMPLANT' AND owner_id=$1 ORDER BY uploaded_at DESC`, [id]),
    q(`SELECT ia.*, a.accession_no, a.scheduled_start, e.name AS exam, s.name AS scanner, u.full_name FROM implant_assessments ia JOIN appointments a ON a.id=ia.appointment_id JOIN exam_types e ON e.id=a.exam_type_id
         LEFT JOIN scanners s ON s.id=ia.scanner_id LEFT JOIN users u ON u.id=ia.assessed_by WHERE ia.implant_id=$1 ORDER BY a.scheduled_start DESC`, [id]),
  ]);
  const lastChk = verifs[0]?.checklist ?? {};
  const canDocs = actor.permissions.has("documents.view_sensitive");
  return (
    <div>
      <PageHeader title={i.device_name} icon={Cpu} logo={<HospitalLogo size="sm" showName={false} />} description={`${i.group_name} · ${i.category} · ${actor.permissions.has("patients.view") ? i.full_name : ""} (${i.mrn})`}
        crumbs={[{ label: "Implant Registry", href: "/implants" }, { label: i.device_name }]}
        actions={<>{i.is_demo && <DemoTag />}<MapBadge map={SAFETY_CLASS} value={i.safety_class} /><MapBadge map={VERIFICATION_STATUS} value={i.verification_status} />
          {actor.permissions.has("implants.manage") && <Link href={`/implants/${id}/edit`} className="btn-secondary"><Pencil className="h-4 w-4" />Edit</Link>}</>} />
      {i.info_source !== "MANUFACTURER_VERIFIED" && <Notice tone="warning" className="mb-4">Safety information on this record is <strong>user-entered and unverified</strong> against manufacturer documentation.</Notice>}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <Card title="Device information">
            <DL cols={3} items={[["Patient", <Link key="p" href={`/patients/${i.pid}`} className="link">{i.mrn}</Link>], ["Anatomical location", i.anatomical_location], ["Side", labelize(i.side)],
              ["Manufacturer", i.manufacturer], ["Model name", i.model_name], ["Model number", i.model_number], ["Serial number", i.serial_no], ["Catalogue / reference", i.catalogue_no],
              ["Implanted", i.implanted_on ? fmtDate(i.implanted_on) : i.implanted_on_text], ["Facility", i.facility], ["Implanting specialist", i.implanting_specialist], ["Reason", i.reason],
              ["Materials", (i.materials as string[]).map((m) => IMPLANT_MATERIALS[m]).join(", ")], ["Exact composition", i.material_details], ["Present", i.is_present ? "Yes" : "Removed (history)"],
              ["Reference database link", i.ref_man ? `${i.ref_man} ${i.ref_model} (${i.ref_status === "MANUFACTURER_VERIFIED" ? "manufacturer-verified" : "unverified"})` : "—"], ["Notes", i.notes]]} />
          </Card>
          {i.safety_class === "MR_CONDITIONAL" && (
            <Card title="MR Conditional – manufacturer-approved conditions (as recorded)">
              {Object.keys(i.conditions).length === 0 ? <Notice tone="danger">No conditions recorded.</Notice> :
                <DL cols={2} items={CONDITION_FIELDS.filter((f) => i.conditions[f.key]).map((f) => [f.label, i.conditions[f.key]])} />}
            </Card>
          )}
          <Card title="Exam-specific MR safety assessments" icon={ClipboardCheck} subtitle="Previous assessments remain visible but never count as clearance for a new examination" bodyClass="p-0">
            {assess.length === 0 ? <div className="p-4"><EmptyState title="No assessments yet" /></div> : (
              <table className="table"><thead><tr><th>Examination</th><th>Scanner</th><th>Decision</th><th>Conditions applied</th><th>Assessor</th></tr></thead>
                <tbody>{assess.map((x) => <tr key={x.id}><td><Link className="link" href={`/appointments/${x.appointment_id}`}>{x.accession_no}</Link><div className="text-xs text-slate-500">{x.exam} · {fmtDateTime(x.scheduled_start)}</div></td><td>{x.scanner}</td><td><MapBadge map={ASSESSMENT_DECISION} value={x.decision} /></td><td className="text-xs">{x.conditions_applied ?? "—"}{x.notes ? <div className="text-slate-500">{x.notes}</div> : null}</td><td className="text-xs">{x.full_name ?? "—"}<div className="text-slate-500">{fmtDateTime(x.assessed_at)}</div></td></tr>)}</tbody></table>
            )}
          </Card>
          <Card title="Verification history" icon={History} bodyClass="p-0">
            {verifs.length === 0 ? <div className="p-4"><EmptyState title="No verification recorded" /></div> : (
              <ul className="divide-y divide-slate-100">{verifs.map((v) => (
                <li key={v.id} className="p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><MapBadge map={VERIFICATION_STATUS} value={v.status} /><span className="text-xs text-slate-500">{v.full_name} · {fmtDateTime(v.verified_at)}</span></div>
                  <div className="mt-1 flex flex-wrap gap-1">{VERIFICATION_CHECKLIST.map((c) => <Badge key={c.key} className={v.checklist?.[c.key] ? "bg-green-50 text-green-800 ring-green-200" : "bg-slate-50 text-slate-400 ring-slate-200"}>{c.label}</Badge>)}</div>
                  {(v.doc_title || v.doc_source) && <p className="mt-1 text-xs">Source: {v.doc_source} · {v.doc_title} {v.doc_revision ? `rev ${v.doc_revision}` : ""} · ref {v.doc_reference}</p>}
                  {v.specialist_consulted && <p className="text-xs">Specialist: {v.specialist_consulted}</p>}{v.notes && <p className="text-xs text-slate-600">{v.notes}</p>}</li>))}</ul>
            )}
          </Card>
        </div>
        <div className="space-y-4">
          {actor.permissions.has("implants.verify") && (
            <Card title="Record verification" icon={ClipboardCheck}>
              <ActionForm action={verifyImplantAction} className="space-y-2">
                <input type="hidden" name="implantId" value={id} />
                {VERIFICATION_CHECKLIST.map((c) => <label key={c.key} className="flex items-center gap-2 text-sm"><input type="checkbox" name={`chk_${c.key}`} defaultChecked={!!lastChk[c.key]} className="h-4 w-4" />{c.label}</label>)}
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="label">Doc source</label><input name="docSource" className="input" placeholder="Implant card, IFU…" /></div>
                  <div><label className="label">Doc title</label><input name="docTitle" className="input" /></div>
                  <div><label className="label">Revision / date</label><input name="docRevision" className="input" /></div>
                  <div><label className="label">Reference</label><input name="docReference" className="input" /></div>
                </div>
                <div><label className="label">Specialist consulted</label><input name="specialistConsulted" className="input" /></div>
                <div><label className="label">Status *</label><select name="status" className="input" defaultValue={i.verification_status}>{Object.entries(VERIFICATION_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
                <div><label className="label">Notes</label><textarea name="notes" rows={2} className="input" /></div>
                <SubmitButton>Save verification</SubmitButton>
              </ActionForm>
            </Card>
          )}
          <Card title="Supporting documents" icon={FileText}>
            {docs.length === 0 ? <p className="text-sm text-red-600">No documents uploaded.</p> : (
              <ul className="space-y-1 text-sm">{docs.map((d) => <li key={d.id} className="flex justify-between gap-2">{canDocs ? <a href={`/api/documents/${d.id}`} target="_blank" className="link truncate">{d.title || d.original_name}</a> : <span className="truncate">{d.title || d.original_name} (restricted)</span>}<span className="shrink-0 text-xs text-slate-500">{labelize(d.doc_type)}</span></li>)}</ul>
            )}
            {(actor.permissions.has("implants.manage") || actor.permissions.has("implants.verify")) && (
              <Modal title="Upload document" trigger={<><Upload className="h-4 w-4" />Upload</>} triggerClass="btn-secondary btn-sm mt-3">
                <ActionForm action={uploadDocumentAction} className="space-y-3">
                  <input type="hidden" name="ownerType" value="IMPLANT" /><input type="hidden" name="ownerId" value={id} />
                  <div><label className="label">Document type</label><select name="docType" className="input">{["IMPLANT_CARD", "MANUFACTURER_DOCUMENT", "OPERATIVE_REPORT", "PREVIOUS_MRI_ASSESSMENT", "DEVICE_MANUAL", "OTHER"].map((t) => <option key={t} value={t}>{labelize(t)}</option>)}</select></div>
                  <div><label className="label">Title</label><input name="title" className="input" /></div>
                  <div><label className="label">File (PDF, PNG or JPEG)</label><input type="file" name="file" accept="application/pdf,image/png,image/jpeg" required className="input" /></div>
                  <SubmitButton>Upload</SubmitButton>
                </ActionForm>
              </Modal>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
