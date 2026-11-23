import Link from "next/link";
import { clsx } from "clsx";
import { UploadCloud, CheckCircle2, CloudOff, Clock, Percent, Timer, SearchX, ScanLine, FileSpreadsheet } from "lucide-react";
import { requireActor } from "@/server/auth";
import { q } from "@/lib/db";
import { pacsKpis, DEFINITIONS } from "@/server/analytics";
import { getSettings } from "@/server/settings";
import { PageHeader, Card, StatCard, MapBadge, Notice, Pct, EmptyState } from "@/components/ui";
import { HospitalLogo } from "@/components/brand";
import { PeriodFilter, resolvePeriod } from "@/components/PeriodFilter";
import { ActionForm, SubmitButton, Modal, ShowWhen } from "@/components/client/forms";
import { Bars } from "@/components/client/charts";
import { PACS_STATUS, PACS_TRANSITIONS } from "@/lib/constants";
import { fmtDateTime, fmtMinutes, minutesBetween, toLocalInput, zonedToUtc } from "@/lib/time";
import { pacsStatusAction, pacsConfirmAction } from "../appointments/actions";

export const metadata = { title: "PACS Upload Tracking" };

export default async function Pacs({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const actor = await requireActor("pacs.view");
  const sp = await searchParams;
  const p = resolvePeriod(sp);
  const settings = await getSettings();
  const k = await pacsKpis(p);
  const statusFilter = sp.status === "FAILED" ? ["UPLOAD_FAILED", "REQUIRES_INVESTIGATION"] : sp.status === "PENDING" ? ["PENDING_UPLOAD", "UPLOADING"] : sp.status && PACS_STATUS[sp.status] ? [sp.status] : null;
  const sel = `SELECT pu.*, a.id AS appt_id, a.accession_no, a.status AS appt_status, p.full_name, p.mrn, e.name AS exam, s.name AS scanner, st.full_name AS radiographer, sr.ended_at, sr.started_at, u.full_name AS confirmed_by_name
      FROM pacs_uploads pu JOIN appointments a ON a.id=pu.appointment_id JOIN patients p ON p.id=a.patient_id JOIN exam_types e ON e.id=a.exam_type_id JOIN scanners s ON s.id=a.scanner_id
      JOIN scan_records sr ON sr.id=pu.scan_record_id JOIN staff st ON st.id=sr.radiographer_id LEFT JOIN users u ON u.id=pu.confirmed_by`;
  const exceptions = await q(`${sel} WHERE pu.status <> 'SUCCESSFULLY_UPLOADED' OR pu.verification_status <> 'VERIFIED' ORDER BY sr.ended_at`);
  const rows = await q(`${sel} WHERE sr.started_at >= $1 AND sr.started_at < $2 ${statusFilter ? "AND pu.status = ANY($3)" : ""} ORDER BY sr.ended_at DESC LIMIT 400`,
    statusFilter ? [zonedToUtc(p.from), zonedToUtc(p.to), statusFilter] : [zonedToUtc(p.from), zonedToUtc(p.to)]);
  const showNames = actor.permissions.has("patients.view");
  const canManage = actor.permissions.has("pacs.manage"), canVerify = actor.permissions.has("pacs.verify");
  const Row = ({ r, compact }: { r: any; compact?: boolean }) => {
    const pendingMin = ["PENDING_UPLOAD", "UPLOADING"].includes(r.status) && r.ended_at ? minutesBetween(r.ended_at) : null;
    return (
      <tr id={`u-${r.id}`} className={clsx(sp.focus === r.id && "bg-amber-50")}>
        <td><Link href={`/appointments/${r.appt_id}`} className="link">{showNames ? r.full_name : r.mrn}</Link><div className="text-xs text-slate-500">{r.mrn}</div></td>
        <td className="font-mono text-xs">{r.accession_no}</td>
        <td>{r.exam}<div className="text-xs text-slate-500">{r.scanner}</div></td>
        {!compact && <td className="text-xs">{fmtDateTime(r.started_at)}</td>}
        <td>{r.radiographer}</td>
        <td className="text-xs">{fmtDateTime(r.initiated_at)}</td>
        <td className="text-xs">{fmtDateTime(r.completed_at)}{r.completed_at && r.ended_at && <div className="text-slate-500">{fmtMinutes(minutesBetween(r.ended_at, r.completed_at))} after scan</div>}</td>
        <td><MapBadge map={PACS_STATUS} value={r.status} />{pendingMin !== null && <div className={clsx("text-[11px]", pendingMin > settings.pacsPendingAlertMinutes ? "font-semibold text-red-600" : "text-slate-500")}>{fmtMinutes(pendingMin)} since scan</div>}
          {r.failure_reason && <div className="max-w-[200px] text-[11px] text-red-700">{r.failure_reason}</div>}{r.corrective_action && <div className="max-w-[200px] text-[11px] text-slate-600">Action: {r.corrective_action}</div>}</td>
        <td className="text-xs">{r.verification_status === "VERIFIED" ? <span className="text-green-700">✓ {r.confirmed_by_name}</span> : <span className="text-amber-700">Unconfirmed</span>}</td>
        <td className="whitespace-nowrap text-right">
          {canManage && PACS_TRANSITIONS[r.status]?.length > 0 && (
            <Modal title={`Update PACS status – ${r.accession_no}`} trigger="Update" triggerClass="btn-secondary btn-sm">
              <ActionForm action={pacsStatusAction} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="uploadId" value={r.id} />
                <div><label className="label">New status</label><select name="status" className="input" required defaultValue=""><option value="" disabled>Select…</option>{PACS_TRANSITIONS[r.status].map((s) => <option key={s} value={s}>{PACS_STATUS[s].label}</option>)}</select></div>
                <div><label className="label">Time</label><input type="datetime-local" name="at" className="input" defaultValue={toLocalInput(new Date())} /></div>
                <div><label className="label">Images</label><input type="number" name="imageCount" className="input" min={0} /></div>
                <div><label className="label">Series</label><input type="number" name="seriesCount" className="input" min={0} /></div>
                <div className="sm:col-span-2"><ShowWhen field="status" values={["UPLOAD_FAILED", "REQUIRES_INVESTIGATION"]}><div className="grid gap-2"><div><label className="label">Failure reason</label><input name="failureReason" className="input" /></div></div></ShowWhen></div>
                <div className="sm:col-span-2"><label className="label">Corrective action</label><input name="correctiveAction" className="input" /></div>
                <div className="sm:col-span-2"><label className="label">Note</label><input name="note" className="input" /></div>
                <SubmitButton>Save</SubmitButton>
              </ActionForm>
            </Modal>
          )}
          {canVerify && r.status === "SUCCESSFULLY_UPLOADED" && r.verification_status !== "VERIFIED" && (
            <ActionForm action={pacsConfirmAction} className="mt-1 inline-block"><input type="hidden" name="uploadId" value={r.id} /><SubmitButton className="btn-accent btn-sm" pendingText="…">Confirm</SubmitButton></ActionForm>
          )}
        </td>
      </tr>
    );
  };
  const head = (compact?: boolean) => <thead><tr><th>Patient</th><th>Accession</th><th>Examination</th>{!compact && <th>Exam date</th>}<th>Radiographer</th><th>Initiated</th><th>Completed</th><th>Status</th><th>Verification</th><th /></tr></thead>;
  return (
    <div>
      <PageHeader title="PACS Upload Tracking" icon={UploadCloud} logo={<HospitalLogo size="sm" showName={false} />}
        description="Mandatory core module. Every completed scan creates an upload record; an examination is only COMPLETED once a successful upload is confirmed."
        actions={actor.permissions.has("reports.export") && <a className="btn-secondary" href={`/api/export/pacs?from=${p.from}&to=${p.to}&format=xlsx`}><FileSpreadsheet className="h-4 w-4" />Export Excel</a>} />
      <Notice className="mb-4" title="Integration status: PACS not connected">Upload statuses are recorded and confirmed manually by staff. The architecture is prepared for DICOM C-FIND / DICOMweb (QIDO-RS) confirmation once the PACS interface is configured (System Settings → Integrations).</Notice>
      <PeriodFilter sp={sp} extra={<div><label className="label">Status</label><select name="status" className="input" defaultValue={sp.status ?? ""}><option value="">All</option><option value="PENDING">Pending / uploading</option><option value="FAILED">Failed / investigation</option>{Object.entries(PACS_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
        <StatCard label="Completed examinations" value={k.completedExams} icon={ScanLine} tone="brand" />
        <StatCard label="Successfully uploaded" value={k.success} icon={CheckCircle2} tone="green" hint={`${k.verified} confirmed`} />
        <StatCard label="Failed uploads" value={k.failed} icon={CloudOff} tone="red" alert={k.failed > 0} />
        <StatCard label="Pending uploads" value={k.pending} icon={Clock} tone="amber" />
        <StatCard label="Requires investigation" value={k.investigation} icon={SearchX} tone="red" alert={k.investigation > 0} />
        <StatCard label="Upload success rate" value={<Pct v={k.successRate} />} icon={Percent} tone="accent" />
        <StatCard label="Upload failure rate" value={<Pct v={k.failureRate} />} icon={Percent} tone="red" />
        <StatCard label="Avg scan → upload" value={fmtMinutes(k.avg_minutes)} icon={Timer} tone="sky" />
        <StatCard label="Retried uploads" value={k.retried} icon={UploadCloud} tone="slate" hint=">1 attempt" />
        <StatCard label="PACS records" value={k.total} icon={UploadCloud} tone="slate" />
      </div>
      <Card title={`Operational exceptions (${exceptions.length}) – all dates`} subtitle="Failed, pending and unconfirmed uploads stay here until resolved" className="mb-4" bodyClass="p-0 overflow-x-auto">
        {exceptions.length === 0 ? <div className="p-4"><EmptyState title="No outstanding PACS exceptions" icon={CheckCircle2} /></div> : <table className="table">{head(true)}<tbody>{exceptions.map((r) => <Row key={r.id} r={r} compact />)}</tbody></table>}
      </Card>
      <div className="mb-4 grid gap-4 xl:grid-cols-2">
        <Card title="Upload trend (daily)"><Bars data={k.daily} x="bucket" stacked series={[{ key: "success", label: "Uploaded", color: "#179f8b" }, { key: "pending", label: "Pending", color: "#f59e0b" }, { key: "failed", label: "Failed / investigation", color: "#ef4444" }]} /></Card>
        <Card title="Performance by radiographer" subtitle="Counts reflect scans performed; not a ranking" bodyClass="p-0">
          <table className="table"><thead><tr><th>Radiographer</th><th>Total</th><th>Uploaded</th><th>Failed</th><th>Pending</th><th>Success rate</th><th>Avg time</th></tr></thead>
            <tbody>{k.byRadiographer.map((r: any) => <tr key={r.radiographer}><td>{r.radiographer}</td><td className="tabular-nums">{r.total}</td><td className="tabular-nums">{r.success}</td><td className="tabular-nums">{r.failed}</td><td className="tabular-nums">{r.pending}</td><td><Pct v={r.total ? (r.success / r.total) * 100 : null} /></td><td>{fmtMinutes(r.avg_minutes)}</td></tr>)}</tbody></table>
        </Card>
        <Card title="Weekly trend"><Bars data={k.weekly} x="bucket" stacked height={200} series={[{ key: "success", label: "Uploaded", color: "#179f8b" }, { key: "pending", label: "Pending", color: "#f59e0b" }, { key: "failed", label: "Failed", color: "#ef4444" }]} /></Card>
        <Card title="Monthly trend"><Bars data={k.monthly} x="bucket" stacked height={200} series={[{ key: "success", label: "Uploaded", color: "#179f8b" }, { key: "pending", label: "Pending", color: "#f59e0b" }, { key: "failed", label: "Failed", color: "#ef4444" }]} /></Card>
      </div>
      <Card title={`Upload records (${rows.length})`} bodyClass="p-0 overflow-x-auto">
        {rows.length === 0 ? <div className="p-4"><EmptyState title="No records for this filter" /></div> : <table className="table">{head()}<tbody>{rows.map((r) => <Row key={r.id} r={r} />)}</tbody></table>}
      </Card>
      <p className="mt-3 text-xs text-slate-500">{DEFINITIONS.pacsSuccess} {DEFINITIONS.pacsFailure} {DEFINITIONS.pacsTime}</p>
    </div>
  );
}
