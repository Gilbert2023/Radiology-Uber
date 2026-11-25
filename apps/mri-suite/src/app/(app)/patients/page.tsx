import Link from "next/link";
import { UserPlus, Users, Search } from "lucide-react";
import { requireActor } from "@/server/auth";
import { searchPatients } from "@/server/services/patients";
import { PageHeader, Card, EmptyState, DemoTag, FilterBar } from "@/components/ui";
import { ageFromDob, fmtDate } from "@/lib/time";
import { labelize } from "@/lib/constants";
export const metadata = { title: "Patient Registration" };
export default async function Patients({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const actor = await requireActor("patients.view");
  const { q = "" } = await searchParams;
  const rows = await searchPatients(q, 100);
  return (
    <div>
      <PageHeader title="Patient Registration" icon={Users} description="Register and search MRI patients. Duplicate MRNs are blocked and similar name + date-of-birth matches are flagged."
        actions={actor.permissions.has("patients.manage") && <Link href="/patients/new" className="btn-accent"><UserPlus className="h-4 w-4" />Register patient</Link>} />
      <FilterBar><div className="min-w-[280px] flex-1"><label className="label">Search</label><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input name="q" defaultValue={q} className="input pl-9" placeholder="Name, MRN or phone" /></div></div></FilterBar>
      <Card bodyClass="p-0 overflow-x-auto">
        {rows.length === 0 ? <div className="p-4"><EmptyState title="No patients found" /></div> : (
          <table className="table"><thead><tr><th>Name</th><th>MRN</th><th>DOB / age</th><th>Sex</th><th>Contact</th><th>Appointments</th><th>Implants</th></tr></thead>
            <tbody>{rows.map((p) => <tr key={p.id}><td><Link href={`/patients/${p.id}`} className="link">{p.full_name}</Link> {p.is_demo && <DemoTag />}</td><td className="font-mono text-xs">{p.mrn}</td><td>{fmtDate(p.dob)} ({ageFromDob(p.dob)})</td><td>{labelize(p.sex)}</td><td>{p.phone ?? "—"}</td><td className="tabular-nums">{p.appt_count}</td><td className="tabular-nums">{p.implant_count > 0 ? <span className="font-semibold text-amber-700">{p.implant_count}</span> : 0}</td></tr>)}</tbody></table>
        )}
      </Card>
    </div>
  );
}
