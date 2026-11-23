"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ActionForm, SubmitButton } from "./forms";
import type { ActionResult } from "@/server/action";

const COLS: [string, string, number][] = [["name", "Sequence *", 150], ["plane", "Plane", 70], ["tr", "TR", 60], ["te", "TE", 60], ["ti", "TI", 55], ["flip_angle", "Flip", 50], ["slice_thickness", "Slice", 55], ["fov", "FOV", 60], ["matrix", "Matrix", 75], ["nex", "NEX", 45], ["bandwidth", "BW", 55], ["etl", "ETL", 45], ["parallel_imaging", "Parallel", 70], ["notes", "Notes", 120]];
const CATS: Record<string, string> = { BRAIN: "Brain", SPINE: "Spine", MSK: "Musculoskeletal", ABDOMEN: "Abdomen", PELVIS: "Pelvis", CARDIAC: "Cardiac", MRA: "MRA", MRV: "MRV", SPECIAL: "Special examinations" };

export function ProtocolForm({ action, p, sequences, revising }: { action: (a: ActionResult | null, f: FormData) => Promise<ActionResult>; p?: any; sequences?: any[]; revising?: boolean }) {
  const [rows, setRows] = useState<any[]>(sequences?.length ? sequences : [{ name: "" }]);
  const [keys, setKeys] = useState<number[]>(rows.map((_, i) => i));
  const [next, setNext] = useState(rows.length);
  return (
    <ActionForm action={action} className="space-y-4">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="card card-pad grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2"><label className="label">Protocol name *</label><input name="name" className="input" required defaultValue={p?.name} /></div>
        <div><label className="label">Category *</label><select name="category" className="input" defaultValue={p?.category ?? "BRAIN"}>{Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label className="label">Scanner profile *</label><input name="scannerModel" className="input" required defaultValue={p?.scanner_model ?? "GE SIGNA Creator 1.5T"} /></div>
        <div><label className="label">Type *</label><select name="kind" className="input" defaultValue={p?.kind ?? "DEPARTMENTAL"}><option value="DEPARTMENTAL">Departmental protocol (requires approval)</option><option value="EDUCATIONAL_REFERENCE">Educational reference (not for clinical use)</option></select></div>
        <div><label className="label">Coil</label><input name="coil" className="input" defaultValue={p?.coil ?? ""} /></div>
        <div className="md:col-span-3"><label className="label">Clinical indication</label><input name="clinicalIndication" className="input" defaultValue={p?.clinical_indication ?? ""} /></div>
        <div><label className="label">Patient positioning</label><input name="positioning" className="input" defaultValue={p?.positioning ?? ""} /></div>
        <div><label className="label">Contrast requirement</label><input name="contrastRequirement" className="input" defaultValue={p?.contrast_requirement ?? ""} /></div>
        <div><label className="label">Change note{revising ? " *" : ""}</label><input name="changeNote" className="input" required={revising} defaultValue={revising ? "" : p?.change_note ?? ""} /></div>
        <div className="md:col-span-3"><label className="label">Special instructions</label><textarea name="specialInstructions" className="input" rows={2} defaultValue={p?.special_instructions ?? ""} /></div>
      </div>
      <div className="card overflow-x-auto">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2"><span className="section-title">Sequences</span><span className="text-xs text-slate-500">Enter parameters exactly as set on the scanner. TR, TE, slice, FOV and matrix are required for approval.</span></div>
        <table className="table text-xs"><thead><tr><th>#</th>{COLS.map(([, l]) => <th key={l}>{l}</th>)}<th /></tr></thead>
          <tbody>{keys.map((k, i) => (
            <tr key={k}><td>{i + 1}</td>
              {COLS.map(([f, , w]) => <td key={f} className="px-1"><input name={`seq_${i}_${f}`} defaultValue={rows[k]?.[f] ?? ""} className="input px-1.5 py-1 text-xs" style={{ width: w }} required={f === "name"} aria-label={`${f} row ${i + 1}`} /></td>)}
              <td><button type="button" className="btn-ghost btn-sm" aria-label="Remove sequence" onClick={() => setKeys(keys.filter((x) => x !== k))}><Trash2 className="h-3.5 w-3.5" /></button></td></tr>
          ))}</tbody></table>
        <div className="p-3"><button type="button" className="btn-secondary btn-sm" onClick={() => { setRows([...rows, {}]); setKeys([...keys, next]); setNext(next + 1); }}><Plus className="h-3.5 w-3.5" />Add sequence</button></div>
      </div>
      <SubmitButton>{revising ? "Create new draft revision" : "Save draft"}</SubmitButton>
    </ActionForm>
  );
}
