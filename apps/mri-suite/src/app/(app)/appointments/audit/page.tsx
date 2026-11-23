import { ScrollText, FileSpreadsheet, FileDown } from "lucide-react";
import { requireActor } from "@/server/auth";
import { one } from "@/lib/db";
import { getAppointmentAudit, loadLookups } from "@/server/appointmentAudit";
import { PageHeader, Card, StatCard, FilterBar, Notice } from "@/components/ui";
import { HospitalLogo } from "@/components/brand";
import { AppointmentAuditTrail } from "@/components/AppointmentAuditTrail";
import { resolvePeriod } from "@/components/PeriodFilter";
import { zonedToUtc } from "@/lib/time";
import { audit } from "@/server/audit";

export const metadata = { title: "Appointment Audit Trail" };
export default async function AppointmentAuditPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const actor = await requireActor("appointments.audit", "admin.audit");
  const sp = await searchParams;
  const p = resolvePeriod(sp, 7);
  const page = Math.max(1, Number(sp.page) || 1);
  const rows = await getAppointmentAudit({ from: p.from, to: p.to, user: sp.user || undefined, term: sp.q || undefined, operation: sp.op || undefined, limit: 100, offset: (page - 1) * 100 });
  const showNames = actor.permissions.has("patients.view");
  const lookups = await loadLookups(showNames ? [...new Set(rows.map((r) => r.patient_id).filter(Boolean))] : []);
  const stats = await one(`SELECT count(*) FILTER (WHERE operation='CREATED')::int AS created, count(*) FILTER (WHERE operation='UPDATED')::int AS updated,
      count(DISTINCT changed_by)::int AS users, count(*) FILTER (WHERE changed_by IS NULL AND source NOT LIKE 'Demo%' AND source NOT LIKE 'Backfilled%')::int AS unattributed
      FROM appointment_audit WHERE at >= $1 AND at < $2`, [zonedToUtc(p.from), zonedToUtc(p.to)]);
  await audit(undefined, actor, "appointment_audit.view", "appointment_audit", null, { from: p.from, to: p.to, q: sp.q, user: sp.user });
  const qs = (n: number) => `?${new URLSearchParams({ ...sp, page: String(n) })}`;
  const exportQs = `from=${p.from}&to=${p.to}${sp.user ? `&user=${encodeURIComponent(sp.user)}` : ""}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`;
  return (
    <div>
      <PageHeader title="Appointment Audit Trail" icon={ScrollText} logo={<HospitalLogo size="sm" showName={false} />}
        description="Every appointment that is entered or changed is saved here automatically – who did it, when, and exactly what changed. Entries cannot be edited or deleted."
        actions={actor.permissions.has("reports.export") || actor.permissions.has("admin.audit") ? <><a className="btn-secondary" href={`/api/export/appointment_audit?${exportQs}&format=xlsx`}><FileSpreadsheet className="h-4 w-4" />Excel</a><a className="btn-secondary" href={`/api/export/appointment_audit?${exportQs}&format=pdf`}><FileDown className="h-4 w-4" />PDF</a></> : null} />
      <Notice className="mb-4">Captured by a database trigger on the appointments table, so changes are recorded even if made outside the normal screens; anything without a signed-in user is flagged as <strong>Unattributed</strong>.</Notice>
      <FilterBar>
        <div><label className="label">From</label><input type="date" name="from" defaultValue={p.from} className="input" /></div>
        <div><label className="label">To</label><input type="date" name="to" defaultValue={p.toIncl} className="input" /></div>
        <div><label className="label">User</label><input name="user" defaultValue={sp.user} className="input" placeholder="Name" /></div>
        <div><label className="label">Accession / MRN / patient</label><input name="q" defaultValue={sp.q} className="input" /></div>
        <div><label className="label">Action</label><select name="op" defaultValue={sp.op ?? ""} className="input"><option value="">All</option><option value="CREATED">Created</option><option value="UPDATED">Changed</option><option value="DELETED">Deleted</option></select></div>
      </FilterBar>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Appointments created" value={stats!.created} tone="green" />
        <StatCard label="Changes recorded" value={stats!.updated} tone="sky" />
        <StatCard label="Users involved" value={stats!.users} tone="brand" />
        <StatCard label="Unattributed changes" value={stats!.unattributed} tone={stats!.unattributed ? "red" : "slate"} alert={stats!.unattributed > 0} />
      </div>
      <Card bodyClass="p-0"><AppointmentAuditTrail rows={rows} lookups={lookups} showAppointment showNames={showNames} /></Card>
      <div className="mt-3 flex gap-2">{page > 1 && <a className="btn-secondary btn-sm" href={qs(page - 1)}>Newer</a>}{rows.length === 100 && <a className="btn-secondary btn-sm" href={qs(page + 1)}>Older</a>}</div>
    </div>
  );
}
