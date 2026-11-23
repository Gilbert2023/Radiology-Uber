import { clsx } from "clsx";
import { SprayCan, CheckCircle2, XCircle, ShieldCheck, FileDown } from "lucide-react";
import { requireActor } from "@/server/auth";
import { q } from "@/lib/db";
import { listStaff } from "@/server/queries";
import { PageHeader, Card, StatCard, Badge, Pct, EmptyState } from "@/components/ui";
import { HospitalLogo } from "@/components/brand";
import { ActionForm, SubmitButton, Modal } from "@/components/client/forms";
import { PeriodFilter, resolvePeriod } from "@/components/PeriodFilter";
import { fmtDateTime, toLocalInput, zonedToUtc, dayBounds, localDate } from "@/lib/time";
import { labelize } from "@/lib/constants";
import { cleaningAction, verifyCleaningAction } from "./actions";
export const metadata = { title: "Cleaning & Infection Control" };
export default async function Cleaning({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const actor = await requireActor("cleaning.view", "cleaning.record");
  const sp = await searchParams;
  const p = resolvePeriod(sp, 7);
  const areas = await q(`SELECT * FROM cleaning_areas WHERE is_active ORDER BY sort_order`);
  const recs = await q(`SELECT c.*, a.name AS area, st.full_name AS staff, u.full_name AS verifier FROM cleaning_records c JOIN cleaning_areas a ON a.id=c.area_id JOIN staff st ON st.id=c.staff_id LEFT JOIN users u ON u.id=c.verified_by
      WHERE c.cleaned_at >= $1 AND c.cleaned_at < $2 ORDER BY c.cleaned_at DESC LIMIT 400`, [zonedToUtc(p.from), zonedToUtc(p.to)]);
  const [ts, te] = dayBounds(localDate());
  const todayDone = await q(`SELECT area_id, count(*)::int AS n FROM cleaning_records WHERE cleaned_at >= $1 AND cleaned_at < $2 GROUP BY 1`, [ts, te]);
  const staff = await listStaff("clinical");
  const compliant = recs.filter((r) => r.compliant).length;
  return (
    <div>
      <PageHeader title="Cleaning & Infection Control" icon={SprayCan} logo={<HospitalLogo size="sm" showName={false} />} description="Checklists for the scan room, patient table, coils and equipment surfaces with supervisor verification and compliance reporting."
        actions={actor.permissions.has("reports.export") && <a className="btn-secondary" href={`/api/export/cleaning?from=${p.from}&to=${p.to}&format=pdf`}><FileDown className="h-4 w-4" />Compliance report</a>} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Records (period)" value={recs.length} icon={SprayCan} tone="brand" />
        <StatCard label="Compliance" value={<Pct v={recs.length ? (compliant / recs.length) * 100 : null} />} icon={CheckCircle2} tone="green" />
        <StatCard label="Non-compliant" value={recs.length - compliant} icon={XCircle} tone="red" />
        <StatCard label="Awaiting verification" value={recs.filter((r) => !r.verified_at).length} icon={ShieldCheck} tone="amber" />
      </div>
      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {areas.map((a) => { const n = todayDone.find((t) => t.area_id === a.id)?.n ?? 0; return (
          <Card key={a.id} title={a.name} subtitle={`${labelize(a.frequency)} · ${n} today`} actions={actor.permissions.has("cleaning.record") && (
            <Modal title={`Cleaning checklist – ${a.name}`} trigger="Record" triggerClass="btn-accent btn-sm">
              <ActionForm action={cleaningAction} className="space-y-3"><input type="hidden" name="areaId" value={a.id} />
                {(a.checklist as string[]).map((c) => <label key={c} className="flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-sm has-[:checked]:bg-green-50"><input type="checkbox" name="items[]" value={c} className="h-4 w-4" />{c}</label>)}
                <div className="grid grid-cols-2 gap-2"><div><label className="label">Time</label><input type="datetime-local" name="cleanedAt" className="input" defaultValue={toLocalInput(new Date())} /></div>
                  <div><label className="label">Staff responsible</label><select name="staffId" className="input" defaultValue={actor.staffId ?? ""}>{staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select></div></div>
                <div><label className="label">Notes (required if any item not done)</label><input name="notes" className="input" /></div><SubmitButton>Save</SubmitButton></ActionForm></Modal>)}>
            <ul className="space-y-0.5 text-xs text-slate-600">{(a.checklist as string[]).map((c) => <li key={c}>• {c}</li>)}</ul>
          </Card>); })}
      </div>
      <PeriodFilter sp={sp} />
      <Card title="Cleaning records" bodyClass="p-0 overflow-x-auto">{recs.length === 0 ? <div className="p-4"><EmptyState title="No records" /></div> : (
        <table className="table text-xs"><thead><tr><th>Time</th><th>Area</th><th>Staff</th><th>Checklist</th><th>Compliant</th><th>Verification</th></tr></thead>
          <tbody>{recs.map((r) => <tr key={r.id} className={clsx(!r.compliant && "bg-red-50/40")}><td className="whitespace-nowrap">{fmtDateTime(r.cleaned_at)}</td><td>{r.area}</td><td>{r.staff}</td>
            <td><div className="flex flex-wrap gap-1">{Object.entries(r.checklist).map(([k, v]) => <Badge key={k} className={v ? "bg-green-50 text-green-800 ring-green-200" : "bg-red-50 text-red-700 ring-red-200"}>{k}</Badge>)}</div>{r.notes && <div className="text-slate-500">{r.notes}</div>}</td>
            <td>{r.compliant ? "Yes" : <span className="font-semibold text-red-700">No</span>}</td>
            <td>{r.verified_at ? <span className="text-green-700">✓ {r.verifier}</span> : actor.permissions.has("cleaning.verify") ? <ActionForm action={verifyCleaningAction}><input type="hidden" name="id" value={r.id} /><SubmitButton className="btn-secondary btn-sm" pendingText="…">Verify</SubmitButton></ActionForm> : "Pending"}</td></tr>)}</tbody></table>)}</Card>
    </div>
  );
}
