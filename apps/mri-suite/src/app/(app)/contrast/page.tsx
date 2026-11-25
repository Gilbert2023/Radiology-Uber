import Link from "next/link";
import { clsx } from "clsx";
import { Droplets, PackagePlus, AlertTriangle, CalendarX, Syringe, FileSpreadsheet } from "lucide-react";
import { requireActor } from "@/server/auth";
import { q } from "@/lib/db";
import { getSettings } from "@/server/settings";
import { PageHeader, Card, StatCard, Badge, TabLinks, EmptyState, Notice } from "@/components/ui";
import { HospitalLogo } from "@/components/brand";
import { ActionForm, SubmitButton, Modal } from "@/components/client/forms";
import { Bars } from "@/components/client/charts";
import { PeriodFilter, resolvePeriod } from "@/components/PeriodFilter";
import { localDate, addDays, fmtDate, fmtDateTime, zonedToUtc } from "@/lib/time";
import { labelize } from "@/lib/constants";
import { receiveContrastAction, adjustContrastAction } from "./actions";

export const metadata = { title: "Contrast Media Management" };
export default async function Contrast({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const actor = await requireActor("contrast.view");
  const sp = await searchParams;
  const tab = ["inventory", "administrations", "movements", "usage"].includes(sp.tab) ? sp.tab : "inventory";
  const p = resolvePeriod(sp);
  const settings = await getSettings();
  const today = localDate();
  const agents = await q(`SELECT ag.*, COALESCE(sum(b.current_stock) FILTER (WHERE b.expiry_date >= current_date),0) AS in_date, COALESCE(sum(b.current_stock) FILTER (WHERE b.expiry_date < current_date),0) AS expired
      FROM contrast_agents ag LEFT JOIN contrast_batches b ON b.agent_id=ag.id GROUP BY ag.id ORDER BY ag.name`);
  const batches = await q(`SELECT b.*, b.expiry_date::text AS expiry, ag.name, ag.unit FROM contrast_batches b JOIN contrast_agents ag ON ag.id=b.agent_id ORDER BY ag.name, b.expiry_date`);
  const [f, t] = [zonedToUtc(p.from), zonedToUtc(p.to)];
  const admins = await q(`SELECT ca.*, ag.name AS agent, b.batch_no, p.full_name, p.mrn, a.accession_no, e.name AS exam, st.full_name AS staff FROM contrast_administrations ca JOIN contrast_agents ag ON ag.id=ca.agent_id
      JOIN contrast_batches b ON b.id=ca.batch_id JOIN patients p ON p.id=ca.patient_id JOIN appointments a ON a.id=ca.appointment_id JOIN exam_types e ON e.id=a.exam_type_id JOIN staff st ON st.id=ca.administered_by
      WHERE ca.administered_at >= $1 AND ca.administered_at < $2 ORDER BY ca.administered_at DESC LIMIT 300`, [f, t]);
  const usage = await q(`SELECT e.name AS exam, count(*)::int AS n, sum(ca.dose_ml) AS ml FROM contrast_administrations ca JOIN appointments a ON a.id=ca.appointment_id JOIN exam_types e ON e.id=a.exam_type_id
      WHERE ca.administered_at >= $1 AND ca.administered_at < $2 GROUP BY 1 ORDER BY 3 DESC`, [f, t]);
  const daily = await q(`SELECT to_char(administered_at AT TIME ZONE 'Africa/Accra','YYYY-MM-DD') AS day, sum(dose_ml) AS ml FROM contrast_administrations WHERE administered_at >= $1 AND administered_at < $2 GROUP BY 1 ORDER BY 1`, [f, t]);
  const moves = await q(`SELECT m.*, b.batch_no, ag.name, u.full_name FROM contrast_stock_movements m JOIN contrast_batches b ON b.id=m.batch_id JOIN contrast_agents ag ON ag.id=b.agent_id LEFT JOIN users u ON u.id=m.user_id ORDER BY m.at DESC LIMIT 200`);
  const low = agents.filter((a) => a.is_active && a.in_date <= a.reorder_level);
  const expiring = batches.filter((b) => b.current_stock > 0 && b.expiry <= addDays(today, settings.contrastExpiryDays));
  const canInv = actor.permissions.has("contrast.inventory");
  const showNames = actor.permissions.has("patients.view");
  return (
    <div>
      <PageHeader title="Contrast Media Management" icon={Droplets} logo={<HospitalLogo size="sm" showName={false} />} description="Clinical inventory, batch traceability and administration records. No financial data is held."
        actions={<>{actor.permissions.has("reports.export") && <a className="btn-secondary" href={`/api/export/contrast?from=${p.from}&to=${p.to}&format=xlsx`}><FileSpreadsheet className="h-4 w-4" />Usage report</a>}
          {canInv && <Modal title="Receive contrast stock" trigger={<><PackagePlus className="h-4 w-4" />Receive stock</>} triggerClass="btn-accent">
            <ActionForm action={receiveContrastAction} className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><label className="label">Agent *</label><select name="agentId" className="input" required>{agents.filter((a) => a.is_active).map((a) => <option key={a.id} value={a.id}>{a.name} ({a.concentration})</option>)}</select></div>
              <div><label className="label">Batch number *</label><input name="batchNo" className="input" required /></div>
              <div><label className="label">Expiry date *</label><input type="date" name="expiryDate" className="input" required /></div>
              <div><label className="label">Quantity received (mL) *</label><input type="number" step="0.1" name="quantity" className="input" required /></div>
              <div><label className="label">Received on</label><input type="date" name="receivedOn" className="input" defaultValue={today} /></div>
              <div className="sm:col-span-2"><label className="label">Supplier</label><input name="supplier" className="input" /></div>
              <SubmitButton>Receive</SubmitButton>
            </ActionForm></Modal>}</>} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Agents below reorder level" value={low.length} icon={AlertTriangle} tone="red" alert={low.length > 0} />
        <StatCard label={`Batches expiring ≤ ${settings.contrastExpiryDays} d`} value={expiring.length} icon={CalendarX} tone="amber" />
        <StatCard label="Administrations (period)" value={admins.length} icon={Syringe} tone="violet" />
        <StatCard label="Volume used (period)" value={`${admins.reduce((a, b) => a + b.dose_ml, 0).toFixed(0)} mL`} icon={Droplets} tone="brand" />
      </div>
      {low.map((a) => <Notice key={a.id} tone="danger" className="mb-2">{a.name}: {a.in_date} {a.unit} in-date stock (reorder level {a.reorder_level} {a.unit}).</Notice>)}
      <TabLinks active={tab} tabs={[{ key: "inventory", label: "Inventory", href: "?tab=inventory" }, { key: "administrations", label: "Administrations", href: `?tab=administrations&from=${p.from}&to=${p.toIncl}` }, { key: "usage", label: "Usage by examination", href: `?tab=usage&from=${p.from}&to=${p.toIncl}` }, { key: "movements", label: "Stock movements", href: "?tab=movements" }]} />
      {(tab === "administrations" || tab === "usage") && <PeriodFilter sp={sp} extra={<input type="hidden" name="tab" value={tab} />} />}
      {tab === "inventory" && (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">{agents.map((a) => (
            <Card key={a.id} title={a.name} subtitle={`${a.manufacturer} · ${a.concentration} · ${labelize(a.agent_type)}`}>
              <div className="flex items-end justify-between"><div><div className={clsx("kpi-num", a.in_date <= a.reorder_level && "text-red-600")}>{a.in_date} <span className="text-sm font-medium text-slate-500">{a.unit}</span></div><div className="text-xs text-slate-500">in-date stock · reorder at {a.reorder_level}</div></div>{a.expired > 0 && <Badge className="bg-red-50 text-red-700 ring-red-200">{a.expired} mL expired</Badge>}</div>
            </Card>))}</div>
          <Card title="Batches" bodyClass="p-0 overflow-x-auto">
            <table className="table"><thead><tr><th>Agent</th><th>Batch</th><th>Expiry</th><th>Received</th><th>Current stock</th><th>Used</th><th>Supplier</th><th /></tr></thead>
              <tbody>{batches.map((b) => <tr key={b.id} className={clsx(b.expiry < today && "bg-red-50/40")}><td>{b.name}</td><td className="font-mono text-xs">{b.batch_no}</td>
                <td>{fmtDate(b.expiry)} {b.expiry < today ? <Badge className="bg-red-100 text-red-800 ring-red-300">Expired</Badge> : b.expiry <= addDays(today, settings.contrastExpiryDays) ? <Badge className="bg-amber-50 text-amber-800 ring-amber-200">Expiring</Badge> : null}</td>
                <td>{fmtDate(b.received_on)} · {b.quantity_received} mL</td><td className="font-semibold tabular-nums">{b.current_stock} mL</td><td className="tabular-nums">{(b.quantity_received - b.current_stock).toFixed(1)} mL</td><td>{b.supplier}</td>
                <td>{canInv && <Modal title={`Adjust batch ${b.batch_no}`} trigger="Adjust" triggerClass="btn-secondary btn-sm"><ActionForm action={adjustContrastAction} className="space-y-3"><input type="hidden" name="batchId" value={b.id} />
                  <div><label className="label">Type</label><select name="type" className="input"><option value="ADJUSTMENT">Stock count adjustment (+/−)</option><option value="DISPOSAL">Disposal (expired / damaged)</option></select></div>
                  <div><label className="label">Quantity (mL, negative to reduce)</label><input type="number" step="0.1" name="quantity" className="input" required /></div>
                  <div><label className="label">Reason *</label><input name="reason" className="input" required /></div><SubmitButton>Save</SubmitButton></ActionForm></Modal>}</td></tr>)}</tbody></table>
          </Card>
        </div>
      )}
      {tab === "administrations" && (
        <Card bodyClass="p-0 overflow-x-auto">{admins.length === 0 ? <div className="p-4"><EmptyState title="No administrations in period" /></div> : (
          <table className="table text-xs"><thead><tr><th>Time</th><th>Patient</th><th>Examination</th><th>Agent / batch</th><th>Dose</th><th>Route</th><th>Staff</th><th>Adverse event</th></tr></thead>
            <tbody>{admins.map((c) => <tr key={c.id}><td>{fmtDateTime(c.administered_at)}</td><td><Link className="link" href={`/appointments/${c.appointment_id}`}>{showNames ? c.full_name : c.mrn}</Link></td><td>{c.exam}</td><td>{c.agent}<div className="text-slate-500">{c.batch_no}</div></td><td className="tabular-nums">{c.dose_ml} mL</td><td>{labelize(c.route)}</td><td>{c.staff}</td>
              <td>{c.adverse_reaction ? <Badge className="bg-red-50 text-red-700 ring-red-200">Reaction ({c.reaction_severity?.toLowerCase()})</Badge> : c.extravasation ? <Badge className="bg-orange-50 text-orange-800 ring-orange-200">Extravasation</Badge> : "—"}{c.incident_id && <Link href={`/incidents/${c.incident_id}`} className="link ml-1">incident</Link>}</td></tr>)}</tbody></table>)}</Card>
      )}
      {tab === "usage" && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card title="Daily contrast volume (mL)"><Bars data={daily} x="day" series={[{ key: "ml", label: "mL", color: "#8b5cf6" }]} /></Card>
          <Card title="Consumption by examination" bodyClass="p-0"><table className="table"><thead><tr><th>Examination</th><th>Administrations</th><th>Total mL</th><th>Mean mL</th></tr></thead><tbody>{usage.map((u) => <tr key={u.exam}><td>{u.exam}</td><td className="tabular-nums">{u.n}</td><td className="tabular-nums">{u.ml.toFixed(1)}</td><td className="tabular-nums">{(u.ml / u.n).toFixed(1)}</td></tr>)}</tbody></table></Card>
        </div>
      )}
      {tab === "movements" && (
        <Card bodyClass="p-0 overflow-x-auto"><table className="table text-xs"><thead><tr><th>Time</th><th>Agent / batch</th><th>Type</th><th>Quantity</th><th>Reason</th><th>User</th></tr></thead>
          <tbody>{moves.map((m) => <tr key={m.id}><td>{fmtDateTime(m.at)}</td><td>{m.name}<div className="text-slate-500">{m.batch_no}</div></td><td>{labelize(m.movement_type)}</td><td className={clsx("tabular-nums font-semibold", m.quantity < 0 ? "text-red-700" : "text-green-700")}>{m.quantity > 0 ? "+" : ""}{m.quantity} mL</td><td>{m.reason}</td><td>{m.full_name}</td></tr>)}</tbody></table></Card>
      )}
    </div>
  );
}
