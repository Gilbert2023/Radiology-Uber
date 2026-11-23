import { ActionForm, SubmitButton } from "./client/forms";
import { saveStaffAction } from "@/app/(app)/staff/actions";
export function StaffForm({ s }: { s?: any }) {
  return (
    <ActionForm action={saveStaffAction} className="grid gap-3 sm:grid-cols-2">
      {s && <input type="hidden" name="id" value={s.id} />}
      <div><label className="label">Staff ID *</label><input name="staffNo" className="input" required defaultValue={s?.staff_no} /></div>
      <div><label className="label">Full name *</label><input name="fullName" className="input" required defaultValue={s?.full_name} /></div>
      <div><label className="label">Designation *</label><input name="designation" className="input" required defaultValue={s?.designation} list="desig" /><datalist id="desig">{["MRI Radiographer", "Senior MRI Radiographer", "MRI Supervisor", "MRI Nurse", "Receptionist", "MR Safety Officer (MRSO)"].map((d) => <option key={d} value={d} />)}</datalist></div>
      <div><label className="label">Employment status</label><select name="employmentStatus" className="input" defaultValue={s?.employment_status ?? "ACTIVE"}>{["ACTIVE", "PART_TIME", "LOCUM", "ON_LEAVE", "SUSPENDED", "LEFT"].map((x) => <option key={x} value={x}>{x.replace("_", " ").toLowerCase()}</option>)}</select></div>
      <div><label className="label">Phone</label><input name="phone" className="input" defaultValue={s?.phone ?? ""} /></div>
      <div><label className="label">Email</label><input name="email" type="email" className="input" defaultValue={s?.email ?? ""} /></div>
      <div><label className="label">Registration body</label><input name="registrationBody" className="input" defaultValue={s?.registration_body ?? ""} /></div>
      <div><label className="label">Registration number</label><input name="registrationNo" className="input" defaultValue={s?.registration_no ?? ""} /></div>
      <div><label className="label">Registration expiry</label><input type="date" name="registrationExpiry" className="input" defaultValue={s?.registration_expiry ?? ""} /></div>
      <div><label className="label">Contracted hours / week</label><input type="number" name="contractedHoursWeek" className="input" defaultValue={s?.contracted_hours_week ?? 40} /></div>
      <div className="sm:col-span-2"><SubmitButton>Save</SubmitButton></div>
    </ActionForm>
  );
}
