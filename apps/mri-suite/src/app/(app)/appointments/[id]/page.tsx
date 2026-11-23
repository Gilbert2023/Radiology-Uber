import Link from "next/link";
import { notFound } from "next/navigation";
import { clsx } from "clsx";
import {
  CalendarDays, DoorOpen, ShieldCheck, ListChecks, ScanLine, UploadCloud, CheckCircle2, Pencil, XCircle, UserX, Cpu, AlertTriangle,
  History, Syringe, Lock, Check, Circle, Zap, ShieldAlert, FileWarning,
} from "lucide-react";
import { requireActor, auditView } from "@/server/auth";
import { q } from "@/lib/db";
import { getJourney, evaluateClearance, pregnancyRelevant, COMPARISON_ITEMS } from "@/server/services/workflow";
import { listStaff, listProtocols } from "@/server/queries";
import { getSettings } from "@/server/settings";
import { PageHeader, Card, StatusPill, Badge, MapBadge, DL, Notice, DemoTag } from "@/components/ui";
import { HospitalLogo } from "@/components/brand";
import { ActionForm, SubmitButton, Modal, ShowWhen } from "@/components/client/forms";
import {
  JOURNEY_STAGES, SCREENING_QUESTIONS, SCREENING_STATUS, PREP_STATUS, PACS_STATUS, PACS_TRANSITIONS, SAFETY_CLASS, VERIFICATION_STATUS,
  ASSESSMENT_DECISION, CONDITION_FIELDS, BODY_REGIONS, labelize,
} from "@/lib/constants";
import { displayStatus, journeyIndex } from "@/lib/status";
import { fmtDateTime, fmtTime, fmtDate, fmtMinutes, minutesBetween, ageFromDob, toLocalInput, localDate, localTime } from "@/lib/time";
import {
  arrivalAction, cancelAction, noShowAction, screeningAction, screeningDecisionAction, assessImplantAction, prepAction, startScanAction,
  endScanAction, scanDetailsAction, pacsStatusAction, pacsConfirmAction, rescheduleAction,
} from "../actions";
import { administerContrastAction } from "../../contrast/actions";

export const metadata = { title: "Patient journey" };

export default async function JourneyPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor("appointments.view", "screening.view", "pacs.view", "prep.manage", "scanning.perform");
  const { id } = await params;
  const j = await getJourney(id);
  if (!j) notFound();
  await auditView(actor, "appointment", id);
  const { appt: a, screening, prep, scan, pacs, events, assessments, contrast } = j;
  const settings = await getSettings();
  const ds = displayStatus(a, settings);
  const has = (p: Parameters<typeof actor.permissions.has>[0]) => actor.permissions.has(p);
  const idx = journeyIndex(a.status);
  const terminal = ["CANCELLED", "NO_SHOW"].includes(a.status);
  const preScan = ["ARRIVED", "SCREENING", "PREPARATION", "CLEARED"].includes(a.status);
  const ev = preScan || a.status === "SCANNING" ? await evaluateClearance(undefined, id) : null;
  const [staffClinical, radiographers, protocols, batches, prepProto, pacsEvents, docCounts] = await Promise.all([
    listStaff("clinical"), listStaff("radiographers"), listProtocols(),
    q(`SELECT b.id, b.batch_no, b.expiry_date::text AS expiry, b.current_stock, ag.name, ag.unit FROM contrast_batches b JOIN contrast_agents ag ON ag.id=b.agent_id
        WHERE b.current_stock > 0 AND b.expiry_date >= current_date AND ag.is_active ORDER BY ag.name, b.expiry_date`),
    q(`SELECT p.* FROM exam_types e JOIN prep_protocols p ON p.id=e.prep_protocol_id WHERE e.id=$1`, [a.exam_type_id]),
    pacs ? q(`SELECT e.*, u.full_name FROM pacs_upload_events e LEFT JOIN users u ON u.id=e.user_id WHERE upload_id=$1 ORDER BY at, id`, [pacs.id]) : Promise.resolve([]),
    q(`SELECT owner_id, count(*)::int AS n FROM documents WHERE owner_type='IMPLANT' AND owner_id = ANY($1) GROUP BY 1`, [assessments.map((x: any) => x.implant_id)]),
  ]);
  const docs = new Map(docCounts.map((d: any) => [d.owner_id, d.n]));
  const pp = prepProto[0];
  const age = ageFromDob(a.dob);
  const pregRel = pregnancyRelevant(a.sex, a.dob);
  const stageState = (i: number): "done" | "current" | "todo" | "blocked" => {
    if (terminal) return i === 0 ? "done" : "todo";
    if (a.status === "COMPLETED") return "done";
    if (i === 2 && a.screening_status === "NOT_CLEARED") return "blocked";
    if (i === 5 && pacs && ["UPLOAD_FAILED", "REQUIRES_INVESTIGATION"].includes(pacs.status)) return "blocked";
    if (i === 2 && a.screening_status === "CLEAR") return "done";
    if (i === 3 && a.prep_status === "COMPLETE") return "done";
    if (i < idx) return "done";
    if (i === idx) return "current";
    if ((i === 2 || i === 3) && idx >= 1 && idx <= 3) return "current";
    return "todo";
  };
  const icons = [CalendarDays, DoorOpen, ShieldCheck, ListChecks, ScanLine, UploadCloud, CheckCircle2];
  const waited = a.arrived_at && preScan ? minutesBetween(a.arrived_at) : null;

  return (
    <div>
      <PageHeader title={`${a.full_name}`} icon={ScanLine}
        description={`${a.exam_name} · ${a.accession_no} · ${fmtDateTime(a.scheduled_start)} on ${a.scanner_name}`}
        crumbs={[{ label: "Appointments", href: `/appointments?date=${localDate(a.scheduled_start)}` }, { label: a.accession_no }]}
        logo={<div className="hidden md:block"><HospitalLogo size="sm" showName={false} /></div>}
        actions={<>
          <StatusPill status={ds} />
          {a.is_demo && <DemoTag />}
          {has("appointments.manage") && !["SCANNING", "SCANNED", "COMPLETED", "INCOMPLETE", "CANCELLED", "NO_SHOW"].includes(a.status) && <Link href={`/appointments/${id}/edit`} className="btn-secondary"><Pencil className="h-4 w-4" />Edit</Link>}
          {has("appointments.manage") && (preScan || a.status === "BOOKED") ? (
            <Modal title="Cancel appointment" trigger={<><XCircle className="h-4 w-4" />Cancel</>} triggerClass="btn-secondary">
              <ActionForm action={cancelAction} className="space-y-3" confirm="Cancel this appointment?">
                <input type="hidden" name="id" value={id} />
                <div><label className="label">Reason *</label>
                  <select name="reason" className="input" required defaultValue=""><option value="" disabled>Select…</option>
                    {["Patient request", "Referrer cancelled", "Patient unwell", "Unable to fast / preparation not done", "Not cleared for MRI (safety)", "Claustrophobia – referred for sedation", "Scanner downtime", "Duplicate booking", "Other"].map((r) => <option key={r}>{r}</option>)}
                  </select></div>
                <SubmitButton className="btn-danger">Cancel appointment</SubmitButton>
              </ActionForm>
            </Modal>
          ) : null}
          {(has("appointments.manage") || has("arrival.record")) && a.status === "BOOKED" && new Date(a.scheduled_start) < new Date() && (
            <ActionForm action={noShowAction} confirm="Record this patient as a no-show?"><input type="hidden" name="id" value={id} /><SubmitButton className="btn-secondary"><UserX className="h-4 w-4" />No-show</SubmitButton></ActionForm>
          )}
        </>} />

      {/* Journey stepper */}
      <ol className="card mb-4 grid grid-cols-2 gap-2 p-3 sm:grid-cols-4 lg:grid-cols-7" aria-label="Patient journey">
        {JOURNEY_STAGES.map((s, i) => {
          const st = stageState(i);
          const Icon = icons[i];
          return (
            <li key={s.key} className={clsx("flex items-center gap-2 rounded-lg border px-2.5 py-2",
              st === "done" && "border-green-200 bg-green-50", st === "current" && "border-accent-400 bg-accent-50 ring-1 ring-accent-300", st === "blocked" && "border-red-300 bg-red-50", st === "todo" && "border-slate-200 bg-slate-50/50")}>
              <span className={clsx("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white", st === "done" ? "bg-green-600" : st === "current" ? "bg-accent-600" : st === "blocked" ? "bg-red-600" : "bg-slate-300")}>
                {st === "done" ? <Check className="h-4 w-4" /> : st === "blocked" ? <Lock className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              </span>
              <span className="min-w-0 leading-tight"><span className="block text-[10px] font-semibold uppercase text-slate-400">Stage {i + 1}</span><span className="block truncate text-xs font-semibold text-slate-800">{s.label}</span></span>
            </li>
          );
        })}
      </ol>

      {terminal && <Notice tone="warning" className="mb-4" title={a.status === "CANCELLED" ? "Appointment cancelled" : "No-show"}>{a.status === "CANCELLED" ? `${fmtDateTime(a.cancelled_at)} – ${a.cancel_reason}` : `Recorded ${fmtDateTime(a.no_show_at)}`}</Notice>}
      {a.status === "INCOMPLETE" && <Notice tone="danger" className="mb-4" title="Incomplete examination – operational exception">{scan?.incomplete_reason}. The examination will remain an exception and is not marked completed.</Notice>}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          {/* Stage 1 */}
          <Card title="1 · Appointment" icon={CalendarDays} actions={<>{a.priority !== "ROUTINE" && <Badge className="bg-orange-50 text-orange-800 ring-orange-300"><Zap className="h-3 w-3" />{a.priority}</Badge>}{a.contrast && <Badge className="bg-violet-50 text-violet-700 ring-violet-200"><Syringe className="h-3 w-3" />Contrast</Badge>}</>}>
            <DL cols={3} items={[
              ["Examination", a.exam_name], ["Body region", BODY_REGIONS[a.body_region] ?? a.body_region], ["Patient type", labelize(a.patient_type)],
              ["Scheduled", `${fmtDateTime(a.scheduled_start)}–${fmtTime(a.scheduled_end)}`], ["Scanner", `${a.scanner_name} (${a.field_strength_t}T)`], ["Radiographer", a.radiographer_name ?? "Not assigned"],
              ["Referring doctor", a.referring_doctor], ["Referring department", a.referring_department], ["Booked by", `${a.booked_by_name ?? "—"} · ${fmtDateTime(a.created_at)}`],
              ["Clinical indication", a.clinical_indication], ["Preferred date", fmtDate(a.preferred_date)], ["Reminder", a.reminder_at ? `${fmtDateTime(a.reminder_at)}${a.reminder_note ? ` – ${a.reminder_note}` : ""}` : "Not recorded"],
              ...(a.notes ? [["Notes", a.notes] as [string, string]] : []), ...(a.reschedule_count ? [["Rescheduled", `${a.reschedule_count}×`] as [string, string]] : []),
            ]} />
            {a.status === "BOOKED" && has("appointments.manage") && (
              <details className="mt-4 rounded-lg border border-slate-200 p-3">
                <summary className="cursor-pointer text-sm font-medium text-brand-700">Quick reschedule</summary>
                <ActionForm action={rescheduleAction} className="mt-3 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={id} />
                  <div><label className="label">Date</label><input type="date" name="date" className="input" defaultValue={localDate(a.scheduled_start)} required /></div>
                  <div><label className="label">Time</label><input type="time" name="time" step={300} className="input" defaultValue={localTime(a.scheduled_start)} required /></div>
                  <div className="min-w-[200px] flex-1"><label className="label">Reason</label><input name="reason" className="input" placeholder="e.g. patient request" /></div>
                  <SubmitButton className="btn-secondary">Reschedule</SubmitButton>
                </ActionForm>
              </details>
            )}
          </Card>

          {/* Stage 2 */}
          <Card title="2 · Patient arrival" icon={DoorOpen}>
            {a.arrived_at ? (
              <DL cols={3} items={[["Arrived", fmtDateTime(a.arrived_at)], ["Received by", a.arrival_by_name], ["Identity verification", a.identity_method],
                ["Waiting time", waited !== null ? <span className={clsx(waited >= settings.waitAlertMinutes && "font-semibold text-red-600")}>{fmtMinutes(waited)}{waited >= settings.waitAlertMinutes ? " (above alert threshold)" : ""}</span> : a.status === "COMPLETED" ? `Journey ${fmtMinutes(minutesBetween(a.arrived_at, a.completed_at))}` : "—"]]} />
            ) : a.status === "BOOKED" && has("arrival.record") ? (
              <ActionForm action={arrivalAction} className="grid gap-3 md:grid-cols-3">
                <input type="hidden" name="id" value={id} />
                <div className="md:col-span-2"><label className="label">Identity verified using *</label>
                  <select name="identityMethod" className="input" required defaultValue="Name + date of birth + hospital number (verbal and wristband)">
                    <option>Name + date of birth + hospital number (verbal and wristband)</option><option>Name + date of birth + Ghana Card</option><option>Name + date of birth + NHIS card</option><option>Inpatient wristband checked with ward nurse</option><option>Escort / next of kin confirmed identity (patient unable)</option>
                  </select></div>
                <div><label className="label">Arrival time</label><input type="datetime-local" name="arrivedAt" className="input" defaultValue={toLocalInput(new Date())} /></div>
                <label className="flex items-center gap-2 text-sm md:col-span-3"><input type="checkbox" name="identityVerified" required className="h-4 w-4" /> I confirm the patient's identity matches the request (two identifiers) and the examination is confirmed.</label>
                <div className="md:col-span-3"><SubmitButton className="btn-accent"><DoorOpen className="h-4 w-4" />Record arrival</SubmitButton></div>
              </ActionForm>
            ) : <p className="text-sm text-slate-500">{terminal ? "Not applicable." : "Awaiting arrival."}</p>}
          </Card>

          {/* Stage 3 */}
          <Card id="screening" title="3 · MRI safety screening" icon={ShieldCheck} actions={<MapBadge map={SCREENING_STATUS} value={a.screening_status} />}>
            {!a.arrived_at ? <p className="text-sm text-slate-500">Screening opens once arrival is recorded.</p> : (
              <div className="space-y-4">
                {screening?.status === "CLEAR" && <Notice tone="success" title={`Cleared by ${screening.decision_by_name} · ${fmtDateTime(screening.decision_at)}`}>{screening.decision_notes || "Routine clearance – all answers negative, no implants on record."}</Notice>}
                {screening?.status === "NOT_CLEARED" && <Notice tone="danger" title={`NOT CLEARED by ${screening.decision_by_name} · ${fmtDateTime(screening.decision_at)}`}>{screening.decision_notes} — scanning is blocked. Cancel/rebook or re-screen after new information.</Notice>}
                {preScan && has("screening.record") ? (
                  <ActionForm action={screeningAction} className="space-y-3">
                    <input type="hidden" name="id" value={id} />
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                      <table className="table">
                        <thead><tr><th>Question</th><th className="w-[190px]">Response</th><th>Details</th></tr></thead>
                        <tbody>
                          {SCREENING_QUESTIONS.map((qq) => {
                            const cur = screening?.answers?.[qq.key];
                            return (
                              <tr key={qq.key}>
                                <td className="text-sm">{qq.label}{qq.implant && <Cpu className="ml-1 inline h-3 w-3 text-amber-500" aria-label="implant-related" />}</td>
                                <td>
                                  <div className="flex gap-1" role="radiogroup" aria-label={qq.label}>
                                    {(["NO", "YES", "UNSURE"] as const).map((v) => (
                                      <label key={v} className={clsx("flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-xs has-[:checked]:font-semibold",
                                        v === "NO" ? "has-[:checked]:border-green-400 has-[:checked]:bg-green-50" : "has-[:checked]:border-red-400 has-[:checked]:bg-red-50")}>
                                        <input type="radio" name={`q_${qq.key}`} value={v} defaultChecked={cur?.answer === v} className="sr-only" required />{v === "UNSURE" ? "Unsure" : v === "YES" ? "Yes" : "No"}
                                      </label>
                                    ))}
                                  </div>
                                </td>
                                <td><input name={`d_${qq.key}`} defaultValue={cur?.details ?? ""} className="input py-1 text-xs" placeholder={qq.hazard ? "Required if Yes/Unsure" : "Optional"} aria-label={`${qq.label} details`} /></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div><label className="label">Pregnancy status{pregRel ? " *" : ""}</label>
                        <select name="pregnancyStatus" className="input" defaultValue={screening?.pregnancy_status ?? (pregRel ? "" : "NOT_APPLICABLE")} required={pregRel}>
                          <option value="">Select…</option><option value="NOT_APPLICABLE">Not applicable</option><option value="NOT_PREGNANT">Not pregnant</option><option value="POSSIBLY_PREGNANT">Possibly pregnant</option><option value="PREGNANT">Pregnant</option><option value="UNKNOWN">Unknown</option>
                        </select>{pregRel && <p className="mt-1 text-xs text-slate-500">Required: patient aged {age}, {a.sex.toLowerCase()}.</p>}</div>
                      <div><label className="label">Weight (kg)</label><input name="weightKg" type="number" step="0.1" min="1" max="350" className="input" defaultValue={screening?.weight_kg ?? a.patient_weight ?? ""} /></div>
                      <div><label className="label">Additional investigation</label><input name="additionalInvestigation" className="input" defaultValue={screening?.additional_investigation ?? ""} placeholder="e.g. orbital X-ray reviewed" /></div>
                      <div className="md:col-span-3"><label className="label">Screening notes</label><textarea name="notes" rows={2} className="input" defaultValue={screening?.notes ?? ""} /></div>
                    </div>
                    <div className="flex items-center gap-3"><SubmitButton>{screening ? "Update screening" : "Save screening"}</SubmitButton>
                      {screening && <span className="text-xs text-slate-500">Last recorded by {screening.screened_by_name} · {fmtDateTime(screening.screened_at)}. Changing answers after a decision revokes that decision.</span>}</div>
                  </ActionForm>
                ) : screening ? (
                  <ul className="grid gap-1 text-sm sm:grid-cols-2">
                    {SCREENING_QUESTIONS.map((qq) => { const ans = screening.answers?.[qq.key]; return <li key={qq.key} className="flex justify-between gap-2 rounded bg-slate-50 px-2 py-1"><span>{qq.label}</span><span className={clsx("font-semibold", ans?.answer && ans.answer !== "NO" ? "text-red-600" : "text-slate-700")}>{ans?.answer ?? "—"}{ans?.details ? ` – ${ans.details}` : ""}</span></li>; })}
                  </ul>
                ) : <p className="text-sm text-slate-500">Not yet screened.</p>}

                {/* Implants & exam-specific assessment */}
                {(assessments.length > 0 || ev?.implantDeclared) && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-amber-900"><Cpu className="h-4 w-4" />Implants / devices – assessment for THIS examination</h3>
                      {has("implants.manage") && preScan && <Link href={`/implants/new?patientId=${a.patient_id}&appointmentId=${id}`} className="btn-secondary btn-sm">Register implant / device</Link>}
                    </div>
                    <p className="mb-3 text-xs text-amber-900/80">Previous assessments are never reused. Each device must be assessed against {a.scanner_name} ({a.field_strength_t}T) and this examination by authorised MR safety personnel. Safety is never inferred from material or category.</p>
                    {assessments.length === 0 && <Notice tone="danger">An implant/device was declared but no record exists yet. Register it in the Implant Registry.</Notice>}
                    <div className="space-y-3">
                      {assessments.map((x: any) => {
                        const warnings: string[] = [];
                        if (!x.manufacturer || !x.model_name) warnings.push("Device identity incomplete (manufacturer/model unknown)");
                        if (!docs.get(x.implant_id)) warnings.push("No supporting documentation uploaded");
                        if (x.safety_class === "UNKNOWN") warnings.push("MRI safety classification unknown");
                        if (x.verification_status !== "VERIFIED") warnings.push(`Device verification: ${VERIFICATION_STATUS[x.verification_status]?.label}`);
                        if (x.info_source !== "MANUFACTURER_VERIFIED") warnings.push("Safety information is user-entered (not manufacturer-verified)");
                        if (x.safety_class === "MR_CONDITIONAL" && !x.conditions?.field_strength) warnings.push("Conditional device – permitted field strength not recorded");
                        if (["ESCALATED", "UNSUCCESSFUL"].includes(x.verification_status)) warnings.push("Specialist MR safety assessment needed");
                        return (
                          <div key={x.id} className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div><Link href={`/implants/${x.implant_id}`} className="link">{x.device_name}</Link><span className="ml-2 text-xs text-slate-500">{x.category_name} · {x.anatomical_location ?? "location n/r"} · {x.manufacturer ?? "manufacturer n/r"} {x.model_name ?? ""}</span></div>
                              <div className="flex flex-wrap gap-1"><MapBadge map={SAFETY_CLASS} value={x.safety_class} /><MapBadge map={VERIFICATION_STATUS} value={x.verification_status} /><MapBadge map={ASSESSMENT_DECISION} value={x.decision} /></div>
                            </div>
                            {warnings.length > 0 && <ul className="mt-2 space-y-0.5 text-xs text-red-700">{warnings.map((w) => <li key={w} className="flex gap-1"><FileWarning className="h-3.5 w-3.5 shrink-0" />{w}</li>)}</ul>}
                            {x.safety_class === "MR_CONDITIONAL" && Object.keys(x.conditions ?? {}).length > 0 && (
                              <details className="mt-2 text-xs"><summary className="cursor-pointer font-medium text-brand-700">Labelled MR Conditional conditions (as recorded)</summary>
                                <dl className="mt-1 grid gap-1 sm:grid-cols-2">{CONDITION_FIELDS.filter((f) => x.conditions[f.key]).map((f) => <div key={f.key} className="rounded bg-slate-50 px-2 py-1"><dt className="font-semibold">{f.label}</dt><dd>{x.conditions[f.key]}</dd></div>)}</dl></details>
                            )}
                            {x.assessed_at && <p className="mt-2 text-xs text-slate-600">Assessed by {x.assessed_by_name} · {fmtDateTime(x.assessed_at)}{x.conditions_applied ? ` · Conditions: ${x.conditions_applied}` : ""}{x.notes ? ` · ${x.notes}` : ""}</p>}
                            {preScan && has("implants.assess") && (
                              <details className="mt-2 rounded-md border border-slate-200 p-2" open={x.decision === "PENDING"}>
                                <summary className="cursor-pointer text-xs font-semibold text-brand-700">Record MR safety assessment for this examination</summary>
                                <ActionForm action={assessImplantAction} className="mt-2 space-y-2 text-sm">
                                  <input type="hidden" name="assessmentId" value={x.id} />
                                  {x.safety_class === "MR_CONDITIONAL" && (
                                    <table className="table text-xs"><thead><tr><th>Condition vs {a.scanner_model} {a.field_strength_t}T / {a.exam_name}</th><th className="w-40">Result</th></tr></thead>
                                      <tbody>{COMPARISON_ITEMS.map((c) => (
                                        <tr key={c.key}><td>{c.label}</td><td><select name={`cmp_${c.key}`} className="input py-1 text-xs" defaultValue={x.comparison?.[c.key] ?? ""}><option value="">—</option><option value="MET">Met</option><option value="NOT_MET">Not met</option><option value="NOT_APPLICABLE">Not applicable</option></select></td></tr>
                                      ))}</tbody></table>
                                  )}
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    <div><label className="label">Decision</label>
                                      <select name="decision" className="input" defaultValue={x.decision}>{Object.entries(ASSESSMENT_DECISION).map(([k, v]) => <option key={k} value={k} disabled={x.safety_class === "MR_UNSAFE" && k.startsWith("PROCEED")}>{v.label}</option>)}</select></div>
                                    <div><label className="label">Scan conditions to apply</label><input name="conditionsApplied" className="input" defaultValue={x.conditions_applied ?? ""} placeholder="e.g. Normal Operating Mode, SAR ≤ …" /></div>
                                  </div>
                                  <div><label className="label">Rationale / justification</label><textarea name="notes" rows={2} className="input" defaultValue={x.notes ?? ""} placeholder="Required for unverified/unknown devices (≥30 characters) and for do-not-scan/defer decisions" /></div>
                                  <SubmitButton className="btn-primary btn-sm">Save assessment</SubmitButton>
                                </ActionForm>
                              </details>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Clearance evaluation & decision */}
                {ev && screening && preScan && (
                  <div className="rounded-xl border border-slate-200 p-3">
                    <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><ShieldAlert className="h-4 w-4 text-brand-600" />Clearance check</h3>
                    {ev.blockers.length > 0 && <Notice tone="danger" title="Clearance blocked">
                      <ul className="list-disc pl-4">{ev.blockers.map((b) => <li key={b}>{b}</li>)}</ul></Notice>}
                    {ev.warnings.length > 0 && <Notice tone="warning" className="mt-2" title="Warnings for the MR safety decision"><ul className="list-disc pl-4">{ev.warnings.map((b) => <li key={b}>{b}</li>)}</ul></Notice>}
                    {ev.hazards.length > 0 && <div className="mt-2 text-xs text-slate-700"><span className="font-semibold">Positive / uncertain answers:</span> {ev.hazards.map((h) => `${h.label} (${h.answer})`).join("; ")}</div>}
                    {ev.blockers.length === 0 && <p className="mt-1 text-xs text-slate-600">{ev.routineEligible ? "All answers negative and no implants on record – routine clearance permitted (radiographer or MR safety personnel)." : "Findings present – final clearance requires authorised MR safety personnel with a documented rationale."}</p>}
                    {(has("safety.clear") || has("safety.clear.routine") || has("screening.record")) && (
                      <ActionForm action={screeningDecisionAction} className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto] md:items-end">
                        <input type="hidden" name="id" value={id} />
                        <div><label className="label">Decision notes / rationale</label><input name="notes" className="input" placeholder="Required when findings present or when not clearing" /></div>
                        <SubmitButton className="btn-accent" name="decision" value="CLEAR" disabled={ev.blockers.length > 0 || (!ev.routineEligible && !has("safety.clear")) || (!has("safety.clear") && !has("safety.clear.routine"))}><ShieldCheck className="h-4 w-4" />Clear for MRI</SubmitButton>
                        <SubmitButton className="btn-danger" name="decision" value="NOT_CLEARED"><XCircle className="h-4 w-4" />Not cleared</SubmitButton>
                      </ActionForm>
                    )}
                    {!ev.routineEligible && !has("safety.clear") && ev.blockers.length === 0 && <p className="mt-2 text-xs text-amber-700">Refer to authorised MR safety personnel for the final decision.</p>}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Stage 4 */}
          <Card id="preparation" title="4 · Patient preparation" icon={ListChecks} actions={<MapBadge map={PREP_STATUS} value={a.prep_status} />} subtitle={pp ? `${pp.name}${pp.status !== "APPROVED" ? " · protocol draft – pending departmental approval" : ""}` : "No preparation protocol linked"}>
            {!a.arrived_at ? <p className="text-sm text-slate-500">Preparation opens once arrival is recorded.</p> : preScan && has("prep.manage") ? (
              <ActionForm action={prepAction} className="space-y-3">
                <input type="hidden" name="id" value={id} />
                {pp?.instructions && <Notice tone="info" title="Examination-specific instructions">{pp.instructions}{pp.fasting_hours ? ` Fasting: ${pp.fasting_hours} h.` : ""}{pp.medication_notes ? ` ${pp.medication_notes}` : ""}</Notice>}
                <div className="grid gap-2 sm:grid-cols-2">
                  {[["metalRemoved", "Metallic objects removed (jewellery, cards, hearing aids, etc.)", prep?.metal_removed], ["gownChanged", "Changed into MRI-safe clothing", prep?.gown_changed],
                    ...(pp?.fasting_hours ? [["fastingConfirmed", `Fasting confirmed (${pp.fasting_hours} h)`, prep?.fasting_confirmed]] : []),
                    ...(pp?.oral_contrast ? [["oralContrastGiven", "Oral contrast administered", prep?.oral_contrast_given]] : [])].map(([k, label, v]) => (
                    <label key={k as string} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm has-[:checked]:border-green-300 has-[:checked]:bg-green-50"><input type="checkbox" name={k as string} defaultChecked={!!v} className="h-4 w-4" />{label as string}</label>
                  ))}
                  {(pp?.checklist ?? []).map((c: any) => (
                    <label key={c.key} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm has-[:checked]:border-green-300 has-[:checked]:bg-green-50"><input type="checkbox" name={`chk_${c.key}`} defaultChecked={!!prep?.checklist?.[c.key]} className="h-4 w-4" />{c.label}</label>
                  ))}
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  {(a.contrast || pp?.requires_egfr) && <>
                    <div><label className="label">eGFR (mL/min/1.73m²){a.contrast && pp?.requires_egfr ? " *" : ""}</label><input name="egfrValue" type="number" step="0.1" className="input" defaultValue={prep?.egfr_value ?? ""} /></div>
                    <div><label className="label">eGFR date</label><input name="egfrDate" type="date" className="input" defaultValue={prep?.egfr_date ?? ""} /></div>
                  </>}
                  {(a.contrast || pp?.iv_cannula) && <>
                    <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="ivCannula" defaultChecked={!!prep?.iv_cannula} className="h-4 w-4" />IV cannula sited</label>
                    <div><label className="label">Gauge</label><select name="cannulaGauge" className="input" defaultValue={prep?.cannula_gauge ?? ""}><option value="">—</option>{["18G", "20G", "22G", "24G"].map((g) => <option key={g}>{g}</option>)}</select></div>
                    <div><label className="label">Site</label><input name="cannulaSite" className="input" defaultValue={prep?.cannula_site ?? ""} /></div>
                    <div><label className="label">Cannulated by</label><select name="cannulatedBy" className="input" defaultValue={prep?.cannulated_by ?? actor.staffId ?? ""}><option value="">—</option>{staffClinical.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select></div>
                  </>}
                  {pp?.oral_contrast && <div className="md:col-span-2"><label className="label">Oral contrast details</label><input name="oralContrastDetails" className="input" defaultValue={prep?.oral_contrast_details ?? ""} /></div>}
                  <div className="md:col-span-2"><label className="label">Previous imaging</label><input name="previousImaging" className="input" defaultValue={prep?.previous_imaging ?? ""} /></div>
                  <div className="md:col-span-2"><label className="label">Medication preparation</label><input name="medicationNotes" className="input" defaultValue={prep?.medication_notes ?? ""} /></div>
                  <div className="md:col-span-4"><label className="label">Special considerations</label><input name="specialConsiderations" className="input" defaultValue={prep?.special_considerations ?? ""} placeholder="e.g. mobility, interpreter, anxiety, sedation" /></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <SubmitButton className="btn-secondary" name="complete" value="0">Save progress</SubmitButton>
                  <SubmitButton className="btn-accent" name="complete" value="1"><Check className="h-4 w-4" />Mark preparation complete</SubmitButton>
                </div>
                {prep && <p className="text-xs text-slate-500">{prep.status === "COMPLETE" ? `Completed by ${prep.completed_by_name} · ${fmtDateTime(prep.completed_at)}` : `Last updated ${fmtDateTime(prep.updated_at)}`}</p>}
              </ActionForm>
            ) : prep ? (
              <DL cols={3} items={[["Status", <MapBadge key="s" map={PREP_STATUS} value={prep.status} />], ["Completed", prep.completed_at ? `${fmtDateTime(prep.completed_at)} · ${prep.completed_by_name}` : "—"],
                ["eGFR", prep.egfr_value ? `${prep.egfr_value} (${fmtDate(prep.egfr_date)})` : "—"], ["IV cannula", prep.iv_cannula ? `${prep.cannula_gauge ?? ""} ${prep.cannula_site ?? ""} · ${prep.cannulated_by_name ?? ""}` : "—"],
                ["Metal removed", prep.metal_removed ? "Yes" : "—"], ["MRI-safe clothing", prep.gown_changed ? "Yes" : "—"], ["Special considerations", prep.special_considerations]]} />
            ) : <p className="text-sm text-slate-500">Not recorded.</p>}
          </Card>

          {/* Contrast administration */}
          {(a.contrast || contrast.length > 0) && (
            <Card title="Contrast administration" icon={Syringe} subtitle="Recording deducts stock from the selected batch">
              {contrast.length > 0 && (
                <table className="table mb-3"><thead><tr><th>Time</th><th>Agent / batch</th><th>Dose</th><th>Route</th><th>By</th><th>Outcome</th></tr></thead>
                  <tbody>{contrast.map((c: any) => <tr key={c.id}><td>{fmtTime(c.administered_at)}</td><td>{c.agent_name}<div className="text-xs text-slate-500">Batch {c.batch_no}</div></td><td className="tabular-nums">{c.dose_ml} mL</td><td>{labelize(c.route)}</td><td>{c.administered_by_name}</td>
                    <td>{c.adverse_reaction ? <Badge className="bg-red-50 text-red-700 ring-red-200">Reaction ({c.reaction_severity?.toLowerCase()})</Badge> : c.extravasation ? <Badge className="bg-orange-50 text-orange-800 ring-orange-200">Extravasation</Badge> : <span className="text-green-700">No adverse event</span>}
                      {c.incident_id && <Link href={`/incidents/${c.incident_id}`} className="link ml-1 text-xs">incident</Link>}</td></tr>)}</tbody></table>
              )}
              {has("contrast.administer") && ["CLEARED", "SCANNING", "PREPARATION", "SCANNED"].includes(a.status) && (
                a.screening_status !== "CLEAR" ? <Notice tone="warning">Contrast cannot be recorded until MRI safety clearance is complete.</Notice> :
                <ActionForm action={administerContrastAction} className="grid gap-3 md:grid-cols-4">
                  <input type="hidden" name="appointmentId" value={id} />
                  <div className="md:col-span-2"><label className="label">Agent / batch (in-date, in-stock) *</label>
                    <select name="batchId" className="input" required defaultValue=""><option value="" disabled>Select…</option>{batches.map((b) => <option key={b.id} value={b.id}>{b.name} · batch {b.batch_no} · exp {b.expiry} · {b.current_stock} {b.unit}</option>)}</select></div>
                  <div><label className="label">Dose / volume (mL) *</label><input name="doseMl" type="number" step="0.1" min="0.1" className="input" required /></div>
                  <div><label className="label">Route *</label><select name="route" className="input" defaultValue="IV_INJECTOR"><option value="IV_INJECTOR">IV – power injector</option><option value="IV_HAND">IV – hand injection</option><option value="ORAL">Oral</option><option value="OTHER">Other</option></select></div>
                  <div><label className="label">Administered at</label><input type="datetime-local" name="administeredAt" className="input" defaultValue={toLocalInput(new Date())} /></div>
                  <div><label className="label">Administered by</label><select name="administeredBy" className="input" defaultValue={actor.staffId ?? ""}><option value="">—</option>{staffClinical.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select></div>
                  <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="adverseReaction" className="h-4 w-4" />Adverse reaction</label>
                  <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="extravasation" className="h-4 w-4" />Extravasation</label>
                  <ShowWhen field="adverseReaction" values={["on"]}><div className="grid gap-2 md:col-span-4 md:grid-cols-[180px_1fr]"><div><label className="label">Severity</label><select name="reactionSeverity" className="input"><option value="">—</option><option value="MILD">Mild</option><option value="MODERATE">Moderate</option><option value="SEVERE">Severe</option></select></div><div><label className="label">Reaction details & management</label><input name="reactionDetails" className="input" /></div></div></ShowWhen>
                  <ShowWhen field="extravasation" values={["on"]}><div><label className="label">Extravasation details</label><input name="extravasationDetails" className="input" /></div></ShowWhen>
                  <div className="md:col-span-4"><SubmitButton className="btn-primary"><Syringe className="h-4 w-4" />Record administration</SubmitButton><span className="ml-3 text-xs text-slate-500">Reactions and extravasation automatically raise an incident report.</span></div>
                </ActionForm>
              )}
            </Card>
          )}

          {/* Stage 5 */}
          <Card title="5 · Scanning" icon={ScanLine}>
            {scan ? (
              <div className="space-y-3">
                <DL cols={3} items={[["Radiographer", scan.radiographer_name], ["Scan start", fmtDateTime(scan.started_at)], ["Scan end", scan.ended_at ? fmtDateTime(scan.ended_at) : <span className="font-semibold text-indigo-700">In progress · {fmtMinutes(minutesBetween(scan.started_at))}</span>],
                  ["Duration", scan.ended_at ? fmtMinutes(minutesBetween(scan.started_at, scan.ended_at)) : "—"], ["Protocol", scan.protocol_name ?? "—"], ["Completion", scan.completion_status ? labelize(scan.completion_status) : "—"],
                  ["Contrast", scan.contrast_used ? "Yes" : "No"], ["Additional sequences", scan.additional_sequences], ["Protocol modifications", scan.protocol_modifications], ["Repeat sequences", scan.repeat_sequences], ["Incomplete reason", scan.incomplete_reason], ["Notes", scan.notes]]} />
                {a.status === "SCANNING" && has("scanning.perform") && (
                  <ActionForm action={endScanAction} className="grid gap-3 rounded-lg border border-indigo-200 bg-indigo-50/40 p-3 md:grid-cols-3" confirm="End the scan now?">
                    <input type="hidden" name="id" value={id} />
                    <div><label className="label">Completion *</label><select name="completionStatus" className="input" defaultValue="COMPLETE"><option value="COMPLETE">Examination complete</option><option value="INCOMPLETE">Incomplete examination</option></select></div>
                    <div><label className="label">Repeat sequences</label><input name="repeatSequences" type="number" min={0} className="input" defaultValue={0} /></div>
                    <div><label className="label">Additional sequences</label><input name="additionalSequences" className="input" /></div>
                    <ShowWhen field="completionStatus" values={["INCOMPLETE"]}>
                      <div className="grid gap-2 md:grid-cols-2"><div><label className="label">Reason incomplete *</label><input name="incompleteReason" className="input" /></div>
                        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="imagesAcquired" defaultChecked className="h-4 w-4" />Some images acquired (track PACS upload)</label></div>
                    </ShowWhen>
                    <div className="md:col-span-2"><label className="label">Protocol modifications</label><input name="protocolModifications" className="input" /></div>
                    <div><label className="label">Operational notes</label><input name="notes" className="input" /></div>
                    <div className="md:col-span-3"><SubmitButton className="btn-primary">End scan</SubmitButton></div>
                  </ActionForm>
                )}
                {scan.ended_at && has("scanning.perform") && (
                  <Modal title="Edit scan details" trigger={<><Pencil className="h-4 w-4" />Edit scan details</>} triggerClass="btn-secondary btn-sm">
                    <ActionForm action={scanDetailsAction} className="space-y-3">
                      <input type="hidden" name="id" value={id} />
                      <div><label className="label">Additional sequences</label><input name="additionalSequences" className="input" defaultValue={scan.additional_sequences ?? ""} /></div>
                      <div><label className="label">Protocol modifications</label><input name="protocolModifications" className="input" defaultValue={scan.protocol_modifications ?? ""} /></div>
                      <div><label className="label">Repeat sequences</label><input name="repeatSequences" type="number" min={0} className="input" defaultValue={scan.repeat_sequences} /></div>
                      <div><label className="label">Notes</label><textarea name="notes" className="input" defaultValue={scan.notes ?? ""} /></div>
                      <SubmitButton>Save</SubmitButton>
                    </ActionForm>
                  </Modal>
                )}
              </div>
            ) : a.status === "CLEARED" && has("scanning.perform") ? (
              <ActionForm action={startScanAction} className="grid gap-3 md:grid-cols-3">
                <input type="hidden" name="id" value={id} />
                <div><label className="label">Radiographer *</label><select name="radiographerId" className="input" defaultValue={a.radiographer_id ?? actor.staffId ?? ""} required><option value="">Select…</option>{radiographers.map((r) => <option key={r.id} value={r.id}>{r.full_name}</option>)}</select></div>
                <div className="md:col-span-2"><label className="label">Protocol</label><select name="protocolId" className="input" defaultValue=""><option value="">— none selected —</option>{protocols.map((p) => <option key={p.id} value={p.id}>{p.name} (v{p.version}, {labelize(p.status)})</option>)}</select></div>
                <div className="md:col-span-3"><SubmitButton className="btn-accent"><ScanLine className="h-4 w-4" />Start scan</SubmitButton></div>
              </ActionForm>
            ) : (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                {preScan && <Lock className="h-4 w-4 text-red-500" />}
                {preScan ? `Scanning is blocked until safety screening is CLEAR (${labelize(a.screening_status)}) and preparation is complete (${labelize(a.prep_status)}).` : terminal ? "Not applicable." : "Not started."}
              </div>
            )}
          </Card>

          {/* Stage 6 */}
          <Card title="6 · PACS upload tracking" icon={UploadCloud} actions={pacs && <><MapBadge map={PACS_STATUS} value={pacs.status} />{pacs.verification_status === "VERIFIED" && <Badge className="bg-green-100 text-green-800 ring-green-300">Confirmed</Badge>}</>}>
            {!pacs ? <p className="text-sm text-slate-500">A PACS tracking record is created automatically when the scan ends.</p> : (
              <div className="space-y-3">
                <Notice tone="info">Method: <strong>manual confirmation by staff</strong>. PACS/DICOM integration is not connected – statuses below are recorded by staff, not detected automatically.</Notice>
                <DL cols={3} items={[["Upload initiated", fmtDateTime(pacs.initiated_at)], ["Upload completed", fmtDateTime(pacs.completed_at)], ["Scan end → upload", scan?.ended_at && pacs.completed_at ? fmtMinutes(minutesBetween(scan.ended_at, pacs.completed_at)) : "—"],
                  ["Attempts", pacs.attempts], ["Images / series", `${pacs.image_count ?? "—"} / ${pacs.series_count ?? "—"}`], ["Confirmed by", pacs.confirmed_by_name ? `${pacs.confirmed_by_name} · ${fmtDateTime(pacs.confirmed_at)}` : "Not confirmed"],
                  ["Failure reason", pacs.failure_reason], ["Corrective action", pacs.corrective_action]]} />
                {has("pacs.manage") && PACS_TRANSITIONS[pacs.status]?.length > 0 && (
                  <ActionForm action={pacsStatusAction} className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-4">
                    <input type="hidden" name="uploadId" value={pacs.id} />
                    <div><label className="label">New status</label><select name="status" className="input" required defaultValue="">{<option value="" disabled>Select…</option>}{PACS_TRANSITIONS[pacs.status].map((s) => <option key={s} value={s}>{PACS_STATUS[s].label}</option>)}</select></div>
                    <div><label className="label">Time</label><input type="datetime-local" name="at" className="input" defaultValue={toLocalInput(new Date())} /></div>
                    <div><label className="label">Images</label><input name="imageCount" type="number" min={0} className="input" /></div>
                    <div><label className="label">Series</label><input name="seriesCount" type="number" min={0} className="input" /></div>
                    <ShowWhen field="status" values={["UPLOAD_FAILED", "REQUIRES_INVESTIGATION"]}><div className="grid gap-2 md:grid-cols-2"><div><label className="label">Failure reason</label><input name="failureReason" className="input" /></div><div><label className="label">Corrective action</label><input name="correctiveAction" className="input" /></div></div></ShowWhen>
                    <div className="md:col-span-3"><label className="label">Note</label><input name="note" className="input" /></div>
                    <div className="self-end"><SubmitButton className="btn-primary w-full">Update</SubmitButton></div>
                  </ActionForm>
                )}
                {has("pacs.verify") && pacs.status === "SUCCESSFULLY_UPLOADED" && pacs.verification_status !== "VERIFIED" && (
                  <ActionForm action={pacsConfirmAction} className="flex flex-wrap items-end gap-2 rounded-lg border border-green-300 bg-green-50 p-3">
                    <input type="hidden" name="uploadId" value={pacs.id} />
                    <div className="min-w-[240px] flex-1"><label className="label">Confirmation note</label><input name="note" className="input" placeholder="e.g. all series visible in PACS viewer" /></div>
                    <SubmitButton className="btn-accent"><CheckCircle2 className="h-4 w-4" />Confirm images in PACS</SubmitButton>
                  </ActionForm>
                )}
                <details className="text-xs"><summary className="cursor-pointer font-medium text-brand-700">Upload status history ({pacsEvents.length})</summary>
                  <ul className="mt-2 space-y-1">{pacsEvents.map((e: any) => <li key={e.id} className="flex gap-2"><span className="tabular-nums text-slate-500">{fmtDateTime(e.at)}</span><span>{e.from_status ? `${labelize(e.from_status)} → ` : ""}<strong>{labelize(e.to_status)}</strong>{e.note ? ` – ${e.note}` : ""}</span><span className="text-slate-400">{e.full_name}</span></li>)}</ul></details>
              </div>
            )}
          </Card>

          {/* Stage 7 */}
          <Card title="7 · Examination completion" icon={CheckCircle2}>
            {a.status === "COMPLETED" ? <Notice tone="success" title={`Completed ${fmtDateTime(a.completed_at)}`}>Scan complete, images uploaded to PACS and upload confirmed by staff.</Notice>
              : <ul className="space-y-1 text-sm">
                  {[["Examination completed", scan?.completion_status === "COMPLETE"], ["Images successfully uploaded to PACS", pacs?.status === "SUCCESSFULLY_UPLOADED"], ["Successful upload confirmed and recorded", pacs?.verification_status === "VERIFIED"]].map(([l, ok]) => (
                    <li key={l as string} className="flex items-center gap-2">{ok ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4 text-slate-300" />}{l as string}</li>
                  ))}
                </ul>}
          </Card>
        </div>

        {/* Side column */}
        <div className="space-y-4">
          <Card title="Patient">
            <DL cols={1} items={[["Name", <Link key="n" href={`/patients/${a.patient_id}`} className="link">{a.full_name}</Link>], ["MRN", a.mrn], ["Date of birth", `${fmtDate(a.dob)} (${age} y)`], ["Sex", labelize(a.sex)], ["Contact", a.phone]]} />
          </Card>
          {waited !== null && waited >= settings.waitAlertMinutes && <Notice tone="danger" title="Long waiting time"><AlertTriangle className="mr-1 inline h-4 w-4" />Patient has waited {fmtMinutes(waited)} (threshold {settings.waitAlertMinutes} min).</Notice>}
          <Card title="Journey timeline" icon={History}>
            <ol className="relative space-y-3 border-l border-slate-200 pl-4">
              {events.map((e: any) => (
                <li key={e.id} className="text-xs">
                  <span className="absolute -left-[5px] mt-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent-500" />
                  <div className="font-semibold text-slate-800">{labelize(e.event)}</div>
                  <div className="text-slate-500">{fmtDateTime(e.at)} · {e.user_name ?? "system"}</div>
                  {e.note && <div className="text-slate-600">{e.note}</div>}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
