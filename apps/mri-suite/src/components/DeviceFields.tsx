import { MaterialsField, SafetyFields } from "./ImplantFields";
export function DeviceFields({ d, categories }: { d?: any; categories: any[] }) {
  const groups = [...new Set(categories.map((c) => c.group_name))];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div><label className="label">Category *</label><select name="categoryId" className="input" required defaultValue={d?.category_id ?? ""}><option value="" disabled>Select…</option>
          {groups.map((g) => <optgroup key={g} label={g}>{categories.filter((c) => c.group_name === g).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>)}</select></div>
        <div><label className="label">Manufacturer *</label><input name="manufacturer" className="input" required defaultValue={d?.manufacturer} /></div>
        <div><label className="label">Model name *</label><input name="modelName" className="input" required defaultValue={d?.model_name} /></div>
        <div><label className="label">Model number</label><input name="modelNumber" className="input" defaultValue={d?.model_number ?? ""} /></div>
        <div className="md:col-span-2"><label className="label">Approved field strengths (as labelled)</label><input name="approvedFieldStrengths" className="input" defaultValue={d?.approved_field_strengths ?? ""} /></div>
      </div>
      <MaterialsField value={d?.materials} />
      <div><label className="label">Exact composition</label><input name="materialDetails" className="input" defaultValue={d?.material_details ?? ""} /></div>
      <SafetyFields safetyClass={d?.safety_class} conditions={d?.conditions} />
      <div className="grid gap-3 md:grid-cols-4">
        <div><label className="label">Source type</label><input name="sourceType" className="input" defaultValue={d?.source_type ?? ""} placeholder="IFU / MRI labelling" /></div>
        <div><label className="label">Source title</label><input name="sourceTitle" className="input" defaultValue={d?.source_title ?? ""} /></div>
        <div><label className="label">Revision / date</label><input name="sourceRevision" className="input" defaultValue={d?.source_revision ?? ""} /></div>
        <div><label className="label">Reference</label><input name="sourceReference" className="input" defaultValue={d?.source_reference ?? ""} /></div>
      </div>
      {d && <div><label className="label">Change note *</label><input name="changeNote" className="input" required placeholder="What changed and why" /></div>}
    </div>
  );
}
