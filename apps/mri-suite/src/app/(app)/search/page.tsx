import Link from "next/link";
import { Search } from "lucide-react";
import { requireActor } from "@/server/auth";
import { q } from "@/lib/db";
import { PageHeader, Card, EmptyState, FilterBar } from "@/components/ui";
import { fmtDateTime } from "@/lib/time";
import { labelize } from "@/lib/constants";
export const metadata = { title: "Search" };
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const a = await requireActor();
  const term = ((await searchParams).q ?? "").trim().slice(0, 80);
  const like = `%${term}%`;
  const has = (p: any) => a.permissions.has(p);
  const [patients, appts, staff, implants, incidents] = term.length < 2 ? [[], [], [], [], []] : await Promise.all([
    has("patients.view") ? q(`SELECT id, full_name, mrn, dob::text AS dob FROM patients WHERE full_name ILIKE $1 OR mrn ILIKE $1 OR phone ILIKE $1 LIMIT 15`, [like]) : [],
    has("appointments.view") ? q(`SELECT a.id, a.accession_no, a.status, a.scheduled_start, p.full_name, e.name AS exam FROM appointments a JOIN patients p ON p.id=a.patient_id JOIN exam_types e ON e.id=a.exam_type_id WHERE a.accession_no ILIKE $1 OR ($2 AND p.full_name ILIKE $1) OR p.mrn ILIKE $1 ORDER BY a.scheduled_start DESC LIMIT 15`, [like, has("patients.view")]) : [],
    has("staff.view") ? q(`SELECT id, full_name, designation, staff_no FROM staff WHERE full_name ILIKE $1 OR staff_no ILIKE $1 LIMIT 10`, [like]) : [],
    has("implants.view") ? q(`SELECT id, device_name, manufacturer, model_name FROM patient_implants WHERE device_name ILIKE $1 OR manufacturer ILIKE $1 OR model_name ILIKE $1 OR model_number ILIKE $1 LIMIT 10`, [like]) : [],
    has("incidents.view") ? q(`SELECT id, ref_no, category FROM incidents WHERE ref_no ILIKE $1 OR description ILIKE $1 LIMIT 10`, [like]) : [],
  ]);
  const total = patients.length + appts.length + staff.length + implants.length + incidents.length;
  const Section = ({ title, items }: { title: string; items: React.ReactNode[] }) => items.length ? <Card title={`${title} (${items.length})`} bodyClass="p-0"><ul className="divide-y divide-slate-100">{items}</ul></Card> : null;
  return (
    <div className="max-w-4xl">
      <PageHeader title="Search" icon={Search} description="Results are limited to what your role is permitted to see." />
      <FilterBar><div className="min-w-[280px] flex-1"><input name="q" defaultValue={term} className="input" placeholder="Name, MRN, accession, staff ID, device…" autoFocus /></div></FilterBar>
      {term.length >= 2 && total === 0 && <EmptyState title={`No results for “${term}”`} />}
      <div className="space-y-4">
        <Section title="Patients" items={patients.map((p: any) => <li key={p.id}><Link className="block px-4 py-2.5 hover:bg-slate-50" href={`/patients/${p.id}`}><span className="font-medium">{p.full_name}</span> <span className="text-xs text-slate-500">{p.mrn} · DOB {p.dob}</span></Link></li>)} />
        <Section title="Appointments" items={appts.map((r: any) => <li key={r.id}><Link className="block px-4 py-2.5 hover:bg-slate-50" href={`/appointments/${r.id}`}><span className="font-mono text-sm">{r.accession_no}</span> · {has("patients.view") ? r.full_name : ""} · {r.exam} <span className="text-xs text-slate-500">{fmtDateTime(r.scheduled_start)} · {labelize(r.status)}</span></Link></li>)} />
        <Section title="Staff" items={staff.map((s: any) => <li key={s.id}><Link className="block px-4 py-2.5 hover:bg-slate-50" href={`/staff/${s.id}`}>{s.full_name} <span className="text-xs text-slate-500">{s.designation} · {s.staff_no}</span></Link></li>)} />
        <Section title="Implants" items={implants.map((i: any) => <li key={i.id}><Link className="block px-4 py-2.5 hover:bg-slate-50" href={`/implants/${i.id}`}>{i.device_name} <span className="text-xs text-slate-500">{i.manufacturer} {i.model_name}</span></Link></li>)} />
        <Section title="Incidents" items={incidents.map((i: any) => <li key={i.id}><Link className="block px-4 py-2.5 hover:bg-slate-50" href={`/incidents/${i.id}`}>{i.ref_no} <span className="text-xs text-slate-500">{labelize(i.category)}</span></Link></li>)} />
      </div>
    </div>
  );
}
