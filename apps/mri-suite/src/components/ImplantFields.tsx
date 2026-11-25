import { IMPLANT_MATERIALS, CONDITION_FIELDS, SAFETY_CLASS, SIDES, labelize } from "@/lib/constants";
import { ShowWhen } from "./client/forms";
import { Notice } from "./ui";

export function MaterialsField({ value }: { value?: string[] }) {
  return (
    <fieldset>
      <legend className="label">Material composition * (select all documented)</legend>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {Object.entries(IMPLANT_MATERIALS).map(([k, v]) => (
          <label key={k} className="flex items-center gap-1.5 rounded border border-slate-200 px-2 py-1 text-xs has-[:checked]:border-accent-400 has-[:checked]:bg-accent-50">
            <input type="checkbox" name="materials[]" value={k} defaultChecked={value?.includes(k)} />{v}
          </label>
        ))}
      </div>
      <p className="mt-1 text-xs text-slate-500">Record only what is documented. Material is never used to infer MRI safety.</p>
    </fieldset>
  );
}

export function SafetyFields({ safetyClass, conditions }: { safetyClass?: string; conditions?: Record<string, string> }) {
  return (
    <div className="space-y-3">
      <div className="max-w-sm"><label className="label">MRI safety classification *</label>
        <select name="safetyClass" className="input" defaultValue={safetyClass ?? "UNKNOWN"}>{Object.entries(SAFETY_CLASS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
        <p className="mt-1 text-xs text-slate-500">Set from manufacturer documentation only. If not documented, leave as Unknown / not verified.</p></div>
      <ShowWhen field="safetyClass" values={["MR_CONDITIONAL"]}>
        <Notice tone="warning" className="mb-2">Enter the manufacturer-approved conditions exactly as labelled for THIS device. Conditions differ between devices – never assume.</Notice>
        <div className="grid gap-2 md:grid-cols-2">
          {CONDITION_FIELDS.map((f) => <div key={f.key}><label className="label">{f.label}</label><input name={`cond_${f.key}`} className="input" defaultValue={conditions?.[f.key] ?? ""} placeholder={f.hint} /></div>)}
        </div>
      </ShowWhen>
    </div>
  );
}

export function ImplantFields({ i, categories, devices }: { i?: any; categories: any[]; devices: any[] }) {
  const groups = [...new Set(categories.map((c) => c.group_name))];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2"><label className="label">Device / implant name *</label><input name="deviceName" className="input" required defaultValue={i?.device_name} /></div>
        <div><label className="label">Category *</label><select name="categoryId" className="input" required defaultValue={i?.category_id ?? ""}><option value="" disabled>Select…</option>
          {groups.map((g) => <optgroup key={g} label={g}>{categories.filter((c) => c.group_name === g).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>)}</select></div>
        <div className="md:col-span-3"><label className="label">Link to device reference database (optional)</label>
          <select name="deviceReferenceId" className="input" defaultValue={i?.device_reference_id ?? ""}><option value="">— none —</option>{devices.map((d) => <option key={d.id} value={d.id}>{d.manufacturer} · {d.model_name} {d.model_number ? `(${d.model_number})` : ""} · {labelize(d.safety_class)} · {d.info_status === "MANUFACTURER_VERIFIED" ? "manufacturer-verified" : "unverified"}</option>)}</select>
          <p className="mt-1 text-xs text-slate-500">Linking does not verify this patient's device – identity must still be confirmed.</p></div>
        <div><label className="label">Anatomical location</label><input name="anatomicalLocation" className="input" defaultValue={i?.anatomical_location ?? ""} /></div>
        <div><label className="label">Side</label><select name="side" className="input" defaultValue={i?.side ?? ""}><option value="">—</option>{SIDES.map((s) => <option key={s} value={s}>{labelize(s)}</option>)}</select></div>
        <div><label className="label">Manufacturer</label><input name="manufacturer" className="input" defaultValue={i?.manufacturer ?? ""} /></div>
        <div><label className="label">Model name</label><input name="modelName" className="input" defaultValue={i?.model_name ?? ""} /></div>
        <div><label className="label">Model number</label><input name="modelNumber" className="input" defaultValue={i?.model_number ?? ""} /></div>
        <div><label className="label">Serial number</label><input name="serialNo" className="input" defaultValue={i?.serial_no ?? ""} /></div>
        <div><label className="label">Catalogue / reference number</label><input name="catalogueNo" className="input" defaultValue={i?.catalogue_no ?? ""} /></div>
        <div><label className="label">Implantation date</label><input name="implantedOn" type="date" className="input" defaultValue={i?.implanted_on ?? ""} /></div>
        <div><label className="label">…or approximate date (as documented)</label><input name="implantedOnText" className="input" defaultValue={i?.implanted_on_text ?? ""} placeholder="e.g. 2019" /></div>
        <div><label className="label">Hospital / facility</label><input name="facility" className="input" defaultValue={i?.facility ?? ""} /></div>
        <div><label className="label">Implanting surgeon / specialist</label><input name="implantingSpecialist" className="input" defaultValue={i?.implanting_specialist ?? ""} /></div>
        <div><label className="label">Reason for implantation</label><input name="reason" className="input" defaultValue={i?.reason ?? ""} /></div>
      </div>
      <MaterialsField value={i?.materials} />
      <div><label className="label">Exact composition (free text, as documented)</label><input name="materialDetails" className="input" defaultValue={i?.material_details ?? ""} /></div>
      <SafetyFields safetyClass={i?.safety_class} conditions={i?.conditions} />
      <div><label className="label">Notes</label><textarea name="notes" rows={2} className="input" defaultValue={i?.notes ?? ""} /></div>
    </div>
  );
}
