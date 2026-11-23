import Link from "next/link";
import { notFound } from "next/navigation";
import { User, Pencil, CalendarPlus, Cpu, History } from "lucide-react";
import { requireActor, auditView } from "@/server/auth";
import { one, q } from "@/lib/db";
import { getSettings } from "@/server/settings";
import { PageHeader, Card, DL, StatusPill, MapBadge, EmptyState, DemoTag } from "@/components/ui";
import { HospitalLogo } from "@/components/brand";
import { displayStatus } from "@/lib/status";
import { SAFETY_CLASS, VERIFICATION_STATUS, PACS_STATUS, labelize } from "@/lib/constants";
import { ageFromDob, fmtDate, fmtDateTime } from "@/lib/time";

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor("patients.view");
  const { id } = await params;
  const p = await one(`SELECT *, dob::text AS dob FROM patients WHERE id=$1`, [id]);
  if (!p) notFound();
  await auditView(actor, "patient", id);
  const settings = await getSettings();
  const appts = await q(`SELECT a.*, e.name AS exam_name, s.name AS scanner_name, pu.status AS pacs_status FROM appointments a JOIN exam_types e ON e.id=a.exam_type_id JOIN scanners s ON s.id=a.scanner_id
     LEFT JOIN pacs_uploads pu ON pu.appointment_id=a.id WHERE a.patient_id=$1 ORDER BY a.scheduled_start DESC`, [id]);
  const implants = actor.permissions.has("implants.view") ? await q(`SELECT pi.*, ic.name AS category FROM patient_implants pi JOIN implant_categories ic ON ic.id=pi.category_id WHERE pi.patient_id=$1 ORDER BY pi.created_at`, [id]) : null;
  const priorMri = appts.filter((a) => a.status === "COMPLETED").length;
  return (
    <div>
      <PageHeader title={p.full_name} icon={User} description={`${p.mrn} · ${fmtDate(p.dob)} (${ageFromDob(p.dob)} y) · ${labelize(p.sex)}`} crumbs={[{ label: "Patients", href: "/patients" }, { label: p.full_name }]}
        logo={<HospitalLogo size="sm" showName={false} />}
        actions={<>{p.is_demo && <DemoTag />}{actor.permissions.has("patients.manage") && <Link href={`/patients/${id}/edit`} className="btn-secondary"><Pencil className="h-4 w-4" />Edit</Link>}
          {actor.permissions.has("appointments.manage") && <Link href={`/appointments/new?patientId=${id}`} className="btn-accent"><CalendarPlus className="h-4 w-4" />Book MRI</Link>}</>} />
      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Demographics" className="xl:col-span-1">
          <DL cols={1} items={[["MRN", p.mrn], ["Contact", p.phone], ["Email", p.email], ["Address", p.address], ["Next of kin", p.next_of_kin ? `${p.next_of_kin} ${p.next_of_kin_phone ?? ""}` : null], ["Weight", p.weight_kg ? `${p.weight_kg} kg` : null], ["Previous MRI examinations (this system)", priorMri], ["Registered", fmtDateTime(p.created_at)]]} />
        </Card>
        <div className="space-y-4 xl:col-span-2">
          {implants && (
            <Card title="Implants & devices" icon={Cpu} actions={actor.permissions.has("implants.manage") && <Link href={`/implants/new?patientId=${id}`} className="btn-secondary btn-sm">Register implant</Link>} bodyClass="p-0">
              {implants.length === 0 ? <div className="p-4"><EmptyState title="No implants recorded" icon={Cpu}>Absence of a record does not mean the patient has no implant – always complete MRI safety screening.</EmptyState></div> : (
                <table className="table"><thead><tr><th>Device</th><th>Location</th><th>Class</th><th>Verification</th><th>Present</th></tr></thead>
                  <tbody>{implants.map((i) => <tr key={i.id}><td><Link className="link" href={`/implants/${i.id}`}>{i.device_name}</Link><div className="text-xs text-slate-500">{i.category}</div></td><td>{i.anatomical_location} {i.side ? `(${labelize(i.side)})` : ""}</td><td><MapBadge map={SAFETY_CLASS} value={i.safety_class} /></td><td><MapBadge map={VERIFICATION_STATUS} value={i.verification_status} /></td><td>{i.is_present ? "Yes" : "Removed"}</td></tr>)}</tbody></table>
              )}
            </Card>
          )}
          <Card title="Appointment history" icon={History} bodyClass="p-0 overflow-x-auto">
            {appts.length === 0 ? <div className="p-4"><EmptyState title="No appointments" /></div> : (
              <table className="table"><thead><tr><th>Date</th><th>Accession</th><th>Examination</th><th>Status</th><th>PACS</th></tr></thead>
                <tbody>{appts.map((a) => <tr key={a.id}><td>{fmtDateTime(a.scheduled_start)}</td><td><Link href={`/appointments/${a.id}`} className="link">{a.accession_no}</Link></td><td>{a.exam_name}</td><td><StatusPill status={displayStatus(a, settings)} /></td><td>{a.pacs_status ? <MapBadge map={PACS_STATUS} value={a.pacs_status} /> : "—"}</td></tr>)}</tbody></table>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
