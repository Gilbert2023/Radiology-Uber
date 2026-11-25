import { notFound } from "next/navigation";
import { User, Pencil, Award } from "lucide-react";
import { requireActor } from "@/server/auth";
import { one, q } from "@/lib/db";
import { PageHeader, Card, DL, Badge, EmptyState } from "@/components/ui";
import { ActionForm, SubmitButton, Modal } from "@/components/client/forms";
import { StaffForm } from "@/components/StaffForm";
import { SHIFTS, labelize } from "@/lib/constants";
import { fmtDate, localDate, addDays } from "@/lib/time";
import { competencyAction } from "../actions";
export default async function StaffMember({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor("staff.view");
  const { id } = await params;
  const s = await one(`SELECT *, registration_expiry::text AS registration_expiry FROM staff WHERE id=$1`, [id]);
  if (!s) notFound();
  const today = localDate();
  const [comps, training, roster, exams] = await Promise.all([
    q(`SELECT *, expires_on::text AS x, achieved_on::text AS a FROM staff_competencies WHERE staff_id=$1 ORDER BY competency`, [id]),
    q(`SELECT *, completed_on::text AS c FROM training_records WHERE staff_id=$1 ORDER BY completed_on DESC`, [id]),
    q(`SELECT duty_date::text AS d, shift FROM duty_roster WHERE staff_id=$1 AND duty_date BETWEEN $2 AND $3 ORDER BY duty_date`, [id, today, addDays(today, 13)]),
    one(`SELECT count(*)::int AS n FROM scan_records WHERE radiographer_id=$1 AND started_at > now() - interval '30 days'`, [id]),
  ]);
  const can = actor.permissions.has("staff.manage");
  return (
    <div>
      <PageHeader title={s.full_name} icon={User} description={`${s.designation} · ${s.staff_no}`} crumbs={[{ label: "Staff", href: "/staff?tab=directory" }, { label: s.full_name }]}
        actions={can && <Modal title="Edit staff record" wide trigger={<><Pencil className="h-4 w-4" />Edit</>} triggerClass="btn-secondary"><StaffForm s={s} /></Modal>} />
      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Details"><DL cols={1} items={[["Status", labelize(s.employment_status)], ["Phone", s.phone], ["Email", s.email], ["Registration", s.registration_body ? `${s.registration_body} · ${s.registration_no ?? ""}` : null], ["Registration expiry", fmtDate(s.registration_expiry)], ["Contracted hours", `${s.contracted_hours_week} h/week`], ["Examinations performed (30 d)", exams!.n]]} /></Card>
        <Card title="Competencies" icon={Award} className="xl:col-span-2" actions={can && <Modal title="Add / update competency" trigger="Add competency" triggerClass="btn-secondary btn-sm"><ActionForm action={competencyAction} className="space-y-3">
          <input type="hidden" name="staffId" value={id} /><input name="competency" className="input" placeholder="Competency" required list="comps" /><datalist id="comps">{["MRI safety screening", "Contrast injector operation", "Cardiac MRI", "MR Enterography", "Implant verification", "Emergency evacuation of Zone IV", "IV cannulation"].map((c) => <option key={c} value={c} />)}</datalist>
          <select name="level" className="input">{["TRAINING", "SUPERVISED", "COMPETENT", "TRAINER"].map((l) => <option key={l} value={l}>{labelize(l)}</option>)}</select>
          <div className="grid grid-cols-2 gap-2"><div><label className="label">Achieved</label><input type="date" name="achievedOn" className="input" /></div><div><label className="label">Expires</label><input type="date" name="expiresOn" className="input" /></div></div>
          <input name="assessedBy" className="input" placeholder="Assessed by" /><SubmitButton>Save</SubmitButton></ActionForm></Modal>} bodyClass="p-0">
          {comps.length === 0 ? <div className="p-4"><EmptyState title="No competencies recorded" /></div> : <table className="table"><thead><tr><th>Competency</th><th>Level</th><th>Achieved</th><th>Expires</th><th>Assessed by</th></tr></thead>
            <tbody>{comps.map((c) => <tr key={c.id}><td>{c.competency}</td><td>{labelize(c.level)}</td><td>{fmtDate(c.a)}</td><td>{c.x ? <>{fmtDate(c.x)} {c.x < today && <Badge className="bg-red-50 text-red-700 ring-red-200">Expired</Badge>}</> : "—"}</td><td>{c.assessed_by}</td></tr>)}</tbody></table>}
        </Card>
        <Card title="Upcoming shifts (14 days)"><ul className="space-y-1 text-sm">{roster.map((r) => <li key={r.d + r.shift} className="flex justify-between"><span>{fmtDate(r.d)}</span><span className={`badge ${SHIFTS[r.shift].badge}`}>{SHIFTS[r.shift].label}</span></li>)}{roster.length === 0 && <li className="text-slate-500">None rostered.</li>}</ul></Card>
        <Card title="Training" className="xl:col-span-2" bodyClass="p-0"><table className="table text-xs"><thead><tr><th>Training</th><th>Category</th><th>Completed</th><th>Hours</th></tr></thead><tbody>{training.map((t) => <tr key={t.id}><td>{t.title}</td><td>{labelize(t.category)}</td><td>{fmtDate(t.c)}</td><td>{t.hours ?? "—"}</td></tr>)}</tbody></table></Card>
      </div>
    </div>
  );
}
