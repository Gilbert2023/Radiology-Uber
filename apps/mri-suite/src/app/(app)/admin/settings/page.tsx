import { Settings, Plus, Plug } from "lucide-react";
import { requireActor } from "@/server/auth";
import { q } from "@/lib/db";
import { getSettings, getHospital, SETTING_DESCRIPTIONS } from "@/server/settings";
import { PageHeader, Card, TabLinks, MapBadge, Notice, Badge } from "@/components/ui";
import { ActionForm, SubmitButton, Modal } from "@/components/client/forms";
import { INTEGRATION_STATUS, BODY_REGIONS, labelize } from "@/lib/constants";
import { fmtDateTime } from "@/lib/time";
import { settingsAction, scannerAction, examTypeAction, integrationAction } from "../actions";
export const metadata = { title: "System Settings" };
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireActor("admin.settings");
  const sp = await searchParams;
  const tab = ["general", "scanners", "exams", "integrations"].includes(sp.tab) ? sp.tab : "general";
  const [s, h, scanners, exams, preps, integ] = await Promise.all([getSettings(), getHospital(), q(`SELECT * FROM scanners ORDER BY name`), q(`SELECT e.*, p.name AS prep FROM exam_types e LEFT JOIN prep_protocols p ON p.id=e.prep_protocol_id ORDER BY e.name`), q(`SELECT id, name FROM prep_protocols ORDER BY name`), q(`SELECT i.*, u.full_name FROM integrations i LEFT JOIN users u ON u.id=i.updated_by ORDER BY name`)]);
  const num = (k: keyof typeof s) => <div key={k}><label className="label">{SETTING_DESCRIPTIONS[k]}</label><input name={k} type="number" className="input" defaultValue={s[k] as number} required /></div>;
  const ScannerForm = ({ x }: { x?: any }) => (
    <ActionForm action={scannerAction} className="grid gap-3 sm:grid-cols-2">{x && <input type="hidden" name="id" value={x.id} />}
      <div><label className="label">Name *</label><input name="name" className="input" required defaultValue={x?.name} /></div><div><label className="label">Manufacturer *</label><input name="manufacturer" className="input" required defaultValue={x?.manufacturer ?? "GE HealthCare"} /></div>
      <div><label className="label">Model *</label><input name="model" className="input" required defaultValue={x?.model} /></div><div><label className="label">Field strength (T) *</label><input name="fieldStrength" type="number" step="0.1" className="input" required defaultValue={x?.field_strength_t} /></div>
      <div><label className="label">Serial number</label><input name="serialNo" className="input" defaultValue={x?.serial_no ?? ""} /></div><div><label className="label">Installed on</label><input name="installedOn" type="date" className="input" defaultValue={x?.installed_on ?? ""} /></div>
      <div><label className="label">Location</label><input name="location" className="input" defaultValue={x?.location ?? ""} /></div><div><label className="label">Service provider</label><input name="serviceProvider" className="input" defaultValue={x?.service_provider ?? ""} /></div>
      <div className="sm:col-span-2"><label className="label">Installation notes</label><input name="installationNotes" className="input" defaultValue={x?.installation_notes ?? ""} /></div>
      <div><label className="label">Calendar colour</label><input name="colour" type="color" className="input h-10" defaultValue={x?.colour ?? "#2c3135"} /></div>
      <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={x ? x.is_active : true} />Active</label><SubmitButton>Save</SubmitButton></ActionForm>);
  const ExamForm = ({ x }: { x?: any }) => (
    <ActionForm action={examTypeAction} className="grid gap-3 sm:grid-cols-2">{x && <input type="hidden" name="id" value={x.id} />}
      <div><label className="label">Code *</label><input name="code" className="input" required defaultValue={x?.code} /></div><div><label className="label">Name *</label><input name="name" className="input" required defaultValue={x?.name} /></div>
      <div><label className="label">Body region</label><select name="bodyRegion" className="input" defaultValue={x?.body_region ?? "BRAIN"}>{Object.entries(BODY_REGIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      <div><label className="label">Default slot (minutes)</label><input name="defaultDurationMin" type="number" className="input" required defaultValue={x?.default_duration_min ?? 30} /></div>
      <div><label className="label">Preparation protocol</label><select name="prepProtocolId" className="input" defaultValue={x?.prep_protocol_id ?? ""}><option value="">—</option>{preps.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      <div className="flex items-end gap-4 pb-2 text-sm"><label className="flex items-center gap-1.5"><input type="checkbox" name="contrastDefault" defaultChecked={x?.contrast_default} />Contrast by default</label><label className="flex items-center gap-1.5"><input type="checkbox" name="isActive" defaultChecked={x ? x.is_active : true} />Active</label></div>
      <SubmitButton>Save</SubmitButton></ActionForm>);
  return (
    <div>
      <PageHeader title="System Settings" icon={Settings} description={`${h?.name} · ${h?.department} · Time zone ${h?.timezone} · Currency setting ${h?.currency} (no financial features)`} />
      <TabLinks active={tab} tabs={[{ key: "general", label: "Operating hours & thresholds", href: "?tab=general" }, { key: "scanners", label: "Scanners", href: "?tab=scanners" }, { key: "exams", label: "Examination types", href: "?tab=exams" }, { key: "integrations", label: "Integrations", href: "?tab=integrations" }]} />
      {tab === "general" && (
        <ActionForm action={settingsAction} className="space-y-4">
          <Card title="Scanner operating hours" subtitle="Used for routine booking limits, open-slot counts and utilisation (available hours)">
            <div className="grid gap-2">{DAYS.map((d, i) => { const v = s.operatingHours[String(i)]; return (
              <div key={d} className="grid grid-cols-[110px_1fr_1fr_auto_auto] items-center gap-2 text-sm"><span className="font-medium">{d}</span>
                <input type="time" name={`open_${i}`} className="input" defaultValue={v && v.close !== "24:00" ? v.open : "08:00"} aria-label={`${d} open`} /><input type="time" name={`close_${i}`} className="input" defaultValue={v && v.close !== "24:00" ? v.close : "17:00"} aria-label={`${d} close`} />
                <label className="flex items-center gap-1.5 text-xs font-semibold"><input type="checkbox" name={`allday_${i}`} defaultChecked={v?.open === "00:00" && v?.close === "24:00"} />Open 24 hours</label>
                <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" name={`closed_${i}`} defaultChecked={!v} />Closed</label></div>); })}</div>
            <p className="mt-2 text-xs text-slate-500">“Open 24 hours” overrides the times. The MRI unit is configured for 24/7 operation.</p>
          </Card>
          <Card title="Alert thresholds & behaviour"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {num("waitAlertMinutes")}{num("waitingStatusMinutes")}{num("lateGraceMinutes")}{num("pacsPendingAlertMinutes")}{num("maintenanceDueDays")}{num("contrastExpiryDays")}{num("sessionIdleMinutes")}{num("uploadMaxMb")}
            <div><label className="label">{SETTING_DESCRIPTIONS.slotMinutes}</label><select name="slotMinutes" className="input" defaultValue={s.slotMinutes}>{[5, 10, 15, 20, 30].map((n) => <option key={n}>{n}</option>)}</select></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="monitorModeDefault" defaultChecked={s.monitorModeDefault} />{SETTING_DESCRIPTIONS.monitorModeDefault}</label>
          </div></Card>
          <SubmitButton>Save settings</SubmitButton>
        </ActionForm>
      )}
      {tab === "scanners" && (
        <Card title="Scanners" actions={<Modal title="Add scanner" wide trigger={<><Plus className="h-4 w-4" />Add scanner</>} triggerClass="btn-accent btn-sm"><ScannerForm /></Modal>} bodyClass="p-0">
          <table className="table"><thead><tr><th>Name</th><th>Model</th><th>Field</th><th>Serial</th><th>Location</th><th>Active</th><th /></tr></thead>
            <tbody>{scanners.map((x) => <tr key={x.id}><td><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: x.colour }} />{x.name}</td><td>{x.manufacturer} {x.model}</td><td>{x.field_strength_t} T</td><td>{x.serial_no ?? <span className="text-amber-700">Not entered</span>}</td><td>{x.location}</td><td>{x.is_active ? "Yes" : "No"}</td><td><Modal title={`Edit ${x.name}`} wide trigger="Edit" triggerClass="btn-secondary btn-sm"><ScannerForm x={x} /></Modal></td></tr>)}</tbody></table>
        </Card>
      )}
      {tab === "exams" && (
        <Card title="Examination types & slot durations" actions={<Modal title="Add examination type" wide trigger={<><Plus className="h-4 w-4" />Add</>} triggerClass="btn-accent btn-sm"><ExamForm /></Modal>} bodyClass="p-0">
          <table className="table"><thead><tr><th>Code</th><th>Name</th><th>Region</th><th>Slot</th><th>Contrast</th><th>Preparation</th><th>Active</th><th /></tr></thead>
            <tbody>{exams.map((x) => <tr key={x.id}><td className="font-mono text-xs">{x.code}</td><td>{x.name}</td><td>{BODY_REGIONS[x.body_region]}</td><td>{x.default_duration_min} min</td><td>{x.contrast_default ? "Yes" : "—"}</td><td className="text-xs">{x.prep ?? "—"}</td><td>{x.is_active ? "Yes" : "No"}</td><td><Modal title={`Edit ${x.name}`} wide trigger="Edit" triggerClass="btn-secondary btn-sm"><ExamForm x={x} /></Modal></td></tr>)}</tbody></table>
        </Card>
      )}
      {tab === "integrations" && (
        <div className="space-y-3">
          <Notice title="No external integration is simulated">The system operates fully with manual entry. “Connected” and “Failed” are reserved for live connector health checks and cannot be set by hand; this deployment has no live connectors.</Notice>
          <div className="grid gap-3 md:grid-cols-2">{integ.map((i) => (
            <Card key={i.code} title={i.name} icon={Plug} actions={<MapBadge map={INTEGRATION_STATUS} value={i.status} />}>
              <p className="text-sm text-slate-600">{i.description}</p>
              {i.endpoint && <p className="mt-1 font-mono text-xs">{i.endpoint}</p>}{i.notes && <p className="mt-1 text-xs text-slate-500">{i.notes}</p>}
              <p className="mt-1 text-[11px] text-slate-400">Updated {fmtDateTime(i.updated_at)}{i.full_name ? ` by ${i.full_name}` : ""}</p>
              <Modal title={`Configure ${i.name}`} trigger="Configure" triggerClass="btn-secondary btn-sm mt-2"><ActionForm action={integrationAction} className="space-y-3"><input type="hidden" name="code" value={i.code} />
                <select name="status" className="input" defaultValue={["NOT_CONNECTED", "CONFIGURED", "UNDER_DEVELOPMENT"].includes(i.status) ? i.status : "NOT_CONNECTED"}><option value="NOT_CONNECTED">Not connected</option><option value="CONFIGURED">Configured (not yet live)</option><option value="UNDER_DEVELOPMENT">Under development</option></select>
                <input name="endpoint" className="input" placeholder="Endpoint / AE title (no secrets)" defaultValue={i.endpoint ?? ""} /><textarea name="notes" className="input" placeholder="Notes" defaultValue={i.notes ?? ""} /><SubmitButton>Save</SubmitButton></ActionForm></Modal>
            </Card>))}</div>
        </div>
      )}
    </div>
  );
}
