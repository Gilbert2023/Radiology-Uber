import { clsx } from "clsx";
import { Gauge, CheckCircle2, XCircle, CalendarCheck, ShieldCheck, Settings2, Plus } from "lucide-react";
import { requireActor } from "@/server/auth";
import { q } from "@/lib/db";
import { qualitySafety } from "@/server/analytics";
import { listScanners, listStaff } from "@/server/queries";
import { PageHeader, Card, StatCard, Badge, TabLinks, Notice, EmptyState, Pct } from "@/components/ui";
import { HospitalLogo } from "@/components/brand";
import { ActionForm, SubmitButton, Modal } from "@/components/client/forms";
import { Lines } from "@/components/client/charts";
import { PeriodFilter, resolvePeriod } from "@/components/PeriodFilter";
import { fmtDateTime, toLocalInput } from "@/lib/time";
import { labelize } from "@/lib/constants";
import { recordQcAction, verifyQcAction, saveQcParamAction } from "./actions";

export const metadata = { title: "Equipment Quality Control" };
const RES = { PASS: "bg-green-100 text-green-800 ring-green-300", FAIL: "bg-red-100 text-red-800 ring-red-300", NOT_EVALUATED: "bg-slate-100 text-slate-600 ring-slate-300" } as Record<string, string>;

export default async function QC({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const actor = await requireActor("qc.view");
  const sp = await searchParams;
  const tab = ["sessions", "record", "trends", "config"].includes(sp.tab) ? sp.tab : "sessions";
  const p = resolvePeriod(sp);
  const scanners = await listScanners();
  const scannerId = sp.scanner && scanners.some((s) => s.id === sp.scanner) ? sp.scanner : scanners[0]?.id;
  const freq = ["DAILY", "WEEKLY", "MONTHLY", "CUSTOM"].includes(sp.freq) ? sp.freq : "DAILY";
  const params = await q(`SELECT * FROM qc_parameters WHERE scanner_id=$1 ORDER BY frequency, sort_order, name`, [scannerId]);
  const sessions = await q(`SELECT s.*, st.full_name AS performer, u.full_name AS verifier, (SELECT json_agg(json_build_object('name', qp.name, 'unit', qp.unit, 'value', r.value, 'result', r.result, 'obs', r.observation) ORDER BY qp.sort_order) FROM qc_results r JOIN qc_parameters qp ON qp.id=r.parameter_id WHERE r.session_id=s.id) AS results
      FROM qc_sessions s JOIN staff st ON st.id=s.performed_by LEFT JOIN users u ON u.id=s.verified_by WHERE s.scanner_id=$1 AND s.performed_at >= now() - interval '120 days' ORDER BY s.performed_at DESC LIMIT 150`, [scannerId]);
  const quality = await qualitySafety(p);
  const qc = quality.qc.find((x: any) => x.scanner === scanners.find((s) => s.id === scannerId)?.name);
  const trend = await q(`SELECT to_char(s.performed_at AT TIME ZONE 'Africa/Accra','YYYY-MM-DD') AS day, qp.name, r.value FROM qc_results r JOIN qc_sessions s ON s.id=r.session_id JOIN qc_parameters qp ON qp.id=r.parameter_id
      WHERE s.scanner_id=$1 AND r.value IS NOT NULL ORDER BY s.performed_at`, [scannerId]);
  const trendNames = [...new Set(trend.map((t) => t.name))];
  const trendData = Object.values(trend.reduce((acc: any, t) => { (acc[t.day] ??= { day: t.day })[t.name] = t.value; return acc; }, {}));
  const staff = await listStaff("radiographers");
  const fparams = params.filter((x) => x.frequency === freq && x.is_active);
  return (
    <div>
      <PageHeader title="Equipment Quality Control" icon={Gauge} logo={<HospitalLogo size="sm" showName={false} />} description="Configurable QC for the GE SIGNA Creator 1.5T: daily, weekly, monthly and custom schedules with supervisor verification." />
      <Notice tone="warning" className="mb-4">No acceptance thresholds are pre-set. Limits apply only once configured with a documented source (GE guidance or approved departmental standard). Until then, results are recorded as “Not evaluated” or by documented operator judgement.</Notice>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Daily QC compliance" value={<Pct v={qc?.compliancePct} />} icon={CalendarCheck} tone="accent" hint={`${qc?.daysWithDailyQc ?? 0}/${qc?.operatingDays ?? 0} operating days`} />
        <StatCard label="QC sessions (period)" value={qc?.sessions ?? 0} icon={Gauge} tone="brand" />
        <StatCard label="Failures (period)" value={qc?.fails ?? 0} icon={XCircle} tone="red" alert={(qc?.fails ?? 0) > 0} />
        <StatCard label="Verified by supervisor" value={qc?.verified ?? 0} icon={ShieldCheck} tone="green" />
      </div>
      <TabLinks active={tab} tabs={[{ key: "sessions", label: "QC history", href: `?tab=sessions&scanner=${scannerId}` }, { key: "record", label: "Record QC", href: `?tab=record&scanner=${scannerId}` }, { key: "trends", label: "Trends", href: `?tab=trends&scanner=${scannerId}` }, { key: "config", label: "Parameters & thresholds", href: `?tab=config&scanner=${scannerId}` }]} />
      {tab === "sessions" && (
        <Card bodyClass="p-0 overflow-x-auto">{sessions.length === 0 ? <div className="p-4"><EmptyState title="No QC sessions" /></div> : (
          <table className="table text-xs"><thead><tr><th>Performed</th><th>Frequency</th><th>By</th><th>Results</th><th>Overall</th><th>Corrective action</th><th>Verification</th></tr></thead>
            <tbody>{sessions.map((s) => <tr key={s.id} className={clsx(s.overall_result === "FAIL" && "bg-red-50/40")}><td className="whitespace-nowrap">{fmtDateTime(s.performed_at)}</td><td>{labelize(s.frequency)}</td><td>{s.performer}</td>
              <td><div className="flex max-w-md flex-wrap gap-1">{(s.results ?? []).map((r: any) => <Badge key={r.name} className={RES[r.result]} title={r.obs ?? ""}>{r.name.split(" (")[0]}{r.value !== null ? `: ${r.value}${r.unit ?? ""}` : ""}</Badge>)}</div>{s.notes && <div className="mt-1 text-slate-500">{s.notes}</div>}</td>
              <td><Badge className={RES[s.overall_result]}>{labelize(s.overall_result)}</Badge></td><td className="max-w-[220px]">{s.corrective_action ?? "—"}</td>
              <td>{s.verified_at ? <span className="text-green-700">✓ {s.verifier}</span> : actor.permissions.has("qc.verify") ? <ActionForm action={verifyQcAction}><input type="hidden" name="id" value={s.id} /><SubmitButton className="btn-secondary btn-sm" pendingText="…">Verify</SubmitButton></ActionForm> : <span className="text-amber-700">Pending</span>}</td></tr>)}</tbody></table>)}</Card>
      )}
      {tab === "record" && (actor.permissions.has("qc.record") ? (
        <Card title="Record QC session">
          <form method="get" className="mb-4 flex gap-2"><input type="hidden" name="tab" value="record" /><input type="hidden" name="scanner" value={scannerId} />
            {["DAILY", "WEEKLY", "MONTHLY", "CUSTOM"].map((f) => <button key={f} name="freq" value={f} className={f === freq ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>{labelize(f)}</button>)}</form>
          {fparams.length === 0 ? <EmptyState title={`No ${freq.toLowerCase()} parameters configured`}>Add parameters under “Parameters & thresholds”.</EmptyState> : (
            <ActionForm action={recordQcAction} className="space-y-3" resetOnSuccess>
              <input type="hidden" name="scannerId" value={scannerId} /><input type="hidden" name="frequency" value={freq} />
              <div className="grid gap-3 md:grid-cols-3">
                <div><label className="label">Performed at</label><input type="datetime-local" name="performedAt" className="input" defaultValue={toLocalInput(new Date())} /></div>
                <div><label className="label">Performed by</label><select name="performedBy" className="input" defaultValue={actor.staffId ?? ""}>{staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select></div>
                <div><label className="label">Phantom</label><input name="phantom" className="input" placeholder="e.g. GE head phantom" /></div>
              </div>
              <table className="table"><thead><tr><th>Parameter</th><th>Configured limits</th><th>Measured value</th><th>Observation</th><th>Operator judgement (only if no limits)</th></tr></thead>
                <tbody>{fparams.map((x) => { const configured = (x.lower_limit !== null || x.upper_limit !== null) && x.threshold_source; return (
                  <tr key={x.id}><td>{x.name}{x.unit ? ` (${x.unit})` : ""}</td><td className="text-xs">{configured ? `${x.lower_limit ?? "–"} to ${x.upper_limit ?? "–"} · ${x.threshold_source}` : <span className="text-amber-700">Not configured</span>}</td>
                    <td><input name={`v_${x.id}`} type="number" step="any" className="input w-28" /></td><td><input name={`o_${x.id}`} className="input" /></td>
                    <td>{configured ? <span className="text-xs text-slate-500">Automatic</span> : <select name={`r_${x.id}`} className="input w-32"><option value="">—</option><option value="PASS">Pass</option><option value="FAIL">Fail</option></select>}</td></tr>); })}</tbody></table>
              <div className="grid gap-3 md:grid-cols-2"><div><label className="label">Notes</label><textarea name="notes" className="input" rows={2} /></div><div><label className="label">Corrective action (required on failure)</label><textarea name="correctiveAction" className="input" rows={2} /></div></div>
              <SubmitButton>Save QC session</SubmitButton>
            </ActionForm>)}
        </Card>) : <Notice>Your role cannot record QC.</Notice>)}
      {tab === "trends" && (
        <Card title="Measured values over time" subtitle="Only numeric measurements are plotted">{trendNames.length ? <Lines data={trendData} x="day" series={trendNames.map((n) => ({ key: n, label: n }))} height={320} /> : <EmptyState title="No numeric QC measurements yet" />}</Card>
      )}
      {tab === "config" && (
        <Card title="QC parameters" actions={actor.permissions.has("qc.configure") && <Modal title="Add QC parameter" trigger={<><Plus className="h-4 w-4" />Add parameter</>} triggerClass="btn-secondary btn-sm"><ParamForm scannerId={scannerId} /></Modal>} bodyClass="p-0">
          <table className="table"><thead><tr><th>Parameter</th><th>Frequency</th><th>Unit</th><th>Lower</th><th>Upper</th><th>Threshold source</th><th>Active</th><th /></tr></thead>
            <tbody>{params.map((x) => <tr key={x.id}><td>{x.name}</td><td>{labelize(x.frequency)}</td><td>{x.unit ?? "—"}</td><td>{x.lower_limit ?? "—"}</td><td>{x.upper_limit ?? "—"}</td><td className="text-xs">{x.threshold_source ?? <span className="text-amber-700">Not configured</span>}</td><td>{x.is_active ? "Yes" : "No"}</td>
              <td>{actor.permissions.has("qc.configure") && <Modal title={`Edit ${x.name}`} trigger={<Settings2 className="h-4 w-4" />} triggerClass="btn-ghost btn-sm"><ParamForm scannerId={scannerId} p={x} /></Modal>}</td></tr>)}</tbody></table>
        </Card>
      )}
    </div>
  );
}

function ParamForm({ scannerId, p }: { scannerId: string; p?: any }) {
  return (
    <ActionForm action={saveQcParamAction} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="scannerId" value={scannerId} />{p && <input type="hidden" name="id" value={p.id} />}
      <div className="sm:col-span-2"><label className="label">Parameter</label><input name="name" className="input" required defaultValue={p?.name} /></div>
      <div><label className="label">Frequency</label><select name="frequency" className="input" defaultValue={p?.frequency ?? "DAILY"}>{["DAILY", "WEEKLY", "MONTHLY", "CUSTOM"].map((f) => <option key={f} value={f}>{labelize(f)}</option>)}</select></div>
      <div><label className="label">Unit</label><input name="unit" className="input" defaultValue={p?.unit ?? ""} /></div>
      <div><label className="label">Lower limit</label><input name="lowerLimit" type="number" step="any" className="input" defaultValue={p?.lower_limit ?? ""} /></div>
      <div><label className="label">Upper limit</label><input name="upperLimit" type="number" step="any" className="input" defaultValue={p?.upper_limit ?? ""} /></div>
      <div className="sm:col-span-2"><label className="label">Threshold source (required with limits)</label><input name="thresholdSource" className="input" defaultValue={p?.threshold_source ?? ""} placeholder="Document title, revision and section" /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={p ? p.is_active : true} />Active</label>
      <SubmitButton>Save</SubmitButton>
    </ActionForm>
  );
}
