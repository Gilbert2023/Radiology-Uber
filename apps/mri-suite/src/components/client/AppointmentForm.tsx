"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, UserPlus } from "lucide-react";
import { ActionForm, SubmitButton } from "./forms";
import type { ActionResult } from "@/server/action";

interface Opt { id: string; [k: string]: any }
interface Patient { id: string; mrn: string; full_name: string; dob: string; sex: string; implant_count?: number }

export function PatientPicker({ initial, name = "patientId" }: { initial?: Patient | null; name?: string }) {
  const [sel, setSel] = useState<Patient | null>(initial ?? null);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Patient[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) { setRes([]); return; }
    const c = new AbortController();
    const t = setTimeout(() => fetch(`/api/patients/search?q=${encodeURIComponent(q)}`, { signal: c.signal }).then((r) => r.json()).then(setRes).catch(() => {}), 250);
    return () => { clearTimeout(t); c.abort(); };
  }, [q]);
  if (sel) return (
    <div className="flex items-center justify-between rounded-lg border border-accent-300 bg-accent-50 px-3 py-2 text-sm">
      <input type="hidden" name={name} value={sel.id} />
      <div><div className="font-semibold">{sel.full_name}</div><div className="text-xs text-slate-600">{sel.mrn} · DOB {sel.dob} · {sel.sex.toLowerCase()}{sel.implant_count ? ` · ${sel.implant_count} implant(s) on record` : ""}</div></div>
      <button type="button" className="btn-ghost btn-sm" onClick={() => setSel(null)}>Change</button>
    </div>
  );
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
      <input className="input pl-9" placeholder="Search by name, MRN or phone (min 2 characters)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search patient" />
      {res.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lift">
          {res.map((p) => (
            <li key={p.id}><button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => { setSel(p); setQ(""); setRes([]); }}>
              <span className="font-medium">{p.full_name}</span> <span className="text-xs text-slate-500">{p.mrn} · DOB {p.dob}</span></button></li>
          ))}
        </ul>
      )}
      {q.trim().length >= 2 && res.length === 0 && <p className="mt-1 text-xs text-slate-500">No match. <Link href="/patients/new" className="link inline-flex items-center gap-1"><UserPlus className="h-3 w-3" />Register a new patient</Link></p>}
    </div>
  );
}

export function AppointmentForm({ action, examTypes, scanners, radiographers, initial, patient, submitLabel, isEdit, regions }: {
  action: (p: ActionResult | null, fd: FormData) => Promise<ActionResult>; examTypes: Opt[]; scanners: Opt[]; radiographers: Opt[];
  initial: Record<string, any>; patient?: Patient | null; submitLabel: string; isEdit?: boolean; regions: Record<string, string>;
}) {
  const [examId, setExamId] = useState<string>(initial.examTypeId ?? "");
  const exam = examTypes.find((e) => e.id === examId);
  const [duration, setDuration] = useState<string>(initial.durationMin ?? "");
  const [contrast, setContrast] = useState<boolean>(!!initial.contrast);
  const [region, setRegion] = useState<string>(initial.bodyRegion ?? "");
  const onExam = (id: string) => {
    setExamId(id);
    const e = examTypes.find((x) => x.id === id);
    if (e) { setDuration(String(e.default_duration_min)); setContrast(e.contrast_default); setRegion(e.body_region); }
  };
  return (
    <ActionForm action={action} className="space-y-5">
      {isEdit && <input type="hidden" name="id" value={initial.id} />}
      <fieldset className="card card-pad">
        <legend className="section-title px-1">Patient</legend>
        {isEdit ? <><input type="hidden" name="patientId" value={patient!.id} /><div className="text-sm font-semibold">{patient!.full_name} <span className="font-normal text-slate-500">({patient!.mrn})</span></div></> : <PatientPicker initial={patient} />}
      </fieldset>
      <fieldset className="card card-pad grid gap-4 md:grid-cols-2">
        <legend className="section-title px-1">Examination request</legend>
        <div className="md:col-span-2"><label className="label">Requested MRI examination *</label>
          <select name="examTypeId" className="input" required value={examId} onChange={(e) => onExam(e.target.value)}>
            <option value="">Select examination…</option>
            {examTypes.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.default_duration_min} min{e.contrast_default ? ", contrast" : ""})</option>)}
          </select>
          {exam?.prep_name && <p className="mt-1 text-xs text-slate-500">Preparation protocol: {exam.prep_name}{exam.prep_status !== "APPROVED" ? " (draft – pending departmental approval)" : ""}</p>}
        </div>
        <div><label className="label">Body region</label>
          <select name="bodyRegion" className="input" value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">(from examination)</option>{Object.entries(regions).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></div>
        <div className="flex items-end gap-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="contrast" checked={contrast} onChange={(e) => setContrast(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-accent-600" /> Contrast-enhanced</label>
        </div>
        <div className="md:col-span-2"><label className="label">Clinical indication *</label><textarea name="clinicalIndication" className="input" rows={2} required defaultValue={initial.clinicalIndication} /></div>
        <div><label className="label">Referring doctor *</label><input name="referringDoctor" className="input" required defaultValue={initial.referringDoctor} /></div>
        <div><label className="label">Referring department *</label><input name="referringDepartment" className="input" required defaultValue={initial.referringDepartment} list="depts" />
          <datalist id="depts">{["Neurology", "Orthopaedics", "General Surgery", "Internal Medicine", "Obstetrics & Gynaecology", "Urology", "Cardiology", "ENT", "Emergency Department", "Oncology", "Family Medicine", "Gastroenterology"].map((d) => <option key={d} value={d} />)}</datalist></div>
        <div><label className="label">Patient type</label>
          <select name="patientType" className="input" defaultValue={initial.patientType ?? "OUTPATIENT"}><option value="OUTPATIENT">Outpatient</option><option value="INPATIENT">Inpatient</option><option value="EMERGENCY">Emergency</option></select></div>
        <div><label className="label">Priority *</label>
          <select name="priority" className="input" defaultValue={initial.priority ?? "ROUTINE"}><option value="ROUTINE">Routine</option><option value="URGENT">Urgent</option><option value="EMERGENCY">Emergency</option></select></div>
      </fieldset>
      <fieldset className="card card-pad grid gap-4 md:grid-cols-3">
        <legend className="section-title px-1">Scheduling</legend>
        <div><label className="label">Preferred date</label><input type="date" name="preferredDate" className="input" defaultValue={initial.preferredDate ?? ""} /></div>
        <div><label className="label">Appointment date *</label><input type="date" name="date" className="input" required defaultValue={initial.date} /></div>
        <div><label className="label">Time *</label><input type="time" name="time" step={300} className="input" required defaultValue={initial.time} /></div>
        <div><label className="label">Duration (minutes)</label><input type="number" name="durationMin" min={5} max={240} className="input" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="From exam type" /></div>
        <div><label className="label">Scanner *</label>
          <select name="scannerId" className="input" required defaultValue={initial.scannerId ?? scanners[0]?.id}>{scanners.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.field_strength_t}T){s.status !== "AVAILABLE" && s.status !== "IN_USE" ? ` – ${s.status.toLowerCase()}` : ""}</option>)}</select></div>
        <div><label className="label">Assigned radiographer</label>
          <select name="radiographerId" className="input" defaultValue={initial.radiographerId ?? ""}><option value="">Not yet assigned</option>{radiographers.map((r) => <option key={r.id} value={r.id}>{r.full_name}</option>)}</select></div>
        <div className="md:col-span-3"><label className="label">Additional notes</label><textarea name="notes" className="input" rows={2} defaultValue={initial.notes ?? ""} /></div>
        {isEdit && <div className="md:col-span-3"><label className="label">Reason for change (recorded if rescheduled)</label><input name="reason" className="input" /></div>}
      </fieldset>
      <div className="flex justify-end gap-2"><Link href={isEdit ? `/appointments/${initial.id}` : "/appointments"} className="btn-secondary">Cancel</Link><SubmitButton>{submitLabel}</SubmitButton></div>
    </ActionForm>
  );
}
